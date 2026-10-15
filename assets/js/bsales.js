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

function initializePromptCard(card) {
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

function initializeBsales(root = document) {
  initializeMenu(root);
  root.querySelectorAll("[data-prompt-card]").forEach(initializePromptCard);
}

if (typeof document !== "undefined") initializeBsales();
