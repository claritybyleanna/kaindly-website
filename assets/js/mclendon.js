import { initializeWorkbookSync } from "./workbook-sync.js";

const MCLENDON_WORKBOOK_ID = "mclendon-working-smarter";
const MCLENDON_ENDPOINT = "/McLendon/api/responses";
const LEGACY_STORAGE_PREFIX = "kaindly-mclendon-workbook:";
const SAVED_STATUS = "Saved.";
const UNAVAILABLE_STATUS = "Private saving is unavailable in this browser.";

function workbookNotesKey(exerciseId) {
  return `kaindly:workbook:${MCLENDON_WORKBOOK_ID}:exercise:${exerciseId}:notes`;
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
    storage?.setItem(key, value);
  } catch {
    // The shared sync engine remains usable when browser storage is unavailable.
  }
}

function storageMatches(storage, key, value) {
  try {
    return storage?.getItem(key) === String(value ?? "");
  } catch {
    return false;
  }
}

function exerciseIdFrom(card) {
  return card.querySelector("[data-workbook-note]")?.dataset.workbookNote;
}

function noteFrom(card) {
  return card.querySelector("[data-workbook-note]");
}

export function migrateLegacyWorkbookNotes(storage, cards) {
  for (const card of cards) {
    const exerciseId = exerciseIdFrom(card);
    if (!exerciseId) continue;
    const currentKey = workbookNotesKey(exerciseId);
    if (String(readStorage(storage, currentKey) ?? "").length > 0) continue;
    const legacyNote = readStorage(storage, `${LEGACY_STORAGE_PREFIX}${exerciseId}`);
    if (String(legacyNote ?? "").length > 0) writeStorage(storage, currentKey, legacyNote);
  }
}

export function collectMclendonSnapshot(card, participantId) {
  return {
    participantId,
    exerciseId: exerciseIdFrom(card),
    fields: {},
    notes: noteFrom(card)?.value ?? "",
  };
}

export function hydrateMclendonFromServer(card, row) {
  const note = noteFrom(card);
  if (!note || String(note.value ?? "").length > 0 || !row?.payload?.notes) return false;
  note.value = String(row.payload.notes);
  return true;
}

export function initializeMclendonResponseSync({
  documentRoot = globalThis.document,
  storage = globalThis.localStorage,
  cryptoApi = globalThis.crypto,
  fetchImpl = globalThis.fetch,
  delay = 750,
  timers = globalThis,
  windowRoot = globalThis.window,
  navigatorRoot = globalThis.navigator,
  BlobConstructor = globalThis.Blob,
} = {}) {
  if (!documentRoot) {
    return { ready: Promise.resolve(), whenIdle: () => Promise.resolve() };
  }

  const cards = [...documentRoot.querySelectorAll("[data-workbook-prompt]")];
  migrateLegacyWorkbookNotes(storage, cards);

  const statuses = cards
    .map((card) => card.querySelector("[data-note-status]"))
    .filter(Boolean);
  const setAllStatuses = (copy) => {
    for (const status of statuses) status.textContent = copy;
  };
  const sync = initializeWorkbookSync({
    workbookId: MCLENDON_WORKBOOK_ID,
    endpoint: MCLENDON_ENDPOINT,
    cards,
    collectSnapshot: collectMclendonSnapshot,
    hydrateSnapshot: hydrateMclendonFromServer,
    storage,
    cryptoApi,
    fetchImpl,
    documentRoot,
    windowRoot,
    navigatorRoot,
    BlobConstructor,
    delay,
    timers,
    getFields: () => [],
    getNotes: noteFrom,
    getExerciseId: exerciseIdFrom,
    onStatus(state, context) {
      if (!context) {
        if (state === "offline") setAllStatuses(UNAVAILABLE_STATUS);
        return;
      }
      const status = context.card.querySelector("[data-note-status]");
      if (!status) return;
      if (state === "saved") status.textContent = SAVED_STATUS;
      if (state === "offline") status.textContent = UNAVAILABLE_STATUS;
    },
  });

  for (const card of cards) {
    const note = noteFrom(card);
    const status = card.querySelector("[data-note-status]");
    if (!note || !status) continue;
    note.addEventListener("input", () => {
      status.textContent = storageMatches(
        storage,
        workbookNotesKey(exerciseIdFrom(card)),
        note.value,
      ) ? SAVED_STATUS : UNAVAILABLE_STATUS;
    });
  }

  return sync;
}

export async function copyWorkbookPrompt(clipboard, promptText) {
  await clipboard.writeText(promptText);
}

function promptTextFrom(container) {
  return [...container.querySelectorAll("[data-prompt-part]")]
    .map((part) => {
      const label = part.querySelector("h3")?.textContent.trim() || "";
      const copy = part.querySelector("p")?.textContent.trim() || "";
      return `${label}\n${copy}`;
    })
    .join("\n\n");
}

export function initializeWorkbook(root = document) {
  const prompts = root.querySelectorAll("[data-workbook-prompt]");

  for (const prompt of prompts) {
    const copyButton = prompt.querySelector("[data-copy-prompt]");
    const copyStatus = prompt.querySelector("[data-copy-status]");

    if (copyButton && copyStatus) {
      copyButton.addEventListener("click", async () => {
        try {
          await copyWorkbookPrompt(navigator.clipboard, promptTextFrom(prompt));
          copyButton.textContent = "Copied";
          copyStatus.textContent = "Prompt copied. Paste it into your AI assistant.";
          window.setTimeout(() => { copyButton.textContent = "Copy Prompt"; }, 1800);
        } catch {
          copyStatus.textContent = "Copying was blocked by this browser. Select the prompt text and copy it manually.";
        }
      });
    }
  }

  return initializeMclendonResponseSync({ documentRoot: root });
}

if (typeof document !== "undefined") initializeWorkbook();
