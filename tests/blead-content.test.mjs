import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Bracco engagement content is role-based and limited to approved program facts", async () => {
  const { bleadContent } = await import("../Blead/content.js");

  assert.equal(bleadContent.site.title, "AI Leadership Accelerator");
  assert.equal(bleadContent.site.descriptor, "BRACCO");
  assert.equal(bleadContent.site.intendedPath, "/Blead/");
  assert.deepEqual(bleadContent.site.assessment, {
    label: "Before Session 1",
    title: "Complete your AI Readiness Assessment",
    description: "Each participant should complete the assessment before the first cohort session on October 7, 2026.",
    actionLabel: "Take the AI Readiness Assessment",
    href: "https://diagnostic.kaindly.ai",
  });
  assert.deepEqual(
    bleadContent.weeks.map(({ state }) => state),
    ["available", "scheduled", "upcoming", "upcoming", "upcoming", "upcoming"],
  );
  assert.deepEqual(bleadContent.weeks.map(({ title }) => title), [
    "Kickoff, readiness, and discovery",
    "Personal AI proficiency",
    "Team workflows and enablement",
    "Evaluation and judgment",
    "Stewardship and leadership",
    "Leadership closeout",
  ]);
  assert.equal(bleadContent.usageSteps[3], "Check program updates for changes.");
  assert.ok(bleadContent.weeks.every(({ sample }) => sample === false));
  assert.ok(bleadContent.resources.every(({ sample }) => sample === false));
  assert.deepEqual(bleadContent.resources[0], {
    id: "resource-kickoff",
    type: "Assessment",
    title: "AI Readiness Assessment",
    description: "Complete the assessment before the first cohort session on October 7, 2026.",
    weekId: "week-01",
    availability: "external",
    accessMode: "external",
    publicUrl: "https://diagnostic.kaindly.ai",
    sample: false,
  });
  assert.equal(bleadContent.resources.some(({ type, title }) => /recording/i.test(`${type} ${title}`)), false);

  const serialized = JSON.stringify(bleadContent);
  assert.doesNotMatch(
    serialized,
    /@|Cosimo|Stephanie|Barbara|Leanna|participant name|assessment result|DocuSign|Scope of Work|\bSOW\b|\$|90,000/i,
  );
  assert.doesNotMatch(
    serialized,
    /draft|editorial|approval|owner|privateUrl|publicationApproval/i,
  );
});

test("Blead generator rejects hostile or malformed destinations", async () => {
  const { bleadContent } = await import("../Blead/content.js");
  const { renderBleadPage } = await import("../scripts/build-blead.mjs");

  const hostileAssessment = structuredClone(bleadContent);
  hostileAssessment.site.assessment.href = "https://attacker.example/assessment";
  assert.throws(() => renderBleadPage(hostileAssessment), /approved assessment/);

  const hostileDownload = structuredClone(bleadContent);
  hostileDownload.resources[1].availability = "available";
  hostileDownload.resources[1].accessMode = "download";
  hostileDownload.resources[1].publicUrl = "https://attacker.example/material.pdf";
  assert.throws(() => renderBleadPage(hostileDownload), /same-site download/);

  const hostileExternalMaterial = structuredClone(bleadContent);
  hostileExternalMaterial.resources[0].publicUrl = "https://attacker.example/assessment";
  assert.throws(() => renderBleadPage(hostileExternalMaterial), /approved assessment/);

  const scriptedPolicy = structuredClone(bleadContent);
  scriptedPolicy.site.policyLinks[0].href = "javascript:alert(1)";
  assert.throws(() => renderBleadPage(scriptedPolicy), /same-site/);

  const unknownFragment = structuredClone(bleadContent);
  unknownFragment.updates[0].destination = "#not-a-section";
  assert.throws(() => renderBleadPage(unknownFragment), /approved fragment/);
});

test("approved same-site materials render as real downloads only when available", async () => {
  const { bleadContent } = await import("../Blead/content.js");
  const { renderBleadPage } = await import("../scripts/build-blead.mjs");

  const downloadable = structuredClone(bleadContent);
  downloadable.resources[1].availability = "available";
  downloadable.resources[1].accessMode = "download";
  downloadable.resources[1].publicUrl = "/Blead/materials/program-overview.pdf";
  assert.throws(
    () => renderBleadPage(downloadable),
    /download file does not exist/,
  );

  const html = renderBleadPage(downloadable, {
    downloadExists: (publicPath) => publicPath === "/Blead/materials/program-overview.pdf",
  });
  assert.match(html, /<a[^>]+class="blead-resource-download"[^>]+href="\/Blead\/materials\/program-overview\.pdf"[^>]+download[^>]*>Download material<\/a>/);

  const missingFile = structuredClone(downloadable);
  missingFile.resources[1].publicUrl = null;
  assert.throws(() => renderBleadPage(missingFile), /available material requires an approved download/);
});

test("generated hub is semantic, accessible, and review-safe", async () => {
  const { bleadContent } = await import("../Blead/content.js");
  const { renderBleadPage } = await import("../scripts/build-blead.mjs");
  const html = renderBleadPage(bleadContent);

  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  for (const id of ["overview", "program-plan", "materials", "updates", "help"]) {
    assert.match(html, new RegExp(`<section[^>]+id="${id}"`));
  }
  assert.match(html, /BRACCO/);
  assert.match(html, /AI Leadership Accelerator/);
  assert.match(html, /October 7, 2026/);
  assert.match(html, /href="https:\/\/diagnostic\.kaindly\.ai"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/);
  assert.match(html, /<h4>Materials<\/h4>[\s\S]*?<a[^>]+href="https:\/\/diagnostic\.kaindly\.ai"[^>]+>AI Readiness Assessment/);
  assert.match(html, /<a[^>]+class="blead-resource-download"[^>]+href="https:\/\/diagnostic\.kaindly\.ai"[^>]+>Open assessment/);
  assert.match(html, />Assessment open</);
  assert.match(html, />October 7, 2026</);
  assert.match(html, />Coming soon</);
  assert.match(html, /class="blead-status blead-status--available blead-status--positive">Assessment open<\/span>/);
  assert.match(html, /class="blead-status blead-status--upcoming blead-status--neutral">To be scheduled<\/span>/);
  assert.match(html, /class="blead-inline-resource blead-inline-resource--positive"[^>]*>[\s\S]*?class="blead-inline-resource-status">Assessment open<\/span>/);
  assert.match(html, /class="blead-inline-resource blead-inline-resource--neutral"[^>]*>[\s\S]*?class="blead-inline-resource-status">Coming soon<\/span>/);
  assert.match(html, /class="blead-resource blead-resource--positive"[^>]*data-resource-state="external"/);
  assert.match(html, /class="blead-resource blead-resource--neutral"[^>]*data-resource-state="upcoming"/);
  assert.match(html, /aria-expanded="true"[^>]+aria-controls="week-01-panel"/);
  assert.match(html, /id="week-01-panel"[^>]+aria-labelledby="week-01-heading"/);
  assert.match(html, /aria-expanded="false"[^>]+aria-controls="faq-start-panel"/);
  assert.match(html, /class="blead-accordion-control blead-enhanced-control"/);
  assert.match(html, /class="blead-faq-control blead-enhanced-control"/);
  assert.match(html, /data-accordion-icon aria-hidden="true">\+</);
  assert.match(html, /href="\/privacy\/"/);
  assert.match(html, /href="\/terms\/"/);
  assert.match(html, /action="\/Blead\/logout\/"/);

  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>/g)].map(
    ([, href]) => href,
  );
  assert.ok(anchors.length > 0);
  assert.ok(anchors.every((href) => href && href !== "#"));
  assert.doesNotMatch(html, /<a\b[^>]+data-resource-state="(?:upcoming|unavailable|external)"/);
  assert.doesNotMatch(
    html,
    /Sample content|Prototype component|Session recording|Open recording|rel="canonical"|newsletter|typeform|acuity|<iframe|analytics|marketing|TODO|TBD/i,
  );
});

test("the committed Blead page matches a deterministic build", async () => {
  const { bleadContent } = await import("../Blead/content.js");
  const { renderBleadPage } = await import("../scripts/build-blead.mjs");
  const committed = await readFile(new URL("../Blead/index.html", import.meta.url), "utf8");

  assert.equal(committed, renderBleadPage(bleadContent));
});

test("Blead interactions keep disclosures, deep links, and filters accessible", async () => {
  const {
    openDeepLinkedWeek,
    resourceMatches,
    setDisclosure,
  } = await import("../assets/js/blead.js");

  const panel = { hidden: true };
  const label = { textContent: "View details" };
  const icon = { textContent: "+" };
  const button = {
    attributes: new Map([
      ["aria-controls", "week-02-panel"],
      ["aria-expanded", "false"],
    ]),
    getAttribute(name) { return this.attributes.get(name); },
    setAttribute(name, value) { this.attributes.set(name, value); },
    querySelector(selector) {
      if (selector === "[data-accordion-label]") return label;
      if (selector === "[data-accordion-icon]") return icon;
      return null;
    },
    ownerDocument: { getElementById: (id) => id === "week-02-panel" ? panel : null },
  };

  setDisclosure(button, true);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(panel.hidden, false);
  assert.equal(label.textContent, "Hide details");
  assert.equal(icon.textContent, "−");
  setDisclosure(button, false);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(panel.hidden, true);
  assert.equal(icon.textContent, "+");

  const deepPanel = { hidden: true };
  let scrolled = false;
  const deepButton = {
    getAttribute: (name) => name === "aria-controls" ? "week-03-panel" : "false",
    setAttribute() {},
    querySelector() { return null; },
    ownerDocument: { getElementById: () => deepPanel },
  };
  const week = {
    querySelector: () => deepButton,
    scrollIntoView: () => { scrolled = true; },
  };
  const root = { getElementById: (id) => id === "week-03" ? week : null };
  assert.equal(openDeepLinkedWeek("#week-03", root), true);
  assert.equal(deepPanel.hidden, false);
  assert.equal(scrolled, true);
  assert.equal(openDeepLinkedWeek("#week-03<script>", root), false);
  assert.equal(openDeepLinkedWeek("#help", root), false);

  const resource = {
    dataset: { resourceState: "available", resourceType: "guide" },
    textContent: "Learning guide Key ideas and reflection prompts",
  };
  assert.equal(resourceMatches(resource, "", "all"), true);
  assert.equal(resourceMatches(resource, "reflection", "guide"), true);
  assert.equal(resourceMatches(resource, "slides", "guide"), false);
  assert.equal(resourceMatches(resource, "learning", "gui"), false);

  const externalResource = {
    dataset: { resourceState: "external", resourceType: "assessment" },
    textContent: "AI Readiness Assessment Assessment open",
  };
  assert.equal(resourceMatches(externalResource, "", "available"), true);
  assert.equal(resourceMatches(externalResource, "", "other"), false);

  const html = await readFile(new URL("../Blead/index.html", import.meta.url), "utf8");
  assert.match(html, /<script type="module" src="\/assets\/js\/blead\.js"/);
  assert.match(html, /aria-live="polite"[^>]+data-result-count/);
  assert.match(html, /data-clear-filter/);

  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id));
  const controlledIds = [...html.matchAll(/\baria-controls="([^"]+)"/g)].map(([, id]) => id);
  assert.ok(controlledIds.length >= 8);
  assert.ok(controlledIds.every((id) => ids.has(id)));
  const script = await readFile(new URL("../assets/js/blead.js", import.meta.url), "utf8");
  assert.match(script, /event\.preventDefault\(\)/);
  assert.match(script, /focusMenuDestination\(documentRoot, link\)/);
});

test("Blead stylesheet preserves the KAINDLY system and narrow reflow", async () => {
  const css = await readFile(new URL("../assets/css/blead.css", import.meta.url), "utf8");
  const accessCss = await readFile(new URL("../assets/css/blead-access.css", import.meta.url), "utf8");
  const html = await readFile(new URL("../Blead/index.html", import.meta.url), "utf8");

  assert.match(html, /href="\/assets\/css\/blead\.css"/);
  assert.match(css, /--blead-violet:\s*#634cc8/i);
  assert.match(css, /--blead-surface:\s*#fff(?:fff)?/i);
  assert.match(css, /--blead-radius:\s*5px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\[id\][^{]*\{[^}]*scroll-margin-top:/s);
  assert.match(css, /\.blead-(?:accordion-control|menu-button)[^{]*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.blead-js\s+\.blead-accordion-panel\[hidden\][^{]*\{[^}]*display:\s*none/s);
  assert.match(css, /\.blead-enhanced-control[^{]*\{[^}]*display:\s*none/s);
  assert.match(css, /\.blead-js\s+\.blead-enhanced-control[^{]*\{[^}]*display:\s*inline-flex/s);
  assert.match(css, /\.blead-status[^{]*\{[^}]*white-space:\s*normal/s);
  assert.match(css, /\.blead-status--positive,[\s\S]*?\.blead-resource--positive \.blead-resource-status\s*\{[^}]*background:\s*var\(--blead-status-green-bg\)[^}]*color:\s*var\(--blead-status-green-text\)/s);
  assert.match(css, /\.blead-status--neutral,[\s\S]*?\.blead-resource--neutral \.blead-resource-status\s*\{[^}]*background:\s*var\(--blead-status-gray-bg\)[^}]*color:\s*var\(--blead-status-gray-text\)/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media\s*\(max-width:\s*360px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*scroll-behavior:\s*auto\s*!important/);
  assert.match(accessCss, /:focus-visible/);
});
