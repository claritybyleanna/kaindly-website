import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  renderBleadFacilitatorAccess,
  renderBleadFacilitatorDashboard,
} from "../scripts/build-blead-facilitator.mjs";
import {
  groupFacilitatorResponses,
  initializeFacilitatorDashboard,
  renderFacilitatorResponses,
  responseMatchesFilter,
} from "../assets/js/blead-facilitator.js";

const accessUrl = new URL("../Blead/facilitator/access/index.html", import.meta.url);
const dashboardUrl = new URL("../Blead/facilitator/index.html", import.meta.url);

test("legacy facilitator pages are deterministic noindex redirects without secrets", async () => {
  assert.equal(existsSync(accessUrl), true);
  assert.equal(existsSync(dashboardUrl), true);
  const access = await readFile(accessUrl, "utf8");
  const dashboard = await readFile(dashboardUrl, "utf8");

  for (const page of [access, dashboard]) {
    assert.match(page, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(page, /<meta http-equiv="refresh" content="0;url=\/dashboard\/">/);
    assert.match(page, /<a href="\/dashboard\/">/);
    assert.doesNotMatch(page, /<form|type="password"|blead-facilitator\.js/iu);
  }
  assert.doesNotMatch(`${access}${dashboard}`, /test-facilitator-password/iu);
  assert.equal(access, renderBleadFacilitatorAccess());
  assert.equal(dashboard, renderBleadFacilitatorDashboard());
});

test("legacy facilitator entry routes permanently redirect to the unified dashboard", async () => {
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "development";
  try {
    const { default: middleware } = await import("../middleware.js");
    for (const pathname of ["/Blead/facilitator/", "/Blead/facilitator/access/"]) {
      const response = await middleware(new Request(`https://www.kaindly.ai${pathname}`));
      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), "/dashboard/");
    }
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

const rows = [
  {
    participant_id: "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930",
    exercise_id: "prompt-02",
    exercise_number: 2,
    exercise_title: "The Before-and-After Test",
    fields: [],
    notes: "Second exercise",
    updated_at: "2026-10-07T15:01:00.000Z",
  },
  {
    participant_id: "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930",
    exercise_id: "prompt-01",
    exercise_number: 1,
    exercise_title: "The Master Prompt",
    fields: [{ id: "title", label: "Your title", value: "VP" }],
    notes: "First exercise",
    updated_at: "2026-10-07T15:00:00.000Z",
  },
  {
    participant_id: "11111111-1111-4111-8111-111111111111",
    exercise_id: "prompt-01",
    exercise_number: 1,
    exercise_title: "The Master Prompt",
    fields: [{ id: "title", label: "Your title", value: "Director" }],
    notes: "Older participant",
    updated_at: "2026-10-07T14:00:00.000Z",
  },
];

test("groups by anonymous participant and sorts by recency and prompt order", () => {
  const groups = groupFacilitatorResponses(rows);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].participantId, "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930");
  assert.deepEqual(groups[0].exercises.map(({ exerciseId }) => exerciseId), [
    "prompt-01",
    "prompt-02",
  ]);
  assert.equal(groups[0].lastUpdated, "2026-10-07T15:01:00.000Z");
});

test("filters by participant prefix, exercise title, and response text", () => {
  const [group] = groupFacilitatorResponses(rows);

  assert.equal(responseMatchesFilter(group, "75f6"), true);
  assert.equal(responseMatchesFilter(group, "before-and-after"), true);
  assert.equal(responseMatchesFilter(group, "First exercise"), true);
  assert.equal(responseMatchesFilter(group, "not present"), false);
});

class FakeNode {
  constructor(tagName, documentRoot) {
    this.tagName = tagName;
    this.ownerDocument = documentRoot;
    this.children = [];
    this.attributes = new Map();
    this.className = "";
    this.textValues = [];
  }

  set textContent(value) {
    this._textContent = String(value);
    this.textValues.push(this._textContent);
    this.ownerDocument.assignedText.push(this._textContent);
  }

  get textContent() { return this._textContent ?? ""; }
  set innerHTML(_) { throw new Error("innerHTML must not be used"); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
}

test("renders hostile response content only through textContent", () => {
  const documentRoot = {
    assignedText: [],
    createElement(tagName) { return new FakeNode(tagName, this); },
  };
  const root = new FakeNode("div", documentRoot);
  const hostile = "<img src=x onerror=alert(1)>";
  const groups = groupFacilitatorResponses([{ ...rows[0], notes: hostile }]);

  renderFacilitatorResponses(root, groups);

  assert.ok(documentRoot.assignedText.includes(hostile));
  assert.equal(root.children.length, 1);
});

function dashboardDocument() {
  const documentRoot = {
    assignedText: [],
    createElement(tagName) { return new FakeNode(tagName, this); },
  };
  const root = new FakeNode("div", documentRoot);
  const filter = { value: "", addEventListener() {} };
  const count = { textContent: "" };
  const loading = { hidden: true };
  const empty = { hidden: true };
  const error = { hidden: true };
  const retry = { addEventListener() {} };
  const nodes = new Map([
    ["[data-response-list]", root],
    ["[data-response-filter]", filter],
    ["[data-response-count]", count],
    ["[data-dashboard-loading]", loading],
    ["[data-dashboard-empty]", empty],
    ["[data-dashboard-error]", error],
    ["[data-dashboard-retry]", retry],
  ]);
  documentRoot.querySelector = (selector) => nodes.get(selector);
  return { documentRoot, error, loading };
}

test("dashboard redirects expired facilitator sessions and exposes fetch failures", async () => {
  const expired = dashboardDocument();
  const destinations = [];
  const expiredDashboard = initializeFacilitatorDashboard({
    documentRoot: expired.documentRoot,
    fetchImpl: async () => ({ status: 401, ok: false }),
    location: { assign: (value) => destinations.push(value) },
  });
  await expiredDashboard.ready;
  assert.deepEqual(destinations, [
    "/Blead/facilitator/access/?returnTo=/Blead/facilitator/",
  ]);
  assert.equal(expired.loading.hidden, true);

  const failed = dashboardDocument();
  const failedDashboard = initializeFacilitatorDashboard({
    documentRoot: failed.documentRoot,
    fetchImpl: async () => ({ status: 500, ok: false }),
    location: { assign() {} },
  });
  await failedDashboard.ready;
  assert.equal(failed.error.hidden, false);
  assert.equal(failed.loading.hidden, true);
});
