const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function participantStorageKey(workbookId) {
  return `kaindly:workbook:${workbookId}:participant-id`;
}

function fieldStorageKey(workbookId, exerciseId, fieldId) {
  return `kaindly:workbook:${workbookId}:exercise:${exerciseId}:field:${fieldId}`;
}

function notesStorageKey(workbookId, exerciseId) {
  return `kaindly:workbook:${workbookId}:exercise:${exerciseId}:notes`;
}

function safeStatus(onStatus, state) {
  try {
    onStatus(state);
  } catch {
    // Status text is informational; a detached or custom target must not stop saving.
  }
}

function readStorage(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage?.setItem(key, String(value ?? ""));
    return true;
  } catch {
    return false;
  }
}

export function getOrCreateParticipantId(storage, workbookId, cryptoApi = globalThis.crypto) {
  const key = participantStorageKey(workbookId);
  const existing = readStorage(storage, key);
  if (UUID.test(String(existing ?? ""))) return existing;

  const participantId = cryptoApi.randomUUID();
  writeStorage(storage, key, participantId);
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
  let retrySnapshot;
  let inFlight = null;
  let idleWaiters = [];

  function isIdle() {
    return timer === null && pendingSnapshot === undefined && inFlight === null;
  }

  function resolveIdle() {
    if (!isIdle()) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  async function drain() {
    if (inFlight || pendingSnapshot === undefined) {
      resolveIdle();
      return;
    }

    const snapshot = pendingSnapshot;
    pendingSnapshot = undefined;
    safeStatus(onStatus, "saving");
    inFlight = Promise.resolve().then(() => save(snapshot));

    try {
      await inFlight;
      retrySnapshot = undefined;
      safeStatus(onStatus, "saved");
    } catch {
      if (pendingSnapshot === undefined) retrySnapshot = snapshot;
      safeStatus(onStatus, "offline");
    } finally {
      inFlight = null;
      if (pendingSnapshot !== undefined) {
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
    retrySnapshot = undefined;
    if (timer !== null) timers.clearTimeout(timer);
    timer = timers.setTimeout(() => {
      timer = null;
      void drain();
    }, delay);
  }

  function flush(snapshot) {
    if (snapshot !== undefined) {
      pendingSnapshot = snapshot;
      retrySnapshot = undefined;
    } else if (pendingSnapshot === undefined && retrySnapshot !== undefined) {
      pendingSnapshot = retrySnapshot;
      retrySnapshot = undefined;
    }
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

function defaultFields(card) {
  return [...card.querySelectorAll("[data-prompt-field]")];
}

function defaultNotes(card) {
  return card.querySelector("[data-prompt-notes]");
}

function defaultExerciseId(card) {
  return card.dataset.promptId;
}

function defaultFieldId(field) {
  return field.dataset.promptField;
}

function createSerializedSave(save) {
  let tail = Promise.resolve();
  return function enqueue(snapshot) {
    const operation = tail.then(() => save(snapshot));
    tail = operation.catch(() => {});
    return operation;
  };
}

export function initializeWorkbookSync({
  workbookId,
  endpoint,
  cards = [],
  collectSnapshot,
  hydrateSnapshot,
  storage = globalThis.localStorage,
  cryptoApi = globalThis.crypto,
  fetchImpl = globalThis.fetch,
  documentRoot = globalThis.document,
  windowRoot = globalThis.window,
  navigatorRoot = globalThis.navigator,
  BlobConstructor = globalThis.Blob,
  delay = 750,
  timers = globalThis,
  onStatus = () => {},
  onHydrate = () => {},
  getFields = defaultFields,
  getNotes = defaultNotes,
  getExerciseId = defaultExerciseId,
  getFieldId = defaultFieldId,
} = {}) {
  const workbookCards = [...cards];
  const participantId = getOrCreateParticipantId(storage, workbookId, cryptoApi);
  const controllers = new Map();
  const localValues = new Map();
  const lifecycleSignatures = new Map();

  function persistControl(card, control, kind) {
    const exerciseId = getExerciseId(card);
    const key = kind === "notes"
      ? notesStorageKey(workbookId, exerciseId)
      : fieldStorageKey(workbookId, exerciseId, getFieldId(control));
    writeStorage(storage, key, control.value);
  }

  function hydrateLocal(card) {
    const exerciseId = getExerciseId(card);
    let hasValues = false;
    for (const field of getFields(card)) {
      const key = fieldStorageKey(workbookId, exerciseId, getFieldId(field));
      const stored = readStorage(storage, key);
      if (stored !== null) field.value = stored;
      else if (String(field.value ?? "").length > 0) writeStorage(storage, key, field.value);
      if (String(field.value ?? "").length > 0) hasValues = true;
    }
    const notes = getNotes(card);
    if (notes) {
      const key = notesStorageKey(workbookId, exerciseId);
      const stored = readStorage(storage, key);
      if (stored !== null) notes.value = stored;
      else if (String(notes.value ?? "").length > 0) writeStorage(storage, key, notes.value);
      if (String(notes.value ?? "").length > 0) hasValues = true;
    }
    localValues.set(exerciseId, hasValues);
  }

  function persistCard(card) {
    for (const field of getFields(card)) persistControl(card, field, "field");
    const notes = getNotes(card);
    if (notes) persistControl(card, notes, "notes");
  }

  async function save(snapshot) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) throw new Error("Response sync failed");
    return response;
  }

  const serializedSave = createSerializedSave(save);

  function attemptUnloadSave(snapshot) {
    const body = JSON.stringify(snapshot);
    try {
      if (typeof navigatorRoot?.sendBeacon === "function" && BlobConstructor) {
        const payload = new BlobConstructor([body], { type: "application/json" });
        if (navigatorRoot.sendBeacon(endpoint, payload) === true) return;
      }
    } catch {
      // Beacon can reject a payload synchronously; keepalive fetch is the fallback.
    }

    try {
      Promise.resolve(fetchImpl(endpoint, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      })).catch(() => {});
    } catch {
      // Unload delivery is best effort; the local snapshot and normal retry remain authoritative.
    }
  }

  for (const card of workbookCards) {
    hydrateLocal(card);
    const exerciseId = getExerciseId(card);
    const statusContext = { card, exerciseId };
    const controller = createAutosaveController({
      save: serializedSave,
      delay,
      timers,
      onStatus: (state) => onStatus(state, statusContext),
    });
    controllers.set(exerciseId, controller);
    const notes = getNotes(card);
    const controls = [...getFields(card), notes].filter(Boolean);
    for (const control of controls) {
      const kind = control === notes ? "notes" : "field";
      control.addEventListener("input", () => {
        persistControl(card, control, kind);
        localValues.set(exerciseId, true);
        lifecycleSignatures.delete(exerciseId);
        controller.schedule(collectSnapshot(card, participantId));
      });
      control.addEventListener("blur", () => {
        persistControl(card, control, kind);
        if (localValues.get(exerciseId)) {
          void controller.flush(collectSnapshot(card, participantId));
        }
      });
    }
  }

  function flushLifecycle() {
    for (const card of workbookCards) {
      const exerciseId = getExerciseId(card);
      if (!localValues.get(exerciseId)) continue;
      persistCard(card);
      const snapshot = collectSnapshot(card, participantId);
      void controllers.get(exerciseId)?.flush(snapshot);
      const signature = JSON.stringify(snapshot);
      if (lifecycleSignatures.get(exerciseId) === signature) continue;
      lifecycleSignatures.set(exerciseId, signature);
      attemptUnloadSave(snapshot);
    }
  }

  documentRoot?.addEventListener?.("visibilitychange", () => {
    if (documentRoot.visibilityState === "hidden") flushLifecycle();
  });
  windowRoot?.addEventListener?.("pagehide", flushLifecycle);

  const ready = (async () => {
    try {
      const response = await fetchImpl(
        `${endpoint}?participantId=${encodeURIComponent(participantId)}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) throw new Error("Response restore failed");
      const data = await response.json();
      const rowsByExercise = new Map(
        (data.responses ?? []).map((row) => [row.exercise_id, row]),
      );

      for (const card of workbookCards) {
        const exerciseId = getExerciseId(card);
        const row = rowsByExercise.get(exerciseId);
        if (row && hydrateSnapshot(card, row)) {
          persistCard(card);
          try {
            onHydrate(card, row);
          } catch {
            // Page-specific refresh hooks are optional and must not stop synchronization.
          }
        }
        if (localValues.get(exerciseId)) {
          controllers.get(exerciseId)?.schedule(collectSnapshot(card, participantId));
        }
      }
    } catch {
      safeStatus(onStatus, "offline");
    }
  })();

  return {
    participantId,
    ready,
    whenIdle: () => Promise.all([...controllers.values()].map((controller) => controller.whenIdle())),
  };
}
