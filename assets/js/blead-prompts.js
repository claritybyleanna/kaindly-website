import { initializePromptSync } from "./blead-prompt-sync.js";

const WORKBOOK_ID = "bracco-session-1";
const LEGACY_STORAGE_PREFIX = "kaindly:blead:session-1";

function legacyStorageKey(promptId, fieldId) {
  return `${LEGACY_STORAGE_PREFIX}:${promptId}:${fieldId}`;
}

function storageKey(promptId, fieldId) {
  return fieldId === "notes"
    ? `kaindly:workbook:${WORKBOOK_ID}:exercise:${promptId}:notes`
    : `kaindly:workbook:${WORKBOOK_ID}:exercise:${promptId}:field:${fieldId}`;
}

function readStorage(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function compilePrompt(template, replacements = {}) {
  return Object.entries(replacements).reduce((result, [token, value]) => {
    const replacement = String(value ?? "").trim();
    return replacement ? result.replaceAll(token, replacement) : result;
  }, String(template));
}

export function loadExerciseValue(storage, promptId, fieldId) {
  const currentKey = storageKey(promptId, fieldId);
  const current = readStorage(storage, currentKey);
  if (String(current ?? "").length > 0) return current;

  const legacy = readStorage(storage, legacyStorageKey(promptId, fieldId));
  if (legacy === null) return current ?? "";

  try {
    storage?.setItem(currentKey, legacy);
  } catch {
    // The legacy value is still usable for this visit when storage is unavailable.
  }
  return legacy;
}

function isExerciseValueStored(storage, promptId, fieldId, value) {
  return readStorage(storage, storageKey(promptId, fieldId)) === String(value ?? "");
}

export async function copyPrompt(clipboard, promptText) {
  if (!clipboard?.writeText) throw new Error("Clipboard access is unavailable");
  await clipboard.writeText(String(promptText));
}

function legacyCopy(documentRoot, text) {
  const helper = documentRoot.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  documentRoot.body.append(helper);
  helper.select();
  const copied = documentRoot.execCommand?.("copy") === true;
  helper.remove();
  if (!copied) throw new Error("Copy failed");
}

function preparePrompt(card, documentRoot, storage) {
  const promptId = card.dataset.promptId;
  const template = card.querySelector("[data-prompt-template]")?.value ?? "";
  const preview = card.querySelector("[data-prompt-preview]");
  const fields = [...card.querySelectorAll("[data-prompt-field]")];
  const copyButton = card.querySelector("[data-copy-prompt]");
  const copyStatus = card.querySelector("[data-copy-status]");
  const notes = card.querySelector("[data-prompt-notes]");
  const noteStatus = card.querySelector("[data-note-status]");

  const replacements = () => Object.fromEntries(
    fields.map((field) => [field.dataset.promptToken, field.value]),
  );
  const refreshPreview = () => {
    if (preview) preview.textContent = compilePrompt(template, replacements());
  };

  fields.forEach((field) => {
    field.value = loadExerciseValue(storage, promptId, field.dataset.promptField);
  });

  if (notes) {
    notes.value = loadExerciseValue(storage, promptId, "notes");
  }

  refreshPreview();

  return function attachPresentationListeners() {
    fields.forEach((field) => {
      field.addEventListener("input", () => {
        const saved = isExerciseValueStored(
          storage,
          promptId,
          field.dataset.promptField,
          field.value,
        );
        refreshPreview();
        if (noteStatus) noteStatus.textContent = saved ? "Exercise saved in this browser." : "Exercise updated for this visit.";
      });
    });

    if (notes) {
      notes.addEventListener("input", () => {
        const saved = isExerciseValueStored(storage, promptId, "notes", notes.value);
        if (noteStatus) noteStatus.textContent = saved ? "Notes saved in this browser." : "Notes updated for this visit.";
      });
    }

    card.addEventListener("blead:hydrate", () => {
      refreshPreview();
      if (noteStatus) noteStatus.textContent = "Exercise restored on this device.";
    });

    copyButton?.addEventListener("click", async () => {
      const promptText = compilePrompt(template, replacements());
      try {
        if (globalThis.navigator?.clipboard?.writeText) {
          await copyPrompt(globalThis.navigator.clipboard, promptText);
        } else {
          legacyCopy(documentRoot, promptText);
        }
        copyStatus.textContent = "Prompt copied. Paste it into Microsoft Copilot.";
        copyButton.textContent = "Copied";
        globalThis.setTimeout?.(() => { copyButton.textContent = "Copy Prompt"; }, 1800);
      } catch {
        copyStatus.textContent = "Copy was blocked. Select the prompt text and copy it manually.";
        preview?.focus();
      }
    });
  };
}

export function initializePromptWorkbook(
  documentRoot = globalThis.document,
  storage = globalThis.localStorage,
  syncOptions = {},
) {
  if (!documentRoot) return;
  const preparedPrompts = [...documentRoot.querySelectorAll("[data-prompt-card]")]
    .map((card) => preparePrompt(card, documentRoot, storage));
  const sync = initializePromptSync({ ...syncOptions, documentRoot, storage });
  preparedPrompts.forEach((attachPresentationListeners) => attachPresentationListeners());
  return sync;
}

if (typeof document !== "undefined") initializePromptWorkbook(document);
