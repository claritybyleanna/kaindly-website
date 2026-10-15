import {
  createAutosaveController,
  getOrCreateParticipantId as getOrCreateWorkbookParticipantId,
  initializeWorkbookSync,
} from "./workbook-sync.js";

const BLEAD_WORKBOOK_ID = "bracco-leadership-session-1";
const BLEAD_ENDPOINT = "/Blead/api/responses";
const LEGACY_PARTICIPANT_STORAGE_KEY = "kaindly:blead:anonymous-participant-id";
const PARTICIPANT_STORAGE_KEY = `kaindly:workbook:${BLEAD_WORKBOOK_ID}:participant-id`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const STATUS_COPY = {
  saving: "Saving responses…",
  saved: "Responses saved.",
  offline: "Saved on this device. We’ll sync when you’re connected.",
};

function migrateLegacyParticipantId(storage) {
  try {
    const current = storage?.getItem(PARTICIPANT_STORAGE_KEY);
    if (UUID.test(String(current ?? ""))) return;
    const legacy = storage?.getItem(LEGACY_PARTICIPANT_STORAGE_KEY);
    if (UUID.test(String(legacy ?? ""))) storage?.setItem(PARTICIPANT_STORAGE_KEY, legacy);
  } catch {
    // Storage can be unavailable; the shared engine will use an ephemeral identifier.
  }
}

export function getOrCreateParticipantId(storage, cryptoApi = globalThis.crypto) {
  migrateLegacyParticipantId(storage);
  return getOrCreateWorkbookParticipantId(storage, BLEAD_WORKBOOK_ID, cryptoApi);
}

export { createAutosaveController };

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

export function hydrateExerciseFromServer(card, row) {
  const values = row?.payload?.fields ?? {};
  let changed = false;
  for (const field of card.querySelectorAll("[data-prompt-field]")) {
    if (!String(field.value ?? "").length && Object.hasOwn(values, field.dataset.promptField)) {
      field.value = String(values[field.dataset.promptField] ?? "");
      changed = true;
    }
  }
  const notes = card.querySelector("[data-prompt-notes]");
  if (notes && !String(notes.value ?? "").length && row?.payload?.notes) {
    notes.value = String(row.payload.notes);
    changed = true;
  }
  return changed;
}

export function initializePromptSync({
  documentRoot = globalThis.document,
  storage = globalThis.localStorage,
  cryptoApi = globalThis.crypto,
  fetchImpl = globalThis.fetch,
  delay = 750,
  timers = globalThis,
  windowRoot = globalThis.window,
} = {}) {
  if (!documentRoot) {
    return { ready: Promise.resolve(), whenIdle: () => Promise.resolve() };
  }

  migrateLegacyParticipantId(storage);
  const status = documentRoot.querySelector("[data-sync-status]");
  const cards = [...documentRoot.querySelectorAll("[data-prompt-card]")];
  const setStatus = (state) => {
    if (status) status.textContent = STATUS_COPY[state] ?? "";
  };

  return initializeWorkbookSync({
    workbookId: BLEAD_WORKBOOK_ID,
    endpoint: BLEAD_ENDPOINT,
    cards,
    collectSnapshot: collectExerciseSnapshot,
    hydrateSnapshot: hydrateExerciseFromServer,
    storage,
    cryptoApi,
    fetchImpl,
    documentRoot,
    windowRoot,
    delay,
    timers,
    onStatus: setStatus,
    onHydrate(card) {
      const EventConstructor = documentRoot.defaultView?.CustomEvent ?? globalThis.CustomEvent;
      const event = EventConstructor
        ? new EventConstructor("blead:hydrate")
        : { type: "blead:hydrate" };
      card.dispatchEvent(event);
    },
  });
}
