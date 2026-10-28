import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { bsalesContent } from "../bsales/content.js";
import { packOneContent } from "../bsales/pack-1/content.js";
import { packTwoContent } from "../bsales/pack-2/content.js";
import { getWorkbookRegistration } from "../lib/workbook-registry.js";
import { createBsalesSchemas } from "../lib/workbook-schema.js";

const packRegistrations = new Map([
  [packOneContent, getWorkbookRegistration("bracco-sales-pack-1")],
  [packTwoContent, getWorkbookRegistration("bracco-sales-pack-2")],
]);

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

function header(navigation = "hub") {
  const links = navigation === "hub"
    ? '<a href="#agenda">Agenda</a><a href="#materials">Prompt packs</a><a href="#how-to-use">How to use this hub</a><a href="#resources">Resources</a>'
    : '<a href="/bsales/">Session hub</a><a href="#prompts">Prompts</a><a href="#safety">Use it safely</a>';
  return `<header class="blead-header" data-site-header>
    <div class="blead-shell blead-header-inner">
      <a class="blead-brand" href="/bsales/" aria-label="Bracco Sales Team AI Working Session home"><img src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY"></a>
      <button class="blead-menu-button" type="button" aria-expanded="false" aria-controls="bsales-navigation" data-menu-button><span>Menu</span><span aria-hidden="true">☰</span></button>
      <nav id="bsales-navigation" class="blead-navigation" aria-label="Bracco Sales Team session" data-menu>${links}</nav>
      <form class="blead-logout" method="post" action="/bsales/logout/"><button type="submit">End session</button></form>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="blead-footer"><div class="blead-shell blead-footer-grid"><div><img src="/assets/brand/logo-secondary-white.svg" alt="KAINDLY"><p>Bracco Sales Team · AI Working Session</p></div><nav aria-label="Session links"><a href="/bsales/">Session hub</a><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Service</a></nav><a href="#top">Back to top ↑</a></div></footer>`;
}

function resourceCard(resource) {
  const available = resource.state === "available";
  const newTab = resource.newTab ? ' target="_blank" rel="noopener"' : "";
  return `<article class="bsales-resource ${available ? "bsales-resource--available" : "bsales-resource--upcoming"}">
    <div><p class="blead-kicker">${escapeHtml(resource.type)}</p><span class="bsales-status ${available ? "bsales-status--available" : "bsales-status--upcoming"}">${escapeHtml(resource.status)}</span></div>
    <h3>${escapeHtml(resource.title)}</h3>
    <p>${escapeHtml(resource.description)}</p>
    <div class="bsales-resource-actions">${available
      ? `<a class="blead-button blead-button--primary" href="${escapeHtml(resource.href)}"${newTab}>${escapeHtml(resource.actionLabel)}</a><a class="bsales-text-link" href="${escapeHtml(resource.download)}" download>${escapeHtml(resource.downloadLabel)}</a>`
      : '<span class="bsales-disabled-action" aria-disabled="true">Deck link will appear here</span>'}</div>
  </article>`;
}

function agendaItem(item) {
  return `<li class="bsales-agenda-item"><time>${escapeHtml(item.time)}</time><div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></li>`;
}

function exerciseResourceCard({ exercise, promptPack, deck }, index) {
  return `<article class="blead-resource blead-resource--positive">
    <span class="blead-resource-type">Exercise ${String(index + 1).padStart(2, "0")}</span>
    <h3>${escapeHtml(exercise.title)}</h3>
    <p>${escapeHtml(exercise.description)}</p>
    <span class="blead-resource-status">Available now</span>
    <div class="bsales-resource-kit"><span>${escapeHtml(promptPack.title)}</span><div><a class="blead-resource-download" href="${escapeHtml(promptPack.download)}" download>Download Word prompt pack</a><a class="bsales-text-link" href="${escapeHtml(deck.href)}" target="_blank" rel="noopener">Open ${escapeHtml(deck.type)}</a></div></div>
  </article>`;
}

function pdfResourceCard(resource) {
  return `<article class="blead-resource blead-resource--positive">
    <span class="blead-resource-type">PDF prompt pack</span>
    <h3>${escapeHtml(resource.title)}</h3>
    <p>${escapeHtml(resource.description)}</p>
    <span class="blead-resource-status">Available now</span>
    <a class="blead-resource-download" href="${escapeHtml(resource.href)}" target="_blank" rel="noopener">${escapeHtml(resource.actionLabel)}</a>
  </article>`;
}

export function renderBsalesHub(content) {
  const promptResources = content.resources.filter((resource) => resource.type === "Interactive prompt pack");
  const deckResources = content.resources.filter((resource) => resource.type.includes("Session deck"));
  const exerciseResources = [
    { exercise: content.agenda[2], promptPack: promptResources[0], deck: deckResources[0] },
    { exercise: content.agenda[4], promptPack: promptResources[1], deck: deckResources[1] },
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bracco Sales Team AI Working Session | KAINDLY</title>
  <meta name="description" content="Protected KAINDLY working hub for the Bracco Sales Team.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/blead.css">
  <link rel="stylesheet" href="/assets/css/bsales.css">
</head>
<body class="blead-page bsales-page" id="top">
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${header("hub")}
  <main id="main-content">
    <section class="bsales-hero" aria-labelledby="bsales-title"><div class="blead-shell bsales-hero-inner"><div><p class="blead-eyebrow">${escapeHtml(content.site.eyebrow)}</p><h1 id="bsales-title">${escapeHtml(content.site.title)}</h1><p class="bsales-audience">${escapeHtml(content.site.audience)}</p><p>${escapeHtml(content.site.introduction)}</p></div></div></section>
    <section class="bsales-readiness" aria-labelledby="readiness-title"><div class="blead-shell"><div class="bsales-readiness-card"><div><p class="blead-kicker">Before the session</p><h2 id="readiness-title">${escapeHtml(content.readiness.title)}</h2><p>${escapeHtml(content.readiness.message).replace("hello@kaindly.ai", '<a href="mailto:hello@kaindly.ai">hello@kaindly.ai</a>')}</p><p>${escapeHtml(content.readiness.incomplete)}</p></div><a class="blead-button blead-button--primary" href="${escapeHtml(content.readiness.href)}" target="_blank" rel="noopener">${escapeHtml(content.readiness.actionLabel)}</a></div></div></section>
    <section class="blead-section blead-section--tinted" id="agenda" aria-labelledby="agenda-title"><div class="blead-shell bsales-agenda-layout"><div><p class="blead-kicker">Today’s session</p><h2 id="agenda-title">Today’s agenda</h2><p>Part 1 builds the foundation and your AI brain. Part 2 turns that foundation into a coaching chief of staff.</p></div><ol class="bsales-agenda-list">${content.agenda.map(agendaItem).join("")}</ol></div></section>
    <section class="blead-section" id="materials" aria-labelledby="materials-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Interactive prompt packs</p><h2 id="materials-title">Work through the session</h2></div><p>Open each prompt pack to work through it online, or download the original Word version.</p></div><div class="bsales-resource-grid">${promptResources.map(resourceCard).join("")}</div></div></section>
    <section class="blead-section blead-section--tinted" id="how-to-use" aria-labelledby="how-to-use-title"><div class="blead-shell bsales-how-to"><div><p class="blead-kicker">How to use this hub</p><h2 id="how-to-use-title">Open, personalize, copy</h2></div><ol><li><strong>Choose a prompt pack.</strong><span>Start with Pack 1, then build on it with Pack 2.</span></li><li><strong>Open the prompt you need.</strong><span>Fill in any bracketed fields that apply to your situation.</span></li><li><strong>Copy it into Microsoft Copilot.</strong><span>Review every output before you use or save it.</span></li></ol></div></section>
    <section class="blead-section" id="resources" aria-labelledby="resources-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Resources</p><h2 id="resources-title">The session is broken into two sections</h2></div><p>Each exercise includes its matching Word prompt pack and presentation deck.</p></div><div class="blead-resource-grid">${exerciseResources.map(exerciseResourceCard).join("")}${content.resources.filter(resource => resource.type === "PDF prompt pack").map(pdfResourceCard).join("")}</div></div></section>
  </main>
  ${footer()}
  <script type="module" src="/assets/js/bsales.js?v=20261015"></script>
</body>
</html>`;
}

function fieldLabel(token) {
  return token.slice(1, -1).replace(/^PASTE\s+/u, "").replace(/\s+OR\s+.*$/u, "").trim();
}

function extractFields(prompt) {
  const tokens = [...prompt.matchAll(/\[[^\]\n]{2,140}\]/gu)].map(([token]) => token);
  return [...new Set(tokens)].filter((token) => token !== "[Inferred]" && !/^\[OR:/u.test(token));
}

function renderFields(item, exercise) {
  const tokens = extractFields(item.prompt);
  if (!exercise.fields.length) return "";
  return `<section class="blead-prompt-personalize" aria-labelledby="${exercise.id}-personalize"><h4 id="${exercise.id}-personalize">Personalize this prompt</h4><p>Fill in the fields you want to replace. Blank fields keep the original bracketed guidance.</p><div class="blead-prompt-fields">${exercise.fields.map((field, index) => {
    const token = tokens[index];
    const label = fieldLabel(token);
    const fieldId = `${exercise.id}-${field.id}`;
    const multiline = /PASTE|NOTES|RESULTS|MANUAL|STATEMENTS|OBSERVATION|ACTION/i.test(label) || label.length > 54;
    const shared = `id="${fieldId}" data-prompt-field="${escapeHtml(field.id)}" data-prompt-token="${escapeHtml(token)}" placeholder="${escapeHtml(label)}" autocomplete="off"`;
    return `<label class="blead-prompt-field" for="${fieldId}"><span>${escapeHtml(label)}</span>${multiline ? `<textarea ${shared} rows="4"></textarea>` : `<input ${shared} type="text">`}</label>`;
  }).join("")}</div></section>`;
}

function promptCard(item, exercise, kind = "prompt") {
  const number = String(item.number).padStart(2, "0");
  const id = exercise.id;
  return `<article class="blead-prompt-card" id="${id}" data-prompt-card data-prompt-id="${escapeHtml(id)}">
    <header class="blead-prompt-card-header"><div><span class="blead-prompt-number">${kind === "setup" ? "Setup" : "Prompt"} ${number}</span><h3>${escapeHtml(item.title)}</h3></div><div class="blead-prompt-meta"><p><strong>Use it:</strong> ${escapeHtml(item.useWhen)}</p><p><strong>${kind === "setup" ? "Setup time" : "Stage"}:</strong> ${escapeHtml(item.time)}</p></div></header>
    ${item.description ? `<p class="bsales-card-description">${escapeHtml(item.description)}</p>` : ""}
    <details class="blead-prompt-exercise"${item.number === 1 ? " open" : ""}><summary><span>Open ${kind === "setup" ? "setup" : "prompt"}</span><span aria-hidden="true">+</span></summary><div class="blead-prompt-exercise-body">
      ${renderFields(item, exercise)}
      <section class="blead-prompt-copy" aria-labelledby="${id}-copy-title"><div class="blead-prompt-copy-heading"><h4 id="${id}-copy-title">Copy this ${kind === "setup" ? "setup" : "prompt"}</h4><button type="button" data-copy-prompt>Copy ${kind === "setup" ? "Setup" : "Prompt"}</button></div><textarea hidden data-prompt-template aria-hidden="true" tabindex="-1">${escapeHtml(item.prompt)}</textarea><pre tabindex="0" data-prompt-preview>${escapeHtml(item.prompt)}</pre><p class="blead-prompt-status" role="status" aria-live="polite" data-copy-status></p></section>
    </div></details>
  </article>`;
}

export function renderBsalesPack(content) {
  const registration = packRegistrations.get(content);
  if (!registration) throw new TypeError("Unknown Bracco Sales prompt pack");
  const schemas = createBsalesSchemas(content);
  const setupSchemas = schemas.slice(0, content.setup.length);
  const promptSchemas = schemas.slice(content.setup.length);
  const setup = content.setup.length
    ? `<section class="blead-section" id="setup" aria-labelledby="setup-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Set up your chief of staff</p><h2 id="setup-title">Four setup items</h2></div><p>Choose the notebook or agent route, then copy only the setup items for that route.</p></div><div class="blead-prompt-list">${content.setup.map((item, index) => promptCard(item, setupSchemas[index], "setup")).join("")}</div></div></section>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(content.title)} | Bracco Sales Team</title>
  <meta name="description" content="Interactive ${escapeHtml(content.subtitle)} for the Bracco Sales Team AI Working Session.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/blead.css">
  <link rel="stylesheet" href="/assets/css/blead-prompts.css">
  <link rel="stylesheet" href="/assets/css/bsales.css">
</head>
<body class="blead-page blead-prompts-page bsales-page" id="top" data-workbook-id="${escapeHtml(registration.workbook.id)}" data-response-endpoint="${escapeHtml(registration.participantApiPath)}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${header("pack")}
  <main id="main-content">
    <section class="blead-prompts-hero bsales-pack-hero" aria-labelledby="prompt-pack-title"><div class="blead-shell"><p class="blead-eyebrow">${escapeHtml(content.eyebrow)}</p><p class="bsales-pack-number">${escapeHtml(content.subtitle)}</p><h1 id="prompt-pack-title">${escapeHtml(content.title)}</h1><p class="blead-prompts-subtitle">${escapeHtml(content.introduction)}</p><p>${escapeHtml(content.guidance)}</p><div class="bsales-hero-actions"><a class="blead-button blead-button--primary" href="#${content.setup.length ? "setup" : "prompts"}">Start the pack</a><a class="blead-button blead-button--secondary" href="${escapeHtml(content.download)}" download>Download Word version</a></div></div></section>
    <section class="blead-section blead-section--tinted" id="safety" aria-labelledby="safety-title"><div class="blead-shell"><p class="blead-kicker">Before you start</p><h2 id="safety-title">Use it safely</h2><ul class="bsales-safety-list">${content.safety.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></section>
    ${setup}
    <section class="blead-section${content.setup.length ? " blead-section--tinted" : ""}" id="prompts" aria-labelledby="prompts-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Interactive workbook</p><h2 id="prompts-title">${content.prompts.length} prompts for the session</h2></div><p>Open a prompt, personalize any bracketed fields, then copy it into Microsoft Copilot.</p></div><div class="blead-prompt-list">${content.prompts.map((item, index) => promptCard(item, promptSchemas[index])).join("")}</div></div></section>
  </main>
  ${footer()}
  <script type="module" src="/assets/js/bsales.js?v=20261015"></script>
</body>
</html>`;
}

export async function buildBsales() {
  const root = new URL("../", import.meta.url);
  const outputs = [
    [new URL("bsales/index.html", root), renderBsalesHub(bsalesContent)],
    [new URL("bsales/prompt-pack-1/index.html", root), renderBsalesPack(packOneContent)],
    [new URL("bsales/prompt-pack-2/index.html", root), renderBsalesPack(packTwoContent)],
  ];
  for (const [url, html] of outputs) {
    await mkdir(new URL("./", url), { recursive: true });
    await writeFile(url, html, "utf8");
  }
  return outputs.map(([url]) => fileURLToPath(url));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const output of await buildBsales()) console.log(`Built ${output}`);
}
