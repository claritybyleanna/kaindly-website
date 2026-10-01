const WORKBOOK_STORAGE_PREFIX = "kaindly-mclendon-workbook:";

function storageKey(promptId) {
  return `${WORKBOOK_STORAGE_PREFIX}${promptId}`;
}

export function loadWorkbookNote(storage, promptId) {
  return storage.getItem(storageKey(promptId)) || "";
}

export function saveWorkbookNote(storage, promptId, note) {
  storage.setItem(storageKey(promptId), note);
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

function initializeWorkbook() {
  const prompts = document.querySelectorAll("[data-workbook-prompt]");

  for (const prompt of prompts) {
    const copyButton = prompt.querySelector("[data-copy-prompt]");
    const copyStatus = prompt.querySelector("[data-copy-status]");
    const notes = prompt.querySelector("[data-workbook-note]");
    const noteStatus = prompt.querySelector("[data-note-status]");

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

    if (notes && noteStatus) {
      try {
        notes.value = loadWorkbookNote(window.localStorage, notes.dataset.workbookNote);
      } catch {
        noteStatus.textContent = "Private saving is unavailable in this browser.";
      }

      notes.addEventListener("input", () => {
        try {
          saveWorkbookNote(window.localStorage, notes.dataset.workbookNote, notes.value);
          noteStatus.textContent = "Saved privately on this device.";
        } catch {
          noteStatus.textContent = "Private saving is unavailable in this browser.";
        }
      });
    }
  }
}

if (typeof document !== "undefined") initializeWorkbook();
