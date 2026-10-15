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
  groupDashboardResponses,
  initializeDashboard,
  loadDashboardResponses,
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

test("loads a bookmarked filter query before empty select controls can erase it", async () => {
  class Node {
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

  const form = new Node();
  form.elements = Object.fromEntries([
    "client", "program", "workbook", "exercise", "participant", "from", "to", "search",
  ].map((name) => [name, Object.assign(new Node(), { name })]));
  form.querySelectorAll = () => Object.values(form.elements).filter(({ name }) => (
    ["client", "program", "workbook", "exercise", "participant"].includes(name)
  ));
  const nodes = new Map([
    ["[data-dashboard-filters]", form],
    ["[data-dashboard-directory]", new Node()],
    ["[data-dashboard-responses]", new Node()],
    ["[data-dashboard-export]", new Node()],
    ["[data-dashboard-loading]", new Node()],
    ["[data-dashboard-empty]", new Node()],
    ["[data-dashboard-unauthorized]", new Node()],
    ["[data-dashboard-unavailable]", new Node()],
    ["[data-dashboard-clear]", new Node()],
    ["[data-dashboard-retry]", new Node()],
    ...["clients", "workbooks", "participants", "responses"].map((name) => (
      [`[data-summary-${name}]`, new Node()]
    )),
    ...Object.entries(form.elements).map(([name, node]) => (
      [`[data-dashboard-filter="${name}"]`, node]
    )),
  ]);
  const documentRef = {
    querySelector: (selector) => nodes.get(selector) ?? null,
    createElement: () => new Node(),
  };
  const requested = [];
  const dashboard = initializeDashboard({
    documentRef,
    historyRef: { replaceState() {} },
    locationRef: { pathname: "/dashboard/", search: "?client=bracco&workbook=bracco-sales-ai-brain" },
    formValuesReader: (target) => Object.fromEntries(
      Object.entries(target.elements).map(([name, control]) => [name, control.value]),
    ),
    fetchImpl: async (url) => {
      requested.push(url);
      return {
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
      };
    },
  });
  await dashboard.ready;

  assert.equal(requested[0], "/dashboard/api/responses?client=bracco&workbook=bracco-sales-ai-brain");
});
