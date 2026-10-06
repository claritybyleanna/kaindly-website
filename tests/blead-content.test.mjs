import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("sample content is public-safe and explicitly labeled", async () => {
  const { bleadContent } = await import("../Blead/content.js");

  assert.equal(bleadContent.site.title, "Leadership Learning Hub");
  assert.equal(bleadContent.site.intendedPath, "/Blead/");
  assert.deepEqual(
    bleadContent.weeks.map(({ state }) => state),
    ["available", "overview", "upcoming"],
  );
  assert.ok(bleadContent.weeks.every(({ sample }) => sample === true));
  assert.ok(
    bleadContent.resources.every(
      ({ sample, publicUrl }) => sample === true && publicUrl === null,
    ),
  );

  const serialized = JSON.stringify(bleadContent);
  assert.doesNotMatch(
    serialized,
    /@|202[0-9]|client|participant name|assessment result/i,
  );
  assert.doesNotMatch(
    serialized,
    /draft|editorial|approval|owner|privateUrl|publicationApproval/i,
  );
});

test("generated hub is semantic, accessible, and review-safe", async () => {
  const { bleadContent } = await import("../Blead/content.js");
  const { renderBleadPage } = await import("../scripts/build-blead.mjs");
  const html = renderBleadPage(bleadContent);

  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  for (const id of ["overview", "program-plan", "materials", "updates", "help"]) {
    assert.match(html, new RegExp(`<section[^>]+id="${id}"`));
  }
  assert.match(html, /Sample content for design review/);
  assert.match(html, />Available</);
  assert.match(html, />Overview available</);
  assert.match(html, />Coming soon</);
  assert.match(html, /aria-expanded="true"[^>]+aria-controls="week-01-panel"/);
  assert.match(html, /id="week-01-panel"[^>]+aria-labelledby="week-01-control"/);
  assert.match(html, /aria-expanded="false"[^>]+aria-controls="faq-start-panel"/);
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
    /rel="canonical"|newsletter|typeform|acuity|<iframe|analytics|marketing|TODO|TBD/i,
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
  const button = {
    attributes: new Map([
      ["aria-controls", "week-02-panel"],
      ["aria-expanded", "false"],
    ]),
    getAttribute(name) { return this.attributes.get(name); },
    setAttribute(name, value) { this.attributes.set(name, value); },
    querySelector(selector) { return selector === "[data-accordion-label]" ? label : null; },
    ownerDocument: { getElementById: (id) => id === "week-02-panel" ? panel : null },
  };

  setDisclosure(button, true);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(panel.hidden, false);
  assert.equal(label.textContent, "Hide details");
  setDisclosure(button, false);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(panel.hidden, true);

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

  const html = await readFile(new URL("../Blead/index.html", import.meta.url), "utf8");
  assert.match(html, /<script type="module" src="\/assets\/js\/blead\.js"/);
  assert.match(html, /aria-live="polite"[^>]+data-result-count/);
  assert.match(html, /data-clear-filter/);

  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id));
  const controlledIds = [...html.matchAll(/\baria-controls="([^"]+)"/g)].map(([, id]) => id);
  assert.ok(controlledIds.length >= 8);
  assert.ok(controlledIds.every((id) => ids.has(id)));
});
