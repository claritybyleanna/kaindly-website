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
