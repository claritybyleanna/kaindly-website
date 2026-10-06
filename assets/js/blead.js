export function setDisclosure(button, expanded) {
  if (!button) return;
  const panelId = button.getAttribute("aria-controls");
  const panel = button.ownerDocument?.getElementById(panelId);
  if (!panel) return;

  button.setAttribute("aria-expanded", String(expanded));
  panel.hidden = !expanded;

  const label = button.querySelector?.("[data-accordion-label]");
  if (label) label.textContent = expanded ? "Hide details" : "View details";
  const icon = button.querySelector?.("[data-accordion-icon]");
  if (icon) icon.textContent = expanded ? "−" : "+";
}

export function openDeepLinkedWeek(hash, root = globalThis.document) {
  if (!/^#week-\d{2}$/.test(hash) || !root) return false;
  const week = root.getElementById(hash.slice(1));
  const button = week?.querySelector?.("[data-accordion-control]");
  if (!week || !button) return false;

  setDisclosure(button, true);
  const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  week.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  return true;
}

export function resourceMatches(resourceElement, query = "", type = "all") {
  const normalizedQuery = String(query).trim().toLowerCase();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const text = String(resourceElement?.textContent ?? "").toLowerCase();
  const resourceType = resourceElement?.dataset?.resourceType ?? "";
  const state = resourceElement?.dataset?.resourceState ?? "";
  const matchesType = type === "all"
    || resourceType === type
    || (type === "available" && ["available", "external"].includes(state))
    || (type === "upcoming" && state === "upcoming")
    || (type === "other" && state === "unavailable");

  return matchesType && terms.every((term) => text.includes(term));
}

function initializeDisclosures(documentRoot) {
  const controls = documentRoot.querySelectorAll("[data-accordion-control]");
  controls.forEach((button) => {
    setDisclosure(button, button.getAttribute("aria-expanded") === "true");
    button.addEventListener("click", () => {
      setDisclosure(button, button.getAttribute("aria-expanded") !== "true");
    });
  });
}

function focusMenuDestination(documentRoot, link) {
  const hash = link.hash;
  const target = hash ? documentRoot.getElementById(hash.slice(1)) : null;
  if (!target) return;

  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
}

function initializeMenu(documentRoot) {
  const button = documentRoot.querySelector("[data-menu-button]");
  const menu = documentRoot.querySelector("[data-menu]");
  if (!button || !menu) return;

  const closeMenu = ({ returnFocus = false } = {}) => {
    button.setAttribute("aria-expanded", "false");
    menu.removeAttribute("data-open");
    if (returnFocus) button.focus();
  };

  button.addEventListener("click", () => {
    const opening = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(opening));
    menu.toggleAttribute("data-open", opening);
  });
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", (event) => {
    const wasOpen = button.getAttribute("aria-expanded") === "true";
    if (!wasOpen || !link.hash) {
      closeMenu();
      return;
    }

    event.preventDefault();
    closeMenu();
    const pageWindow = documentRoot.defaultView;
    if (pageWindow?.location.hash !== link.hash) pageWindow.location.hash = link.hash;
    else documentRoot.getElementById(link.hash.slice(1))?.scrollIntoView({ block: "start" });
    pageWindow?.requestAnimationFrame(() => focusMenuDestination(documentRoot, link));
  }));
  documentRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      closeMenu({ returnFocus: true });
    }
  });
}

function initializeFilters(documentRoot) {
  const buttons = [...documentRoot.querySelectorAll("[data-filter]")];
  const resources = [...documentRoot.querySelectorAll("[data-resource]")];
  const count = documentRoot.querySelector("[data-result-count]");
  const empty = documentRoot.querySelector("[data-empty-state]");
  const clear = documentRoot.querySelector("[data-clear-filter]");
  if (!buttons.length || !resources.length || !count) return;

  const applyFilter = (type) => {
    let visible = 0;
    resources.forEach((resource) => {
      const matches = resourceMatches(resource, "", type);
      resource.hidden = !matches;
      if (matches) visible += 1;
    });
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === type));
    });
    count.textContent = `${visible} material${visible === 1 ? "" : "s"} shown`;
    if (empty) empty.hidden = visible !== 0;
  };

  buttons.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.filter)));
  clear?.addEventListener("click", () => applyFilter("all"));
}

export function initializeBlead(documentRoot = globalThis.document) {
  if (!documentRoot) return;
  documentRoot.documentElement.classList.add("blead-js");
  initializeDisclosures(documentRoot);
  initializeMenu(documentRoot);
  initializeFilters(documentRoot);
  openDeepLinkedWeek(globalThis.location?.hash ?? "", documentRoot);
  globalThis.addEventListener?.("hashchange", () => {
    openDeepLinkedWeek(globalThis.location?.hash ?? "", documentRoot);
  });
}

if (typeof document !== "undefined") initializeBlead(document);
