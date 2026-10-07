const STORAGE_PREFIX = "kaindly:blead:session-1";

function storageKey(promptId, fieldId) {
  return `${STORAGE_PREFIX}:${promptId}:${fieldId}`;
}

export function compilePrompt(template, replacements = {}) {
  return Object.entries(replacements).reduce((result, [token, value]) => {
    const replacement = String(value ?? "").trim();
    return replacement ? result.replaceAll(token, replacement) : result;
  }, String(template));
}

export function saveExerciseValue(storage, promptId, fieldId, value) {
  try {
    storage?.setItem(storageKey(promptId, fieldId), String(value ?? ""));
    return true;
  } catch {
    return false;
  }
}

export function loadExerciseValue(storage, promptId, fieldId) {
  try {
    return storage?.getItem(storageKey(promptId, fieldId)) ?? "";
  } catch {
    return "";
  }
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

function initializePrompt(card, documentRoot, storage) {
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
    field.addEventListener("input", () => {
      const saved = saveExerciseValue(storage, promptId, field.dataset.promptField, field.value);
      refreshPreview();
      if (noteStatus) noteStatus.textContent = saved ? "Exercise saved in this browser." : "Exercise updated for this visit.";
    });
  });

  if (notes) {
    notes.value = loadExerciseValue(storage, promptId, "notes");
    notes.addEventListener("input", () => {
      const saved = saveExerciseValue(storage, promptId, "notes", notes.value);
      if (noteStatus) noteStatus.textContent = saved ? "Notes saved in this browser." : "Notes updated for this visit.";
    });
  }

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

  refreshPreview();
}

export function initializePromptWorkbook(documentRoot = globalThis.document, storage = globalThis.localStorage) {
  if (!documentRoot) return;
  documentRoot.querySelectorAll("[data-prompt-card]").forEach((card) => {
    initializePrompt(card, documentRoot, storage);
  });
}

if (typeof document !== "undefined") initializePromptWorkbook(document);
