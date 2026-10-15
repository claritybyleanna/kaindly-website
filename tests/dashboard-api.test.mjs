import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { listWorkbookRegistrations } from "../lib/workbook-registry.js";

const NOW = new Date("2026-10-15T18:00:00.000Z");
const PARTICIPANT_ONE = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const PARTICIPANT_TWO = "cb0e95c0-427e-4b42-9bf2-89d91fbdb0ba";

function rawRow({
  workbookId = "bracco-sales-ai-brain",
  exerciseId = "prompt-02",
  participantId = PARTICIPANT_ONE,
  updatedAt = "2026-10-15T17:30:00.000Z",
  payload = { fields: { "field-01": "Regional Sales Director" }, notes: "Coach the field ride" },
} = {}) {
  const registration = listWorkbookRegistrations().find(({ workbook }) => workbook.id === workbookId);
  return {
    client_id: registration.client.id,
    program_id: registration.program.id,
    workbook_id: workbookId,
    participant_id: participantId,
    exercise_id: exerciseId,
    payload,
    created_at: "2026-10-15T17:00:00.000Z",
    updated_at: updatedAt,
    delete_after: registration.deleteAfter,
  };
}

function dashboardStore({ filteredRows = [], allRows = filteredRows, summary } = {}) {
  const calls = [];
  return {
    calls,
    async listDashboard(filters) {
      calls.push(["listDashboard", filters]);
      return Object.keys(filters).length ? filteredRows : allRows;
    },
    async countDashboard(filters) {
      calls.push(["countDashboard", filters]);
      return [summary ?? { clients: 1, workbooks: 1, participants: 1, responses: filteredRows.length }];
    },
  };
}

async function modules() {
  return import("../lib/workbook-response-api.js");
}

test("dashboard authorization fails before filter parsing or store access", async (t) => {
  const { createDashboardHandlers } = await modules();
  for (const [name, identity] of [
    ["missing session", null],
    ["wrong email", null],
    ["unverified email", null],
    ["expired session", null],
  ]) {
    await t.test(name, async () => {
      const store = dashboardStore();
      const handlers = createDashboardHandlers({
        authorize: async () => identity,
        store,
        registry: listWorkbookRegistrations(),
        now: () => NOW,
      });
      const response = await handlers.GET(new Request(
        "https://www.kaindly.ai/dashboard/api/responses?participant=not-a-uuid",
      ));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "Authentication required" });
      assert.deepEqual(store.calls, []);
    });
  }
});

test("parseDashboardFilters maps exact public filters to store filters", async () => {
  const { parseDashboardFilters } = await modules();
  const parsed = parseDashboardFilters(new URL(
    `https://www.kaindly.ai/dashboard/api/responses?client=bracco&program=sales-ai-working-session&workbook=bracco-sales-ai-brain&exercise=prompt-02&participant=${PARTICIPANT_ONE}&from=2026-10-01&to=2026-10-15&search=%20field%20ride%20`,
  ), listWorkbookRegistrations());

  assert.deepEqual(parsed, {
    clientId: "bracco",
    programId: "sales-ai-working-session",
    workbookId: "bracco-sales-ai-brain",
    exerciseId: "prompt-02",
    participantId: PARTICIPANT_ONE,
    from: "2026-10-01T00:00:00.000Z",
    to: "2026-10-15T23:59:59.999Z",
    search: "field ride",
  });
});

test("parseDashboardFilters uses the immutable server registry by default", async () => {
  const { parseDashboardFilters } = await modules();
  assert.deepEqual(parseDashboardFilters(
    "https://www.kaindly.ai/dashboard/api/responses?workbook=mclendon-working-smarter",
  ), { workbookId: "mclendon-working-smarter" });
});

test("parseDashboardFilters rejects unknown, duplicate, malformed, and unregistered filters", async (t) => {
  const { parseDashboardFilters } = await modules();
  const cases = [
    ["unknown query key", "wat=value", /unknown dashboard filter/iu],
    ["duplicate query key", "client=bracco&client=bracco", /duplicate dashboard filter/iu],
    ["unknown client", "client=other", /unknown client/iu],
    ["unknown program", "program=other", /unknown program/iu],
    ["unknown workbook", "workbook=other", /unknown workbook/iu],
    ["unknown exercise", "exercise=other", /unknown exercise/iu],
    ["invalid participant", "participant=not-a-uuid", /participant/iu],
    ["invalid from date", "from=2026-02-30", /from/iu],
    ["invalid to date", "to=tomorrow", /to/iu],
    ["reversed date range", "from=2026-10-16&to=2026-10-15", /date range/iu],
    ["empty search", "search=%20%20", /search/iu],
  ];

  for (const [name, query, expected] of cases) {
    await t.test(name, () => assert.throws(
      () => parseDashboardFilters(
        new URL(`https://www.kaindly.ai/dashboard/api/responses?${query}`),
        listWorkbookRegistrations(),
      ),
      expected,
    ));
  }
});

test("JSON dashboard returns summary, every registered workbook, filter choices, and formatted rows", async () => {
  const { createDashboardHandlers } = await modules();
  const filteredRows = [rawRow()];
  const allRows = [
    rawRow(),
    rawRow({
      workbookId: "bracco-sales-chief-of-staff",
      exerciseId: "prompt-01",
      participantId: PARTICIPANT_TWO,
      updatedAt: "2026-10-15T17:45:00.000Z",
      payload: { fields: {}, notes: "Prepare the coaching conversation" },
    }),
  ];
  const store = dashboardStore({
    filteredRows,
    allRows,
    summary: { clients: 1, workbooks: 1, participants: 1, responses: 1 },
  });
  const handlers = createDashboardHandlers({
    authorize: async () => ({ email: "leanna.baker@kaindly.ai" }),
    store,
    registry: listWorkbookRegistrations(),
    now: () => NOW,
  });

  const response = await handlers.GET(new Request(
    "https://www.kaindly.ai/dashboard/api/responses?workbook=bracco-sales-ai-brain",
  ));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.summary, { clients: 1, workbooks: 1, participants: 1, responses: 1 });
  assert.equal(body.directory.length, listWorkbookRegistrations().length);
  assert.deepEqual(body.directory.find(({ workbook }) => workbook.id === "bracco-sales-ai-brain"), {
    client: { id: "bracco", name: "Bracco" },
    program: { id: "sales-ai-working-session", name: "Sales Team AI Working Session" },
    workbook: { id: "bracco-sales-ai-brain", name: "Demystifying AI and Your AI Brain" },
    hubUrl: "/bsales/",
    responseCount: 1,
    latestActivity: "2026-10-15T17:30:00.000Z",
    deleteAfter: "2027-03-01T06:00:00.000Z",
    expired: false,
  });
  const zero = body.directory.find(({ workbook }) => workbook.id === "mclendon-working-smarter");
  assert.equal(zero.responseCount, 0);
  assert.equal(zero.latestActivity, null);
  assert.equal(zero.expired, false);
  assert.ok(body.filters.clients.some(({ id }) => id === "bracco"));
  assert.ok(body.filters.programs.some(({ id }) => id === "sales-ai-working-session"));
  assert.ok(body.filters.workbooks.some(({ id }) => id === "bracco-sales-ai-brain"));
  assert.ok(body.filters.exercises.some(({ id, workbookId }) => id === "prompt-02" && workbookId === "bracco-sales-ai-brain"));
  assert.deepEqual(body.filters.participants, [PARTICIPANT_ONE]);
  assert.deepEqual(body.responses[0], {
    client: { id: "bracco", name: "Bracco" },
    program: { id: "sales-ai-working-session", name: "Sales Team AI Working Session" },
    workbook: { id: "bracco-sales-ai-brain", name: "Demystifying AI and Your AI Brain" },
    participantId: PARTICIPANT_ONE,
    exercise: { id: "prompt-02", number: 2, title: "The CRAFT-I Coaching Prompt" },
    fields: [{ id: "field-01", label: "YOUR ROLE", value: "Regional Sales Director" }],
    notes: "Coach the field ride",
    createdAt: "2026-10-15T17:00:00.000Z",
    updatedAt: "2026-10-15T17:30:00.000Z",
    deleteAfter: "2027-03-01T06:00:00.000Z",
  });
  assert.deepEqual(store.calls, [
    ["countDashboard", { workbookId: "bracco-sales-ai-brain" }],
    ["listDashboard", { workbookId: "bracco-sales-ai-brain" }],
    ["listDashboard", {}],
  ]);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("directory marks expired registrations using the injected request clock", async () => {
  const { createDashboardHandlers } = await modules();
  const store = dashboardStore({ filteredRows: [], allRows: [] });
  const handlers = createDashboardHandlers({
    authorize: async () => ({}),
    store,
    registry: listWorkbookRegistrations(),
    now: () => new Date("2027-03-01T06:00:00.000Z"),
  });
  const body = await (await handlers.GET(new Request("https://www.kaindly.ai/dashboard/api/responses"))).json();
  assert.ok(body.directory.every(({ expired }) => expired === true));
});

test("CSV export uses exactly the active filters and safe private headers", async () => {
  const { createDashboardHandlers } = await modules();
  const row = rawRow({ payload: { fields: { "field-01": "=WEBSERVICE(\"bad\")" }, notes: "Only this row" } });
  const store = dashboardStore({ filteredRows: [row] });
  const handlers = createDashboardHandlers({
    authorize: async () => ({}),
    store,
    registry: listWorkbookRegistrations(),
    now: () => NOW,
  });
  const response = await handlers.EXPORT(new Request(
    "https://www.kaindly.ai/dashboard/api/export.csv?client=bracco&workbook=bracco-sales-ai-brain&search=Only",
  ));
  const csv = await response.text();

  assert.equal(response.status, 200);
  assert.deepEqual(store.calls, [["listDashboard", {
    clientId: "bracco",
    workbookId: "bracco-sales-ai-brain",
    search: "Only",
  }]]);
  assert.match(csv, /Demystifying AI and Your AI Brain/u);
  assert.match(csv, /"'=WEBSERVICE\(""bad""\)"/u);
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="kaindly-facilitator-responses-2026-10-15.csv"');
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("invalid filters and store failures fail closed without leaking response text", async () => {
  const logged = [];
  const store = dashboardStore();
  store.listDashboard = async () => { throw new Error("SECRET RESPONSE BODY"); };
  const { createDashboardHandlers } = await modules();
  const handlers = createDashboardHandlers({
    authorize: async () => ({}),
    store,
    registry: listWorkbookRegistrations(),
    logger: { error: (...values) => logged.push(values) },
    requestId: () => "request-123",
  });

  const invalid = await handlers.GET(new Request(
    "https://www.kaindly.ai/dashboard/api/responses?workbook=unknown",
  ));
  assert.equal(invalid.status, 400);
  assert.deepEqual(store.calls, []);

  const failed = await handlers.EXPORT(new Request("https://www.kaindly.ai/dashboard/api/export.csv"));
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: "Unable to export responses" });
  assert.doesNotMatch(JSON.stringify(logged), /SECRET RESPONSE BODY/u);
  assert.deepEqual(logged, [["workbook_response_api_error", {
    category: "dashboard_database_export",
    requestId: "request-123",
  }]]);
});

test("physical dashboard functions authorize independently before database configuration", async () => {
  const environment = [
    "CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "DASHBOARD_ALLOWED_EMAIL",
    "DASHBOARD_AUTHORIZED_ORIGINS",
    "DATABASE_URL",
  ];
  const previous = Object.fromEntries(environment.map((key) => [key, process.env[key]]));
  for (const key of environment) delete process.env[key];
  try {
    const responses = await import(`../api/dashboard-responses.js?test=${Date.now()}`);
    const exportApi = await import(`../api/dashboard-export.js?test=${Date.now()}`);
    assert.equal((await responses.GET(new Request("https://www.kaindly.ai/api/dashboard-responses"))).status, 401);
    assert.equal((await exportApi.GET(new Request("https://www.kaindly.ai/api/dashboard-export"))).status, 401);
  } finally {
    for (const key of environment) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("Vercel routes both pretty dashboard endpoints to independently protected functions", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(config.rewrites.some(({ source, destination }) => (
    source === "/dashboard/api/responses" && destination === "/api/dashboard-responses"
  )));
  assert.ok(config.rewrites.some(({ source, destination }) => (
    source === "/dashboard/api/export.csv" && destination === "/api/dashboard-export"
  )));
});
