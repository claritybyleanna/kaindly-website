import { initializeWorkbookSync } from "./workbook-sync.js";

export function personalizePrompt(template, replacements) {
  let personalized = String(template ?? "");
  for (const [token, value] of replacements) {
    const completed = String(value ?? "").trim();
    if (completed) personalized = personalized.replaceAll(token, completed);
  }
  return personalized;
}

function initializeMenu(root = document) {
  root.documentElement?.classList.add("blead-js");
  const button = root.querySelector("[data-menu-button]");
  const menu = root.querySelector("[data-menu]");
  if (!button || !menu) return;
  const close = () => {
    button.setAttribute("aria-expanded", "false");
    menu.removeAttribute("data-open");
  };
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    menu.toggleAttribute("data-open", !expanded);
  });
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
}

export function initializePromptCard(card) {
  const template = card.querySelector("[data-prompt-template]");
  const preview = card.querySelector("[data-prompt-preview]");
  const button = card.querySelector("[data-copy-prompt]");
  const status = card.querySelector("[data-copy-status]");
  const fields = [...card.querySelectorAll("[data-prompt-field]")];
  if (!template || !preview || !button || !status) return;

  const update = () => {
    const replacements = new Map(fields.map((field) => [
      field.dataset.promptToken,
      field.value,
    ]));
    preview.textContent = personalizePrompt(template.value, replacements);
    status.textContent = "";
  };
  fields.forEach((field) => field.addEventListener("input", update));
  card.addEventListener("bsales:hydrate", update);

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(preview.textContent);
      status.textContent = "Copied to clipboard.";
      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = original; }, 1800);
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(preview);
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "Select the highlighted prompt and copy it manually.";
    }
  });
}

export function collectBsalesSnapshot(card, participantId) {
  return {
    participantId,
    exerciseId: card.dataset.promptId,
    fields: Object.fromEntries(
      [...card.querySelectorAll("[data-prompt-field]")]
        .map((field) => [field.dataset.promptField, field.value]),
    ),
    notes: "",
  };
}

export function hydrateBsalesFromServer(card, row) {
  const values = row?.payload?.fields ?? {};
  let changed = false;
  for (const field of card.querySelectorAll("[data-prompt-field]")) {
    if (!String(field.value ?? "").length && Object.hasOwn(values, field.dataset.promptField)) {
      field.value = String(values[field.dataset.promptField] ?? "");
      changed = true;
    }
  }
  return changed;
}

export function initializeBsalesResponseSync({
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
  const workbookId = documentRoot?.body?.dataset?.workbookId;
  const endpoint = documentRoot?.body?.dataset?.responseEndpoint;
  if (!documentRoot || !workbookId || !endpoint) {
    return { ready: Promise.resolve(), whenIdle: () => Promise.resolve() };
  }

  return initializeWorkbookSync({
    workbookId,
    endpoint,
    cards: documentRoot.querySelectorAll("[data-prompt-card]"),
    collectSnapshot: collectBsalesSnapshot,
    hydrateSnapshot: hydrateBsalesFromServer,
    storage,
    cryptoApi,
    fetchImpl,
    documentRoot,
    windowRoot,
    navigatorRoot,
    BlobConstructor,
    delay,
    timers,
    onHydrate(card) {
      const EventConstructor = documentRoot.defaultView?.CustomEvent ?? globalThis.CustomEvent;
      card.dispatchEvent(EventConstructor
        ? new EventConstructor("bsales:hydrate")
        : { type: "bsales:hydrate" });
    },
  });
}

export function initializeBsales(root = document) {
  initializeMenu(root);
  root.querySelectorAll("[data-prompt-card]").forEach(initializePromptCard);
  return initializeBsalesResponseSync({ documentRoot: root });
}

if (typeof document !== "undefined") initializeBsales();
