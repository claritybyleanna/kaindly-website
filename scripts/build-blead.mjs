import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { bleadContent } from "../Blead/content.js";

const stateLabels = {
  available: "Assessment open",
  scheduled: "Scheduled",
  overview: "Overview available",
  upcoming: "Coming soon",
};

const resourceLabels = {
  available: "Available to download",
  external: "Assessment open",
  upcoming: "Coming soon",
  unavailable: "Temporarily unavailable",
};
const approvedAssessmentUrl = "https://diagnostic.kaindly.ai";
const approvedProtectedPages = new Set(["/Blead/session-1-prompts/"]);
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
const approvedAccessModes = new Set(["none", "download", "external", "page"]);

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

function assertApprovedAssessmentUrl(value, field) {
  if (value !== approvedAssessmentUrl) {
    throw new Error(`${field} must use the approved assessment destination`);
  }
}

function assertApprovedDownloadPath(value, field) {
  if (!/^\/Blead\/materials\/[a-z0-9][a-z0-9._-]*\.(?:pdf|pptx|docx|xlsx|zip)$/iu.test(value)) {
    throw new Error(`${field} must use an approved same-site download path`);
  }
}

function assertApprovedProtectedPage(value, field) {
  if (!approvedProtectedPages.has(value)) {
    throw new Error(`${field} must use an approved protected page`);
  }
}

function defaultDownloadExists(publicPath) {
  return existsSync(new URL(`..${publicPath}`, import.meta.url));
}

function assertApprovedEngagementDestination(value, field) {
  if (value === approvedAssessmentUrl) return;
  assertApprovedFragment(value, field);
}

export function validatePublicContent(content, { downloadExists = defaultDownloadExists } = {}) {
  if (content?.site?.intendedPath !== "/Blead/") {
    throw new Error("The protected route must preserve the exact /Blead/ casing");
  }
  if (!Array.isArray(content.weeks) || !Array.isArray(content.resources)) {
    throw new Error("Weeks and resources are required");
  }
  if (!content.weeks.every((week) => week.sample === false)) {
    throw new Error("Every engagement stage must be marked as participant-facing content");
  }
  if (!content.resources.every((resource) => resource.sample === false)) {
    throw new Error("Every engagement resource must be marked as participant-facing content");
  }
  for (const resource of content.resources) {
    if (!/^resource-[a-z0-9-]+$/u.test(resource.id) || !approvedResourceStates.has(resource.availability) || !approvedAccessModes.has(resource.accessMode)) {
      throw new Error("Resource IDs and states must use approved values");
    }
    if (resource.availability === "available") {
      if (resource.accessMode === "page") {
        assertApprovedProtectedPage(resource.publicUrl, "Interactive material destination");
      } else {
        if (resource.accessMode !== "download") throw new Error("An available material must use download or page access");
        if (!resource.publicUrl) throw new Error("An available material requires an approved download");
        assertApprovedDownloadPath(resource.publicUrl, "Material destination");
        if (!downloadExists(resource.publicUrl)) {
          throw new Error(`Material download file does not exist: ${resource.publicUrl}`);
        }
      }
    } else if (resource.availability === "external") {
      if (resource.accessMode !== "external") throw new Error("An external material must use external access");
      assertApprovedAssessmentUrl(resource.publicUrl, "External material destination");
    } else if (resource.publicUrl !== null || resource.accessMode !== "none") {
      throw new Error("Inactive materials cannot include an access destination");
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
  assertApprovedAssessmentUrl(content.site.assessment.href, "Assessment destination");
  for (const update of content.updates) {
    assertApprovedEngagementDestination(update.destination, "Update destination");
  }
  for (const link of content.site.policyLinks) {
    assertApprovedSameSitePath(link.href, "Policy destination");
  }

  const serialized = JSON.stringify(content);
  if (/@|Cosimo|Stephanie|Barbara|Leanna|participant name|assessment result|DocuSign|Scope of Work|\bSOW\b|\$|90,000/i.test(serialized)) {
    throw new Error("Content contains restricted contract or participant information");
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

function statusTone(state) {
  if (["available", "external"].includes(state)) return "positive";
  if (["upcoming", "unavailable"].includes(state)) return "neutral";
  return "";
}

function renderInlineResource(resource) {
  const tone = statusTone(resource.availability);
  const toneClass = tone ? ` blead-inline-resource--${tone}` : "";
  const title = resource.accessMode === "download"
    ? `<a href="${escapeHtml(resource.publicUrl)}" download>${escapeHtml(resource.title)}</a>`
    : ["external", "page"].includes(resource.accessMode)
      ? renderEngagementLink(resource.publicUrl, resource.title)
      : `<strong>${escapeHtml(resource.title)}</strong>`;
  return `<div class="blead-inline-resource${toneClass}" data-resource-state="${escapeHtml(resource.availability)}">${title}<span class="blead-inline-resource-status">${escapeHtml(resource.statusLabel || resourceLabels[resource.availability])}</span></div>`;
}

function renderWeek(week, resources) {
  const isOpen = week.order === 1;
  const tone = statusTone(week.state);
  const toneClass = tone ? ` blead-status--${tone}` : "";
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
    panelParts.push(`<section class="blead-week-detail"><h4>Materials</h4>${related.map(renderInlineResource).join("")}</section>`);
  }
  if (week.nextWeekId) {
    panelParts.push(`<p class="blead-next-week"><a href="#${escapeHtml(week.nextWeekId)}">Continue to the next stage</a></p>`);
  }

  const hasDetails = panelParts.length > 0;
  const disclosure = hasDetails ? `<button type="button" id="${escapeHtml(week.id)}-control" class="blead-accordion-control blead-enhanced-control" aria-expanded="${isOpen}" aria-controls="${escapeHtml(week.id)}-panel" data-accordion-control>
          <span data-accordion-label>${isOpen ? "Hide details" : "View details"}</span><span data-accordion-icon aria-hidden="true">+</span>
        </button>` : "";
  const panel = hasDetails ? `<div id="${escapeHtml(week.id)}-panel" class="blead-accordion-panel" aria-labelledby="${escapeHtml(week.id)}-heading" data-accordion-panel>${panelParts.join("")}</div>` : "";

  return `<article class="blead-week" id="${escapeHtml(week.id)}" data-week data-state="${escapeHtml(week.state)}">
    <div class="blead-week-summary">
      <div class="blead-week-copy">
        <span class="blead-week-label">${escapeHtml(week.label)}</span>
        <h3 id="${escapeHtml(week.id)}-heading">${escapeHtml(week.title)}</h3>
        <p>${escapeHtml(week.summary)}</p>
      </div>
      <div class="blead-week-actions">
        <span class="blead-status blead-status--${escapeHtml(week.state)}${toneClass}">${escapeHtml(week.statusLabel || stateLabels[week.state])}</span>
${disclosure ? `        ${disclosure}\n` : ""}      </div>
    </div>
${panel ? `    ${panel}\n` : ""}  </article>`;
}

function renderResource(resource) {
  const tone = statusTone(resource.availability);
  const toneClass = tone ? ` blead-resource--${tone}` : "";
  const resourceAction = resource.accessMode === "download"
    ? `    <a class="blead-resource-download" href="${escapeHtml(resource.publicUrl)}" download>Download material</a>\n`
    : resource.accessMode === "external"
      ? `    ${renderEngagementLink(resource.publicUrl, "Open assessment", { className: "blead-resource-download" })}\n`
      : resource.accessMode === "page"
        ? `    ${renderEngagementLink(resource.publicUrl, resource.actionLabel || "Open material", { className: "blead-resource-download" })}\n`
      : "";

  return `<article class="blead-resource${toneClass}" data-resource data-resource-state="${escapeHtml(resource.availability)}" data-resource-type="${escapeHtml(resource.type.toLowerCase().replaceAll(" ", "-"))}">
    <span class="blead-resource-type">${escapeHtml(resource.type)}</span>
    <h3>${escapeHtml(resource.title)}</h3>
    <p>${escapeHtml(resource.description)}</p>
    <span class="blead-resource-status">${escapeHtml(resource.statusLabel || resourceLabels[resource.availability])}</span>
${resourceAction}  </article>`;
}

function renderFaq(faq) {
  return `<article class="blead-faq" data-faq>
    <h3><span id="${escapeHtml(faq.id)}-heading">${escapeHtml(faq.question)}</span><button class="blead-faq-control blead-enhanced-control" type="button" id="${escapeHtml(faq.id)}-control" aria-label="Toggle answer: ${escapeHtml(faq.question)}" aria-expanded="false" aria-controls="${escapeHtml(faq.id)}-panel" data-accordion-control><span data-accordion-icon aria-hidden="true">+</span></button></h3>
    <div id="${escapeHtml(faq.id)}-panel" class="blead-accordion-panel" aria-labelledby="${escapeHtml(faq.id)}-heading" data-accordion-panel><p>${escapeHtml(faq.answer)}</p></div>
  </article>`;
}

function renderEngagementLink(destination, label, { showArrow = false, className = "" } = {}) {
  const external = destination === approvedAssessmentUrl;
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : "";
  const attributes = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  const arrow = showArrow ? ' <span aria-hidden="true">→</span>' : "";
  const newTabNote = external ? '<span class="sr-only"> (opens in a new tab)</span>' : "";
  return `<a${classAttribute} href="${escapeHtml(destination)}"${attributes}>${escapeHtml(label)}${arrow}${newTabNote}</a>`;
}

export function renderBleadPage(content, options = {}) {
  validatePublicContent(content, options);
  const { site } = content;
  const nav = renderNav(content);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bracco AI Leadership Accelerator | KAINDLY</title>
  <meta name="description" content="The protected Bracco AI Leadership Accelerator program hub.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/blead.css">
</head>
<body class="blead-page" id="top">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="blead-header" data-site-header>
    <div class="blead-shell blead-header-inner">
      <a class="blead-brand" href="/Blead/" aria-label="Bracco AI Leadership Accelerator home"><img src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY"></a>
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
          <p class="blead-kicker">${escapeHtml(site.assessment.label)}</p>
          <h2 id="next-step-title">${escapeHtml(site.assessment.title)}</h2>
          <p>${escapeHtml(site.assessment.description)}</p>
          ${renderEngagementLink(site.assessment.href, site.assessment.actionLabel, { showArrow: true })}
        </aside>
      </div>
    </section>

    <section class="blead-section" id="overview" aria-labelledby="overview-title">
      <div class="blead-shell">
        <p class="blead-kicker">Program overview</p>
        <h2 id="overview-title">One connected leadership experience</h2>
        <p class="blead-section-intro">${escapeHtml(site.overview)}</p>
        <div class="blead-theme-grid">${content.themes.map((theme) => `<article><span aria-hidden="true">0${content.themes.indexOf(theme) + 1}</span><h3>${escapeHtml(theme.title)}</h3><p>${escapeHtml(theme.body)}</p></article>`).join("")}</div>
        <div class="blead-how-to" id="how-to-use"><div><p class="blead-kicker">How to use this hub</p><h3>Four simple steps</h3></div><ol>${content.usageSteps.map((step) => `<li><span>${content.usageSteps.indexOf(step) + 1}</span>${escapeHtml(step)}</li>`).join("")}</ol></div>
      </div>
    </section>

    <section class="blead-section blead-section--tinted" id="program-plan" aria-labelledby="program-plan-title">
      <div class="blead-shell blead-plan-layout">
        <div class="blead-section-heading"><div><p class="blead-kicker">Program plan</p><h2 id="program-plan-title">Your engagement plan</h2></div><p>Open each stage to review its focus, preparation, and approved materials.</p></div>
        <div class="blead-week-list">${content.weeks.map((week) => renderWeek(week, content.resources)).join("")}</div>
      </div>
    </section>

    ${site.enabledModules.materials ? `<section class="blead-section" id="materials" aria-labelledby="materials-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Program materials</p><h2 id="materials-title">Downloadable resources</h2></div><p>Approved preparation, session, and follow-up materials will become downloadable here as the engagement progresses.</p></div><div class="blead-filter" aria-label="Filter program materials"><span>Show:</span><button type="button" aria-pressed="true" data-filter="all">All</button><button type="button" aria-pressed="false" data-filter="available">Available</button><button type="button" aria-pressed="false" data-filter="upcoming">Coming soon</button><button type="button" aria-pressed="false" data-filter="other">Other states</button><button class="blead-clear-filter" type="button" data-clear-filter>Clear filters</button><span class="blead-result-count" aria-live="polite" data-result-count>${content.resources.length} materials</span></div><div class="blead-resource-grid">${content.resources.map(renderResource).join("")}</div><div class="blead-empty-state" data-empty-state hidden><h3>No matching materials</h3><p>Try another filter or clear your filters.</p></div></div></section>` : ""}

    ${site.enabledModules.updates ? `<section class="blead-section blead-section--honey" id="updates" aria-labelledby="updates-title"><div class="blead-shell"><div class="blead-section-heading"><div><p class="blead-kicker">Program updates</p><h2 id="updates-title">What needs your attention</h2></div><p>Approved updates and reminders will appear here as the engagement progresses.</p></div>${content.updates.map((update) => `<article class="blead-update"><span>Action needed</span><div><h3>${escapeHtml(update.title)}</h3><p>${escapeHtml(update.body)}</p></div>${renderEngagementLink(update.destination, update.actionLabel)}</article>`).join("")}</div></section>` : ""}

    ${site.enabledModules.help ? `<section class="blead-section" id="help" aria-labelledby="help-title"><div class="blead-shell blead-help-layout"><div><p class="blead-kicker">Help and FAQ</p><h2 id="help-title">Questions about the hub</h2><p class="blead-section-intro">Find guidance about where to begin, materials, access, and support.</p></div><div class="blead-faq-list">${content.faqs.map(renderFaq).join("")}</div></div></section>` : ""}
  </main>

  <footer class="blead-footer"><div class="blead-shell blead-footer-grid"><div><img src="/assets/brand/logo-secondary-white.svg" alt="KAINDLY"><p>Bracco AI Leadership Accelerator</p></div><nav aria-label="Policies">${site.policyLinks.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("")}</nav><a href="#top">Back to top ↑</a></div></footer>
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
