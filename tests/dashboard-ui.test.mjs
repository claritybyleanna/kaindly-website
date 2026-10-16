import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  renderDashboardAccess,
  renderDashboardShell,
  renderDashboardVerification,
} from "../scripts/build-dashboard.mjs";
import {
  buildDashboardQuery,
  createResponseValue,
  filterParticipantOptions,
  filterRelationalDashboardOptions,
  groupDashboardResponses,
  initializeDashboard,
  loadDashboardResponses,
  reconcileDashboardFilterValues,
} from "../assets/js/dashboard.js";

const generatedPages = [
  ["dashboard", new URL("../dashboard/index.html", import.meta.url), renderDashboardShell],
  ["access", new URL("../dashboard/access/index.html", import.meta.url), renderDashboardAccess],
  ["verification", new URL("../dashboard/verify/index.html", import.meta.url), renderDashboardVerification],
];

test("builds deterministic branded private pages with one primary heading", async () => {
  for (const [name, url, render] of generatedPages) {
    assert.equal(existsSync(url), true, `${name} page is generated`);
    const saved = await readFile(url, "utf8");
    const first = render();
    const second = render();

    assert.equal(saved, first);
    assert.equal(first, second);
    assert.equal((first.match(/<h1(?:\s|>)/gu) ?? []).length, 1, `${name} has one h1`);
    assert.match(first, /<meta name="viewport" content="width=device-width, initial-scale=1">/u);
    assert.match(first, /<meta name="robots" content="noindex, nofollow">/u);
    assert.match(first, /(?:alt|aria-label)="KAINDLY/u);
    assert.match(first, /\/assets\/css\/dashboard\.css/u);
    assert.match(first, /\/assets\/js\/dashboard-auth\.js/u);
  }
});

test("generated authentication bundle is free of trailing build whitespace", async () => {
  const bundle = await readFile(new URL("../assets/js/dashboard-auth.js", import.meta.url), "utf8");
  assert.doesNotMatch(bundle, /[ \t]+$/mu);
});

test("dashboard access uses a six-digit email PIN without magic-link copy", () => {
  const access = renderDashboardAccess();
  const verification = renderDashboardVerification();

  assert.match(access, /data-dashboard-auth-code/u);
  assert.match(access, /autocomplete="one-time-code"/u);
  assert.match(access, /inputmode="numeric"/u);
  assert.match(access, /pattern="\[0-9\]\{6\}"/u);
  assert.match(access, /six-digit/u);
  assert.doesNotMatch(`${access}\n${verification}`, /magic link|sign-in link|secure link/iu);
});

test("dashboard shell exposes the complete facilitator workflow", () => {
  const html = renderDashboardShell();

  for (const summary of ["Clients", "Workbooks", "Participants", "Responses"]) {
    assert.match(html, new RegExp(`data-summary-${summary.toLowerCase()}`, "u"));
  }
  for (const filter of ["client", "program", "workbook", "exercise", "participant", "from", "to", "search"]) {
    assert.match(html, new RegExp(`name="${filter}"`, "u"));
  }
  for (const hook of [
    "data-dashboard-directory",
    "data-dashboard-responses",
    "data-dashboard-export",
    "data-dashboard-clear",
    "data-dashboard-loading",
    "data-dashboard-empty",
    "data-dashboard-unauthorized",
    "data-dashboard-unavailable",
    "data-dashboard-sign-out",
  ]) {
    assert.match(html, new RegExp(hook, "u"));
  }
  assert.match(html, /href="\/dashboard\/api\/export\.csv"/u);
  assert.match(html, /\/assets\/js\/dashboard\.js/u);
});

test("announces dashboard progress politely and failures assertively", () => {
  const html = renderDashboardShell();
  assert.match(html, /data-dashboard-loading role="status" aria-live="polite"/u);
  assert.match(html, /data-dashboard-empty role="status" aria-live="polite"/u);
  assert.match(html, /data-dashboard-unauthorized role="alert" aria-live="assertive"/u);
  assert.match(html, /data-dashboard-unavailable role="alert" aria-live="assertive"/u);
});

test("serializes one canonical query for screen data and CSV export", () => {
  const query = buildDashboardQuery({
    client: "bracco",
    program: "",
    workbook: "bracco-sales-ai-brain",
    exercise: "prompt-02",
    participant: "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930",
    from: "2026-10-01",
    to: "2026-10-15",
    search: "field ride",
    ignored: "must-not-leak",
  });

  assert.equal(
    query.toString(),
    "client=bracco&workbook=bracco-sales-ai-brain&exercise=prompt-02&participant=75f6c553-4bb4-4b3e-9a2a-ef29f1b64930&from=2026-10-01&to=2026-10-15&search=field+ride",
  );
  assert.equal(`/dashboard/api/responses?${query}`, `/dashboard/api/responses?${query.toString()}`);
  assert.equal(`/dashboard/api/export.csv?${query}`, `/dashboard/api/export.csv?${query.toString()}`);
});

test("groups anonymous participants inside each workbook and orders groups by latest activity", () => {
  const sharedId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
  const groups = groupDashboardResponses([
    {
      workbook: { id: "workbook-a", name: "Workbook A" },
      participantId: sharedId,
      exercise: { id: "one", number: 1, title: "One" },
      fields: [], notes: "Earlier", updatedAt: "2026-10-15T15:00:00.000Z",
    },
    {
      workbook: { id: "workbook-a", name: "Workbook A" },
      participantId: sharedId,
      exercise: { id: "two", number: 2, title: "Two" },
      fields: [], notes: "Latest", updatedAt: "2026-10-15T17:00:00.000Z",
    },
    {
      workbook: { id: "workbook-b", name: "Workbook B" },
      participantId: sharedId,
      exercise: { id: "one", number: 1, title: "One" },
      fields: [], notes: "Middle", updatedAt: "2026-10-15T16:00:00.000Z",
    },
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].workbook.id, "workbook-a");
  assert.deepEqual(groups[0].responses.map(({ exercise }) => exercise.id), ["two", "one"]);
  assert.equal(groups[1].workbook.id, "workbook-b");
});

test("offers participant IDs only after their exact workbook is selected", () => {
  const options = [
    { id: "one", workbookId: "workbook-a" },
    { id: "two", workbookId: "workbook-b" },
  ];

  assert.deepEqual(filterParticipantOptions(options, ""), []);
  assert.deepEqual(filterParticipantOptions(options, "workbook-b"), [
    { id: "two", workbookId: "workbook-b" },
  ]);
});

function dashboardRelationalFilters() {
  return {
    clients: [{ id: "client-a", name: "Client A" }, { id: "client-b", name: "Client B" }],
    programs: [
      { id: "program-a", name: "Program A", clientId: "client-a" },
      { id: "program-b", name: "Program B", clientId: "client-b" },
    ],
    workbooks: [
      { id: "workbook-a", name: "Workbook A", clientId: "client-a", programId: "program-a" },
      { id: "workbook-b", name: "Workbook B", clientId: "client-b", programId: "program-b" },
    ],
    exercises: [
      { id: "exercise-a", title: "Exercise A", workbookId: "workbook-a" },
      { id: "exercise-b", title: "Exercise B", workbookId: "workbook-b" },
      { id: "shared", title: "Shared in A", workbookId: "workbook-a" },
      { id: "shared", title: "Shared in B", workbookId: "workbook-b" },
    ],
    participants: [
      { id: "participant-a", workbookId: "workbook-a" },
      { id: "participant-b", workbookId: "workbook-b" },
    ],
  };
}

test("clears incompatible descendants and exposes only relational filter options", () => {
  const filters = dashboardRelationalFilters();

  assert.deepEqual(reconcileDashboardFilterValues({
    client: "client-a",
    program: "program-b",
    workbook: "workbook-b",
    exercise: "exercise-b",
    participant: "participant-b",
    search: "coaching",
  }, filters), {
    client: "client-a",
    search: "coaching",
  });

  assert.deepEqual(reconcileDashboardFilterValues({
    client: "client-a",
    exercise: "shared",
  }, filters), {
    client: "client-a",
    exercise: "shared",
  });

  const compatible = filterRelationalDashboardOptions(filters, {
    client: "client-a",
    program: "program-a",
    workbook: "workbook-a",
  });
  assert.deepEqual(compatible.programs.map(({ id }) => id), ["program-a"]);
  assert.deepEqual(compatible.workbooks.map(({ id }) => id), ["workbook-a"]);
  assert.deepEqual(compatible.exercises.map(({ id }) => id), ["exercise-a", "shared"]);
  assert.deepEqual(compatible.participants.map(({ id }) => id), ["participant-a"]);
});

test("renders hostile participant content through textContent without HTML parsing", () => {
  const fakeDocument = {
    innerHtmlWrites: 0,
    createElement(tagName) {
      return {
        tagName,
        children: [],
        append(...nodes) { this.children.push(...nodes); },
        set textContent(value) { this._textContent = String(value); },
        get textContent() { return this._textContent ?? ""; },
        set innerHTML(_) { fakeDocument.innerHtmlWrites += 1; },
      };
    },
  };
  const hostile = '<img src=x onerror="alert(1)">';
  const node = createResponseValue(fakeDocument, hostile);

  assert.equal(node.textContent, hostile);
  assert.equal(fakeDocument.innerHtmlWrites, 0);
});

test("maps loading failures to private access or retryable unavailable states", async () => {
  const calls = [];
  const unauthorized = await loadDashboardResponses({
    query: new URLSearchParams("client=bracco"),
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { status: 401, ok: false };
    },
  });
  assert.deepEqual(unauthorized, { kind: "unauthorized" });
  assert.deepEqual(calls, [[
    "/dashboard/api/responses?client=bracco",
    { credentials: "same-origin", headers: { Accept: "application/json" } },
  ]]);

  const unavailable = await loadDashboardResponses({
    query: new URLSearchParams(),
    fetchImpl: async () => ({ status: 503, ok: false }),
  });
  assert.deepEqual(unavailable, { kind: "unavailable" });

  const empty = await loadDashboardResponses({
    query: new URLSearchParams(),
    fetchImpl: async () => ({
      status: 200,
      ok: true,
      async json() {
        return {
          summary: { clients: 0, workbooks: 0, participants: 0, responses: 0 },
          directory: [],
          filters: { clients: [], programs: [], workbooks: [], exercises: [], participants: [] },
          responses: [],
        };
      },
    }),
  });
  assert.equal(empty.kind, "empty");
});

class DashboardTestNode {
  constructor() {
    this.children = [];
    this.value = "";
    this.hidden = false;
    this.listeners = new Map();
  }

  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this[name] = String(value); }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  set textContent(value) { this._textContent = String(value); }
  get textContent() { return this._textContent ?? ""; }
  reset() { for (const control of Object.values(this.elements ?? {})) control.value = ""; }
}

function dashboardTestHarness() {
  const form = new DashboardTestNode();
  form.elements = Object.fromEntries([
    "client", "program", "workbook", "exercise", "participant", "from", "to", "search",
  ].map((name) => [name, Object.assign(new DashboardTestNode(), { name })]));
  form.querySelectorAll = () => Object.values(form.elements).filter(({ name }) => (
    ["client", "program", "workbook", "exercise", "participant"].includes(name)
  ));
  const nodes = new Map([
    ["[data-dashboard-filters]", form],
    ["[data-dashboard-directory]", new DashboardTestNode()],
    ["[data-dashboard-responses]", new DashboardTestNode()],
    ["[data-dashboard-export]", new DashboardTestNode()],
    ["[data-dashboard-loading]", new DashboardTestNode()],
    ["[data-dashboard-empty]", new DashboardTestNode()],
    ["[data-dashboard-unauthorized]", new DashboardTestNode()],
    ["[data-dashboard-unavailable]", new DashboardTestNode()],
    ["[data-dashboard-clear]", new DashboardTestNode()],
    ["[data-dashboard-retry]", new DashboardTestNode()],
    ...["clients", "workbooks", "participants", "responses"].map((name) => (
      [`[data-summary-${name}]`, new DashboardTestNode()]
    )),
    ...Object.entries(form.elements).map(([name, node]) => (
      [`[data-dashboard-filter="${name}"]`, node]
    )),
  ]);
  const documentRef = {
    querySelector: (selector) => nodes.get(selector) ?? null,
    createElement: () => new DashboardTestNode(),
  };
  return {
    documentRef,
    form,
    nodes,
    formValuesReader: (target) => Object.fromEntries(
      Object.entries(target.elements).map(([name, control]) => [name, control.value]),
    ),
  };
}

function emptyDashboardPayload(responseCount = 0) {
  return {
    summary: { clients: 0, workbooks: 0, participants: 0, responses: responseCount },
    directory: [],
    filters: { clients: [], programs: [], workbooks: [], exercises: [], participants: [] },
    responses: [],
  };
}

function relationalDashboardPayload() {
  return {
    ...emptyDashboardPayload(),
    filters: dashboardRelationalFilters(),
  };
}

test("loads a bookmarked filter query before empty select controls can erase it", async () => {
  const { documentRef, formValuesReader } = dashboardTestHarness();
  const requested = [];
  const dashboard = initializeDashboard({
    documentRef,
    historyRef: { replaceState() {} },
    locationRef: { pathname: "/dashboard/", search: "?client=bracco&workbook=bracco-sales-ai-brain" },
    formValuesReader,
    fetchImpl: async (url) => {
      requested.push(url);
      return {
        status: 200,
        ok: true,
        async json() {
          return emptyDashboardPayload();
        },
      };
    },
  });
  await dashboard.ready;

  assert.equal(requested[0], "/dashboard/api/responses?client=bracco&workbook=bracco-sales-ai-brain");
});

test("a slower earlier request cannot overwrite the newest dashboard state", async () => {
  const { documentRef, form, nodes, formValuesReader } = dashboardTestHarness();
  const requests = [];
  const fetchImpl = (url, options) => new Promise((resolve) => requests.push({ url, options, resolve }));
  const dashboard = initializeDashboard({
    documentRef,
    historyRef: { replaceState() {} },
    locationRef: { pathname: "/dashboard/", search: "" },
    formValuesReader,
    fetchImpl,
  });

  form.elements.search.value = "newest";
  form.listeners.get("submit")({ preventDefault() {} });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.signal.aborted, true);

  requests[1].resolve({ status: 200, ok: true, async json() { return emptyDashboardPayload(2); } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(nodes.get("[data-summary-responses]").textContent, "2");

  requests[0].resolve({ status: 200, ok: true, async json() { return emptyDashboardPayload(1); } });
  await dashboard.ready;
  assert.equal(nodes.get("[data-summary-responses]").textContent, "2");
  assert.equal(nodes.get("[data-dashboard-loading]").hidden, true);
});

test("normal filter changes clear incompatible descendants before requesting data", async () => {
  const { documentRef, form, formValuesReader } = dashboardTestHarness();
  const requested = [];
  const dashboard = initializeDashboard({
    documentRef,
    historyRef: { replaceState() {} },
    locationRef: { pathname: "/dashboard/", search: "" },
    formValuesReader,
    fetchImpl: async (url) => {
      requested.push(url);
      return { status: 200, ok: true, async json() { return relationalDashboardPayload(); } };
    },
  });
  await dashboard.ready;

  form.elements.client.value = "client-a";
  form.elements.program.value = "program-b";
  form.elements.workbook.value = "workbook-b";
  form.elements.exercise.value = "exercise-b";
  form.elements.participant.value = "participant-b";
  form.elements.search.value = "coaching";
  form.elements.client.listeners.get("change")();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(form.elements.program.value, "");
  assert.equal(form.elements.workbook.value, "");
  assert.equal(form.elements.exercise.value, "");
  assert.equal(form.elements.participant.value, "");
  assert.equal(requested.at(-1), "/dashboard/api/responses?client=client-a&search=coaching");
});
