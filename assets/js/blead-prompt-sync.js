const PARTICIPANT_STORAGE_KEY = "kaindly:blead:anonymous-participant-id";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const STATUS_COPY = {
  saving: "Saving responses…",
  saved: "Responses saved.",
  offline: "Saved on this device. We’ll sync when you’re connected.",
};

export function getOrCreateParticipantId(storage, cryptoApi = globalThis.crypto) {
  try {
    const existing = storage?.getItem(PARTICIPANT_STORAGE_KEY);
    if (UUID.test(String(existing ?? ""))) return existing;
  } catch {
    // A browser can deny storage access; the current page can still use an ephemeral ID.
  }

  const participantId = cryptoApi.randomUUID();
  try {
    storage?.setItem(PARTICIPANT_STORAGE_KEY, participantId);
  } catch {
    // Keep the ID for this page even if persistent browser storage is unavailable.
  }
  return participantId;
}

export function createAutosaveController({
  save,
  delay = 750,
  timers = globalThis,
  onStatus = () => {},
}) {
  let timer = null;
  let pendingSnapshot;
  let inFlight = null;
  let idleWaiters = [];

  function isIdle() {
    return timer === null && !pendingSnapshot && !inFlight;
  }

  function resolveIdle() {
    if (!isIdle()) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  async function drain() {
    if (inFlight || !pendingSnapshot) {
      resolveIdle();
      return;
    }

    const snapshot = pendingSnapshot;
    pendingSnapshot = undefined;
    onStatus("saving");
    inFlight = Promise.resolve().then(() => save(snapshot));

    try {
      await inFlight;
      onStatus("saved");
    } catch {
      onStatus("offline");
    } finally {
      inFlight = null;
      if (pendingSnapshot) {
        if (timer !== null) timers.clearTimeout(timer);
        timer = null;
        await drain();
      } else {
        resolveIdle();
      }
    }
  }

  function schedule(snapshot) {
    pendingSnapshot = snapshot;
    if (timer !== null) timers.clearTimeout(timer);
    timer = timers.setTimeout(() => {
      timer = null;
      void drain();
    }, delay);
  }

  function flush(snapshot) {
    if (snapshot !== undefined) pendingSnapshot = snapshot;
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
    void drain();
    return whenIdle();
  }

  function whenIdle() {
    if (isIdle()) return Promise.resolve();
    return new Promise((resolve) => idleWaiters.push(resolve));
  }

  return { flush, schedule, whenIdle };
}

export function collectExerciseSnapshot(card, participantId) {
  const fields = Object.fromEntries(
    [...card.querySelectorAll("[data-prompt-field]")]
      .map((field) => [field.dataset.promptField, field.value]),
  );
  const notes = card.querySelector("[data-prompt-notes]")?.value ?? "";
  return {
    participantId,
    exerciseId: card.dataset.promptId,
    fields,
    notes,
  };
}

function cardHasLocalValues(card) {
  const controls = [
    ...card.querySelectorAll("[data-prompt-field]"),
    card.querySelector("[data-prompt-notes]"),
  ].filter(Boolean);
  return controls.some(({ value }) => String(value ?? "").length > 0);
}

export function hydrateExerciseFromServer(card, row) {
  if (cardHasLocalValues(card)) return false;

  const values = row?.payload?.fields ?? {};
  for (const field of card.querySelectorAll("[data-prompt-field]")) {
    if (Object.hasOwn(values, field.dataset.promptField)) {
      field.value = String(values[field.dataset.promptField] ?? "");
    }
  }
  const notes = card.querySelector("[data-prompt-notes]");
  if (notes) notes.value = String(row?.payload?.notes ?? "");
  return true;
}

export function initializePromptSync({
  documentRoot = globalThis.document,
  storage = globalThis.localStorage,
  cryptoApi = globalThis.crypto,
  fetchImpl = globalThis.fetch,
  delay = 750,
  timers = globalThis,
} = {}) {
  if (!documentRoot) {
    return { ready: Promise.resolve(), whenIdle: () => Promise.resolve() };
  }

  const participantId = getOrCreateParticipantId(storage, cryptoApi);
  const status = documentRoot.querySelector("[data-sync-status]");
  const cards = [...documentRoot.querySelectorAll("[data-prompt-card]")];
  const controllers = new Map();
  const setStatus = (state) => {
    if (status) status.textContent = STATUS_COPY[state] ?? "";
  };

  async function save(snapshot) {
    const response = await fetchImpl("/Blead/api/responses", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) throw new Error("Response sync failed");
    return response;
  }

  for (const card of cards) {
    const controller = createAutosaveController({ save, delay, timers, onStatus: setStatus });
    controllers.set(card.dataset.promptId, controller);
    const controls = [
      ...card.querySelectorAll("[data-prompt-field]"),
      card.querySelector("[data-prompt-notes]"),
    ].filter(Boolean);
    for (const control of controls) {
      control.addEventListener("input", () => {
        controller.schedule(collectExerciseSnapshot(card, participantId));
      });
      control.addEventListener("blur", () => {
        void controller.flush(collectExerciseSnapshot(card, participantId));
      });
    }
  }

  documentRoot.addEventListener("visibilitychange", () => {
    if (documentRoot.visibilityState !== "hidden") return;
    for (const card of cards) {
      void controllers.get(card.dataset.promptId)?.flush(
        collectExerciseSnapshot(card, participantId),
      );
    }
  });

  const ready = (async () => {
    try {
      const response = await fetchImpl(
        `/Blead/api/responses?participantId=${encodeURIComponent(participantId)}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) throw new Error("Response restore failed");
      const data = await response.json();
      for (const row of data.responses ?? []) {
        const card = cards.find(({ dataset }) => dataset.promptId === row.exercise_id);
        if (!card) continue;
        if (hydrateExerciseFromServer(card, row)) {
          const EventConstructor = documentRoot.defaultView?.CustomEvent ?? globalThis.CustomEvent;
          const event = EventConstructor
            ? new EventConstructor("blead:hydrate")
            : { type: "blead:hydrate" };
          card.dispatchEvent(event);
        } else if (cardHasLocalValues(card)) {
          controllers.get(card.dataset.promptId)?.schedule(
            collectExerciseSnapshot(card, participantId),
          );
        }
      }
    } catch {
      setStatus("offline");
    }
  })();

  return {
    participantId,
    ready,
    whenIdle: () => Promise.all([...controllers.values()].map(({ whenIdle }) => whenIdle())),
  };
}
