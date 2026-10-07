import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promptPackContent } from "../Blead/session-1-prompts/content.js";

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

function renderField(promptId, field) {
  const id = `${promptId}-${field.id}`;
  const shared = `id="${escapeHtml(id)}" data-prompt-field="${escapeHtml(field.id)}" data-prompt-token="${escapeHtml(field.token)}" placeholder="${escapeHtml(field.placeholder)}" autocomplete="off"`;
  const control = field.multiline
    ? `<textarea ${shared} rows="4"></textarea>`
    : `<input ${shared} type="text">`;
  return `<label class="blead-prompt-field" for="${escapeHtml(id)}"><span>${escapeHtml(field.label)}</span>${control}</label>`;
}

function renderExample(prompt) {
  return `<aside class="blead-prompt-example" aria-label="See it in action">
    <p class="blead-prompt-example-label">See it in action</p>
    <p class="blead-prompt-example-intro">${escapeHtml(prompt.exampleIntro)}</p>
    ${prompt.exampleParts.map((part) => `<div><h4>${escapeHtml(part.label)}</h4><p>${escapeHtml(part.text)}</p></div>`).join("")}
  </aside>`;
}

function renderPrompt(prompt) {
  const number = String(prompt.number).padStart(2, "0");
  const fields = prompt.fields.length
    ? `<section class="blead-prompt-personalize" aria-labelledby="${escapeHtml(prompt.id)}-personalize"><h4 id="${escapeHtml(prompt.id)}-personalize">Personalize this prompt</h4><p>Fill in your details. Blank fields keep the original bracketed guidance.</p><div class="blead-prompt-fields">${prompt.fields.map((field) => renderField(prompt.id, field)).join("")}</div></section>`
    : "";

  return `<article class="blead-prompt-card" id="${escapeHtml(prompt.id)}" data-prompt-card data-prompt-id="${escapeHtml(prompt.id)}">
    <header class="blead-prompt-card-header">
      <div><span class="blead-prompt-number">Prompt ${number}</span><h3>${escapeHtml(prompt.title)}</h3></div>
      <div class="blead-prompt-meta"><p><strong>Use it when:</strong> ${escapeHtml(prompt.useWhen)}</p><p><strong>Time:</strong> ${escapeHtml(prompt.time)}</p></div>
    </header>
    <details class="blead-prompt-exercise"${prompt.number <= 2 ? " open" : ""}>
      <summary><span>Open exercise</span><span aria-hidden="true">+</span></summary>
      <div class="blead-prompt-exercise-body">
        ${fields}
        <section class="blead-prompt-copy" aria-labelledby="${escapeHtml(prompt.id)}-copy-title">
          <div class="blead-prompt-copy-heading"><h4 id="${escapeHtml(prompt.id)}-copy-title">Copy this prompt</h4><button type="button" data-copy-prompt>Copy Prompt</button></div>
          <textarea hidden data-prompt-template aria-hidden="true" tabindex="-1">${escapeHtml(prompt.prompt)}</textarea>
          <pre tabindex="0" data-prompt-preview>${escapeHtml(prompt.prompt)}</pre>
          <p class="blead-prompt-status" role="status" aria-live="polite" data-copy-status></p>
        </section>
        ${renderExample(prompt)}
        <p class="blead-prompt-tip"><strong>Tip:</strong> ${escapeHtml(prompt.tip)}</p>
        <label class="blead-prompt-notes"><span>Your private notes</span><textarea rows="4" data-prompt-notes placeholder="Capture what you want to remember from this exercise."></textarea><small>Saved only in this browser on this device.</small><span class="blead-prompt-status" role="status" aria-live="polite" data-note-status></span></label>
      </div>
    </details>
  </article>`;
}

export function renderBleadPromptPack(content) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Build Your AI Brain | Bracco AI Leadership Accelerator</title>
  <meta name="description" content="Interactive Session 1 Microsoft Copilot prompt workbook for the Bracco AI Leadership Accelerator.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/blead.css">
  <link rel="stylesheet" href="/assets/css/blead-prompts.css">
</head>
<body class="blead-page blead-prompts-page" id="top">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="blead-header" data-site-header>
    <div class="blead-shell blead-header-inner">
      <a class="blead-brand" href="/Blead/" aria-label="Bracco AI Leadership Accelerator home"><img src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY"></a>
      <button class="blead-menu-button" type="button" aria-expanded="false" aria-controls="blead-navigation" data-menu-button><span>Menu</span><span aria-hidden="true">☰</span></button>
      <nav id="blead-navigation" class="blead-navigation" aria-label="Session 1 workbook" data-menu><a href="/Blead/">Program hub</a><a href="#getting-started">Getting started</a><a href="#prompts">Prompts</a><a href="#after-today">After today</a></nav>
      <form class="blead-logout" method="post" action="/Blead/logout/"><button type="submit">End session</button></form>
    </div>
  </header>

  <main id="main-content">
    <section class="blead-prompts-hero" aria-labelledby="prompt-pack-title">
      <div class="blead-shell">
        <p class="blead-eyebrow">${escapeHtml(content.eyebrow)}</p>
        <h1 id="prompt-pack-title">${escapeHtml(content.title)}</h1>
        <p class="blead-prompts-subtitle">${escapeHtml(content.subtitle)}</p>
        <div class="blead-prompts-intro">${content.introduction.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
        <a class="blead-button blead-button--primary" href="#getting-started">Choose your path</a>
      </div>
    </section>

    <section class="blead-section" id="getting-started" aria-labelledby="getting-started-title">
      <div class="blead-shell">
        <p class="blead-kicker">Before you start</p>
        <h2 id="getting-started-title">Two paths to the same result</h2>
        <p class="blead-section-intro">Either way, run Prompt 2 first and keep the answer. It is your Before.</p>
        <div class="blead-path-grid">${content.paths.map((path) => `<article><h3>${escapeHtml(path.name)}</h3><dl><div><dt>Prompts</dt><dd>${escapeHtml(path.prompts)}</dd></div><div><dt>Time</dt><dd>${escapeHtml(path.time)}</dd></div><div><dt>Best for</dt><dd>${escapeHtml(path.bestFor)}</dd></div><div><dt>You end with</dt><dd>${escapeHtml(path.outcome)}</dd></div></dl><a href="${escapeHtml(path.href)}">Start this path <span aria-hidden="true">→</span></a></article>`).join("")}</div>
        <div class="blead-prompt-foundations">
          <div><h3>How every prompt is built</h3><p>Each prompt follows a light version of the CRAFT structure: Role, Context, Action, Format and Tone. Fill in the editable fields, review the completed prompt, then copy it into Copilot.</p></div>
          <div><h3>Three habits to keep</h3><ul>${content.habits.map((habit) => `<li><strong>${escapeHtml(habit.title)}</strong> ${escapeHtml(habit.body)}</li>`).join("")}</ul></div>
        </div>
        <p class="blead-example-note"><strong>About the examples:</strong> every See It In Action example uses Jordan Patel, a fictional VP of Commercial Analytics. Your answers will look different, which is the point.</p>
      </div>
    </section>

    <section class="blead-section blead-section--tinted" id="prompts" aria-labelledby="prompts-title">
      <div class="blead-shell">
        <div class="blead-section-heading"><div><p class="blead-kicker">Session 1 workbook</p><h2 id="prompts-title">Build your AI operating system</h2></div><p>Open an exercise, complete any personalization fields, then copy the finished prompt into Microsoft Copilot.</p></div>
        <div class="blead-prompt-list">${content.prompts.map(renderPrompt).join("")}</div>
      </div>
    </section>

    <section class="blead-section" id="after-today" aria-labelledby="after-today-title">
      <div class="blead-shell blead-after-today">
        <div><p class="blead-kicker">After today</p><h2 id="after-today-title">Keep your AI operating system current</h2></div>
        <div class="blead-after-list">${content.afterToday.map((item) => `<div><strong>${escapeHtml(item.when)}</strong><span>${escapeHtml(item.action)}</span></div>`).join("")}</div>
      </div>
    </section>
  </main>

  <footer class="blead-footer"><div class="blead-shell blead-footer-grid"><div><img src="/assets/brand/logo-secondary-white.svg" alt="KAINDLY"><p>Bracco AI Leadership Accelerator</p></div><nav aria-label="Workbook links"><a href="/Blead/">Program hub</a><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Service</a></nav><a href="#top">Back to top ↑</a></div></footer>
  <script type="module" src="/assets/js/blead.js"></script>
  <script type="module" src="/assets/js/blead-prompts.js"></script>
</body>
</html>
`;
}

const outputUrl = new URL("../Blead/session-1-prompts/index.html", import.meta.url);
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await writeFile(outputUrl, renderBleadPromptPack(promptPackContent), "utf8");
  console.log(`Built ${fileURLToPath(outputUrl)}`);
}
