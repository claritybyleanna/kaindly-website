import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { bleadContent } from "../Blead/content.js";

const stateLabels = {
  available: "Available",
  overview: "Overview available",
  upcoming: "Coming soon",
};

const resourceLabels = {
  available: "Available for review",
  upcoming: "Coming soon",
  unavailable: "Temporarily unavailable",
  external: "External authorized resource",
};
const approvedSectionFragments = new Set([
  "#overview",
  "#program-plan",
  "#materials",
  "#updates",
  "#help",
  "#how-to-use",
]);
const approvedPolicyPaths = new Set(["/privacy/", "/terms/"]);
const approvedWeekStates = new Set(Object.keys(stateLabels));
const approvedResourceStates = new Set(Object.keys(resourceLabels));

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

function assertApprovedFragment(value, field) {
  if (!approvedSectionFragments.has(value)) {
    throw new Error(`${field} must use an approved fragment`);
  }
}

function assertApprovedSameSitePath(value, field) {
  if (!approvedPolicyPaths.has(value)) {
    throw new Error(`${field} must use an approved same-site path`);
  }
}

export function validatePublicContent(content) {
  if (content?.site?.intendedPath !== "/Blead/") {
    throw new Error("The protected route must preserve the exact /Blead/ casing");
  }
  if (!Array.isArray(content.weeks) || !Array.isArray(content.resources)) {
    throw new Error("Weeks and resources are required");
  }
  if (!content.weeks.every((week) => week.sample === true)) {
    throw new Error("Every prototype week must be labeled as sample content");
  }
  if (!content.resources.every((resource) => resource.sample === true)) {
    throw new Error("Every prototype resource must be labeled as sample content");
  }
  for (const resource of content.resources) {
    if (!/^resource-[a-z0-9-]+$/u.test(resource.id) || !approvedResourceStates.has(resource.availability)) {
      throw new Error("Resource IDs and states must use approved values");
    }
    if (resource.publicUrl !== null) {
      throw new Error("Prototype resources cannot include a live destination");
    }
  }
  const weekIds = new Set(content.weeks.map(({ id }) => id));
  if (weekIds.size !== content.weeks.length || content.weeks.some(({ id, state }) => !/^week-[0-9]{2}$/u.test(id) || !approvedWeekStates.has(state))) {
    throw new Error("Week IDs and states must use approved values");
  }
  for (const week of content.weeks) {
    if (week.nextWeekId && !weekIds.has(week.nextWeekId)) throw new Error("Next week must reference a known week ID");
    if (week.resources.some((id) => !content.resources.some((resource) => resource.id === id))) {
      throw new Error("Week resources must reference known resource IDs");
    }
  }
  assertApprovedFragment(content.site.nextStep.destination, "Next-step destination");
  for (const update of content.updates) {
    assertApprovedFragment(update.destination, "Update destination");
  }
  for (const link of content.site.policyLinks) {
    assertApprovedSameSitePath(link.href, "Policy destination");
  }

  const serialized = JSON.stringify(content);
  if (/@|202[0-9]|participant name|assessment result/i.test(serialized)) {
    throw new Error("Content contains information that is not public-safe");
  }
  if (/privateUrl|publicationApproval|editorialNotes|reviewNotes/i.test(serialized)) {
    throw new Error("Editorial or private fields cannot enter the public model");
  }
  return content;
}

function renderNav(content) {
  const items = [
    ["Overview", "#overview"],
    ["Program plan", "#program-plan"],
    ...(content.site.enabledModules.materials ? [["Materials", "#materials"]] : []),
    ...(content.site.enabledModules.updates ? [["Updates", "#updates"]] : []),
    ...(content.site.enabledModules.help ? [["Help", "#help"]] : []),
  ];
  return items.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("\n");
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderWeek(week, resources) {
  const isOpen = week.order === 1;
  const panelParts = [];
  if (week.focus) {
    panelParts.push(`<section class="blead-week-detail"><h4>Focus</h4><p>${escapeHtml(week.focus)}</p></section>`);
  }
  if (week.objectives?.length) {
    panelParts.push(`<section class="blead-week-detail"><h4>What you will explore</h4>${renderList(week.objectives)}</section>`);
  }
  if (week.preparation) {
    panelParts.push(`<section class="blead-week-detail"><h4>Before the session</h4><p>${escapeHtml(week.preparation)}</p></section>`);
  }
  if (week.reflection) {
    panelParts.push(`<section class="blead-week-detail"><h4>After the session</h4><p>${escapeHtml(week.reflection)}</p></section>`);
  }
  const related = resources.filter((resource) => week.resources.includes(resource.id));
  if (related.length) {
    panelParts.push(`<section class="blead-week-detail"><h4>Materials</h4>${related.map((resource) => `<div class="blead-inline-resource"><strong>${escapeHtml(resource.title)}</strong><span>${escapeHtml(resourceLabels[resource.availability])}</span></div>`).join("")}</section>`);
  }
  if (week.nextWeekId) {
    panelParts.push(`<p class="blead-next-week"><a href="#${escapeHtml(week.nextWeekId)}">Continue to the next sample week</a></p>`);
  }

  const hasDetails = panelParts.length > 0;
  const disclosure = hasDetails ? `<button type="button" id="${escapeHtml(week.id)}-control" class="blead-accordion-control blead-enhanced-control" aria-expanded="${isOpen}" aria-controls="${escapeHtml(week.id)}-panel" data-accordion-control>
          <span data-accordion-label>${isOpen ? "Hide details" : "View details"}</span><span data-accordion-icon aria-hidden="true">+</span>
        </button>` : "";
  const panel = hasDetails ? `<div id="${escapeHtml(week.id)}-panel" class="blead-accordion-panel" aria-labelledby="${escapeHtml(week.id)}-heading" data-accordion-panel>${panelParts.join("")}</div>` : "";

  return `<article class="blead-week" id="${escapeHtml(week.id)}" data-week data-state="${escapeHtml(week.state)}">
    <div class="blead-week-summary">
      <div class="blead-week-copy">
        <span class="blead-week-label">${escapeHtml(week.label)} · Sample</span>
        <h3 id="${escapeHtml(week.id)}-heading">${escapeHtml(week.title)}</h3>
        <p>${escapeHtml(week.summary)}</p>
      </div>
      <div class="blead-week-actions">
        <span class="blead-status blead-status--${escapeHtml(week.state)}">${escapeHtml(stateLabels[week.state])}</span>
${disclosure ? `        ${disclosure}\n` : ""}      </div>
    </div>
${panel ? `    ${panel}\n` : ""}  </article>`;
}

function renderResource(resource) {
  const accessNote = resource.accessNote
    ? `    <p class="blead-access-note">${escapeHtml(resource.accessNote)}</p>\n`
    : "";
  const demoAction = resource.availability === "external"
    ? `    <button class="blead-resource-demo" type="button" disabled aria-disabled="true">Open recording</button>\n`
    : "";

  return `<article class="blead-resource" data-resource data-resource-state="${escapeHtml(resource.availability)}" data-resource-type="${escapeHtml(resource.type.toLowerCase().replaceAll(" ", "-"))}">
    <span class="blead-resource-type">${escapeHtml(resource.type)} · Sample</span>
    <h3>${escapeHtml(resource.title)}</h3>
    <p>${escapeHtml(resource.description)}</p>
${accessNote}    <span class="blead-resource-status">${escapeHtml(resourceLabels[resource.availability])}</span>
${demoAction}  </article>`;
}

function renderFaq(faq) {
  return `<article class="blead-faq" data-faq>
    <h3><span id="${escapeHtml(faq.id)}-heading">${escapeHtml(faq.question)}</span><button class="blead-faq-control blead-enhanced-control" type="button" id="${escapeHtml(faq.id)}-control" aria-label="Toggle answer: ${escapeHtml(faq.question)}" aria-expanded="false" aria-controls="${escapeHtml(faq.id)}-panel" data-accordion-control><span data-accordion-icon aria-hidden="true">+</span></button></h3>
    <div id="${escapeHtml(faq.id)}-panel" class="blead-accordion-panel" aria-labelledby="${escapeHtml(faq.id)}-heading" data-accordion-panel><p>${escapeHtml(faq.answer)}</p></div>
  </article>`;
}

export function renderBleadPage(content) {
  validatePublicContent(content);
  const { site } = content;
  const nav = renderNav(content);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Leadership Learning Hub Prototype | KAINDLY</title>
  <meta name="description" content="A public-safe design review of the KAINDLY Leadership Learning Hub experience.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/blead.css">
</head>
<body class="blead-page" id="top">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="blead-header" data-site-header>
    <div class="blead-shell blead-header-inner">
      <a class="blead-brand" href="/Blead/" aria-label="KAINDLY Leadership Learning Hub home"><img src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY"></a>
      <button class="blead-menu-button" type="button" aria-expanded="false" aria-controls="blead-navigation" data-menu-button><span>Menu</span><span aria-hidden="true">☰</span></button>
      <nav id="blead-navigation" class="blead-navigation" aria-label="Learning hub" data-menu>${nav}</nav>
      <form class="blead-logout" method="post" action="/Blead/logout/"><button type="submit">End session</button></form>
    </div>
  </header>
  <main id="main-content">
    <section class="blead-hero" aria-labelledby="blead-title">
      <div class="blead-shell blead-hero-grid">
        <div class="blead-hero-copy">
          <p class="blead-eyebrow">${escapeHtml(site.descriptor)}</p>
          <h1 id="blead-title">${escapeHtml(site.title)}</h1>
          <p class="blead-hero-intro">${escapeHtml(site.heroBody)}</p>
          <div class="blead-actions"><a class="blead-button blead-button--primary" href="#program-plan">View the program plan</a><a class="blead-button blead-button--secondary" href="#how-to-use">How to use this hub</a></div>
          <p class="blead-supporting-line">${escapeHtml(site.supportingLine)}</p>
        </div>
        <aside class="blead-next-step" aria-labelledby="next-step-title">
          <p class="blead-kicker">${escapeHtml(site.nextStep.label)}</p>
          <h2 id="next-step-title">${escapeHtml(site.nextStep.title)}</h2>
          <p>${escapeHtml(site.nextStep.description)}</p>
          <a href="${escapeHtml(site.nextStep.destination)}">${escapeHtml(site.nextStep.actionLabel)} <span aria-hidden="true">→</span></a>
        </aside>
      </div>
    </section>

    <section class="blead-section" id="overview" aria-labelledby="overview-title">
      <div class="blead-shell">
        <p class="blead-kicker">Program overview</p>
        <h2 id="overview-title">A clear place to learn, reflect, and apply</h2>
        <p class="blead-section-intro">${escapeHtml(site.overview)}</p>
        <div class="blead-theme-grid">${content.themes.map((theme) => `<article><span aria-hidden="true">0${content.themes.indexOf(theme) + 1}</span><h3>${escapeHtml(theme.title)}</h3><p>${escapeHtml(theme.body)}</p></article>`).join("")}</div>
        <div class="blead-how-to" id="how-to-use"><div><p class="blead-kicker">How to use this hub</p><h3>Four simple steps</h3></div><ol>${content.usageSteps.map((step) => `<li><span>${content.usageSteps.indexOf(step) + 1}</span>${escapeHtml(step)}</li>`).join("")}</ol></div>
      </div>
    </section>

    <section class="blead-section blead-section--tinted" id="program-plan" aria-labelledby="program-plan-title">
      <div class="blead-shell blead-plan-layout">
        <div class="blead-section-heading"><div><p class="blead-kicker">Program plan</p><h2 id="program-plan-title">Explore the weekly outline</h2></div><p>Open a sample week to see how the future learning plan can organize approved information and materials.</p></div>
        <div class="blead-sample-notice" role="note"><strong>Sample content for design review</strong><span>These fictional examples demonstrate layout and content states. They are not an approved schedule or curriculum.</span></div>
        <div class="blead-week-list">${content.weeks.map((week) => renderWeek(week, content.resources)).join("")}</div>
      </div>
    </section>

    ${site.enabledModules.materials ? `<section class="blead-section" id="materials" aria-labelledby="materials-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Prototype component examples</p><h2 id="materials-title">Sample material states</h2></div><p>This review-only area shows how different availability states could appear. Its actions are intentionally inactive.</p></div><div class="blead-filter" aria-label="Filter sample materials"><span>Show:</span><button type="button" aria-pressed="true" data-filter="all">All</button><button type="button" aria-pressed="false" data-filter="available">Available</button><button type="button" aria-pressed="false" data-filter="upcoming">Coming soon</button><button type="button" aria-pressed="false" data-filter="other">Other states</button><button class="blead-clear-filter" type="button" data-clear-filter>Clear filters</button><span class="blead-result-count" aria-live="polite" data-result-count>${content.resources.length} sample materials</span></div><div class="blead-resource-grid">${content.resources.map(renderResource).join("")}</div><div class="blead-empty-state" data-empty-state hidden><h3>No matching materials</h3><p>Try another filter or clear your filters.</p></div></div></section>` : ""}

    ${site.enabledModules.updates ? `<section class="blead-section blead-section--honey" id="updates" aria-labelledby="updates-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Program updates</p><h2 id="updates-title">A place for approved changes</h2></div><p>Updates appear here only when there is useful, approved information to share.</p></div>${content.updates.map((update) => `<article class="blead-update"><span>Sample update</span><div><h3>${escapeHtml(update.title)}</h3><p>${escapeHtml(update.body)}</p></div><a href="${escapeHtml(update.destination)}">${escapeHtml(update.actionLabel)}</a></article>`).join("")}<div class="blead-empty-example"><strong>When there is no update</strong><p>This section can be removed until useful information is ready.</p></div></div></section>` : ""}

    ${site.enabledModules.help ? `<section class="blead-section" id="help" aria-labelledby="help-title"><div class="blead-shell blead-help-layout"><div><p class="blead-kicker">Help and FAQ</p><h2 id="help-title">Questions about the hub</h2><p class="blead-section-intro">Find guidance about where to begin, materials, access, and support.</p></div><div class="blead-faq-list">${content.faqs.map(renderFaq).join("")}</div></div></section>` : ""}
  </main>

  <footer class="blead-footer"><div class="blead-shell blead-footer-grid"><div><img src="/assets/brand/logo-secondary-white.svg" alt="KAINDLY"><p>Leadership Learning Hub</p></div><nav aria-label="Policies">${site.policyLinks.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("")}</nav><a href="#top">Back to top ↑</a></div></footer>
  <script type="module" src="/assets/js/site.js"></script>
  <script type="module" src="/assets/js/blead.js"></script>
</body>
</html>
`;
}

const outputUrl = new URL("../Blead/index.html", import.meta.url);
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await writeFile(outputUrl, renderBleadPage(bleadContent), "utf8");
  console.log(`Built ${fileURLToPath(outputUrl)}`);
}
