import assert from "node:assert/strict";
import test from "node:test";
import { getWorkbookRegistration } from "../lib/workbook-registry.js";
import { createWorkbookResponseStore } from "../lib/workbook-response-store.js";

const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const registration = getWorkbookRegistration("bracco-sales-pack-1");
const snapshot = {
  clientId: registration.client.id,
  programId: registration.program.id,
  workbookId: registration.workbook.id,
  participantId,
  exerciseId: "prompt-02",
  payload: {
    fields: { "field-01": "Regional Sales Director" },
    notes: "Use this during coaching",
  },
  deleteAfter: registration.deleteAfter,
};

function queryRecorder(rows = []) {
  const calls = [];
  const query = async (text, values = []) => {
    calls.push({ text, values });
    return rows;
  };
  return { calls, query };
}

test("upsert inserts every route-normalized identity and retention value", async () => {
  const returned = [{ participant_id: participantId, workbook_id: snapshot.workbookId }];
  const { calls, query } = queryRecorder(returned);
  const store = createWorkbookResponseStore(query);

  const rows = await store.upsert(snapshot);

  assert.match(calls[0].text, /INSERT INTO blead_workbook_responses/iu);
  assert.match(calls[0].text, /client_id,\s*program_id,\s*participant_id,\s*workbook_id,\s*exercise_id,\s*payload,\s*delete_after/iu);
  assert.match(calls[0].text, /ON CONFLICT \(participant_id, workbook_id, exercise_id\)/iu);
  assert.match(calls[0].text, /payload = EXCLUDED\.payload/iu);
  assert.match(calls[0].text, /updated_at = now\(\)/iu);
  assert.doesNotMatch(calls[0].text, /client_id = EXCLUDED\.client_id/iu);
  assert.doesNotMatch(calls[0].text, /program_id = EXCLUDED\.program_id/iu);
  assert.doesNotMatch(calls[0].text, /delete_after = EXCLUDED\.delete_after/iu);
  assert.deepEqual(calls[0].values, [
    snapshot.clientId,
    snapshot.programId,
    snapshot.participantId,
    snapshot.workbookId,
    snapshot.exerciseId,
    JSON.stringify(snapshot.payload),
    snapshot.deleteAfter,
  ]);
  assert.equal(rows, returned);
});

test("participant reads require a registration and scope all four identities", async () => {
  const { calls, query } = queryRecorder([]);
  const store = createWorkbookResponseStore(query);

  await assert.rejects(
    store.listByParticipant(participantId),
    /workbook registration/iu,
  );
  assert.equal(calls.length, 0);

  await store.listByParticipant(participantId, registration);

  assert.match(calls[0].text, /participant_id = \$1/iu);
  assert.match(calls[0].text, /client_id = \$2/iu);
  assert.match(calls[0].text, /program_id = \$3/iu);
  assert.match(calls[0].text, /workbook_id = \$4/iu);
  assert.deepEqual(calls[0].values, [
    participantId,
    registration.client.id,
    registration.program.id,
    registration.workbook.id,
  ]);
});

test("dashboard filters are parameterized and search only inspects payload text", async () => {
  const { calls, query } = queryRecorder([]);
  const store = createWorkbookResponseStore(query);

  await store.listDashboard({
    clientId: "bracco",
    workbookId: "bracco-sales-ai-brain",
    search: "coach' OR true --",
  });

  assert.match(calls[0].text, /client_id = \$1/iu);
  assert.match(calls[0].text, /workbook_id = \$2/iu);
  assert.match(calls[0].text, /payload::text ILIKE \$3/iu);
  assert.doesNotMatch(calls[0].text, /coach|OR true/iu);
  assert.deepEqual(calls[0].values, [
    "bracco",
    "bracco-sales-ai-brain",
    "%coach' OR true --%",
  ]);
});

test("dashboard list validates all supported identity and date filters", async () => {
  const { calls, query } = queryRecorder([]);
  const store = createWorkbookResponseStore(query);
  const filters = {
    clientId: "bracco",
    programId: "sales-ai-working-session",
    workbookId: "bracco-sales-chief-of-staff",
    exerciseId: "prompt-03",
    participantId,
    from: "2026-10-01T00:00:00.000Z",
    to: "2026-10-31T23:59:59.999Z",
  };

  await store.listDashboard(filters);

  assert.match(calls[0].text, /client_id = \$1/iu);
  assert.match(calls[0].text, /program_id = \$2/iu);
  assert.match(calls[0].text, /workbook_id = \$3/iu);
  assert.match(calls[0].text, /exercise_id = \$4/iu);
  assert.match(calls[0].text, /participant_id = \$5/iu);
  assert.match(calls[0].text, /updated_at >= \$6::timestamptz/iu);
  assert.match(calls[0].text, /updated_at <= \$7::timestamptz/iu);
  assert.deepEqual(calls[0].values, Object.values(filters));
});

test("invalid dashboard filters fail before any query runs", async (t) => {
  const cases = [
    [{ participantId: "not-a-uuid" }, /participant/iu],
    [{ from: "October sometime" }, /ISO/iu],
    [{ to: "2026-10-01" }, /ISO/iu],
    [{ clientId: "" }, /client/iu],
    [{ unexpected: "value" }, /unknown dashboard filter/iu],
  ];

  for (const [filters, expected] of cases) {
    await t.test(JSON.stringify(filters), async () => {
      const { calls, query } = queryRecorder([]);
      const store = createWorkbookResponseStore(query);
      await assert.rejects(store.listDashboard(filters), expected);
      assert.equal(calls.length, 0);
    });
  }
});

test("countDashboard counts workbook-scoped participant identities", async () => {
  const returned = [{ clients: 1, workbooks: 2, participants: 3, responses: 4 }];
  const { calls, query } = queryRecorder(returned);
  const store = createWorkbookResponseStore(query);

  const rows = await store.countDashboard({ programId: "sales-ai-working-session", search: "field ride" });

  assert.match(calls[0].text, /COUNT\(DISTINCT client_id\)::integer AS clients/iu);
  assert.match(calls[0].text, /COUNT\(DISTINCT workbook_id\)::integer AS workbooks/iu);
  assert.match(
    calls[0].text,
    /COUNT\(DISTINCT \(workbook_id, participant_id\)\)::integer AS participants/iu,
  );
  assert.match(calls[0].text, /COUNT\(\*\)::integer AS responses/iu);
  assert.match(calls[0].text, /program_id = \$1/iu);
  assert.match(calls[0].text, /payload::text ILIKE \$2/iu);
  assert.deepEqual(calls[0].values, ["sales-ai-working-session", "%field ride%"]);
  assert.equal(rows, returned);
});

test("deleteExpired uses only each row's own stored deadline", async () => {
  const returned = [{ participant_id: participantId }];
  const { calls, query } = queryRecorder(returned);
  const store = createWorkbookResponseStore(query);
  const now = new Date("2027-03-01T06:00:00.000Z");

  const rows = await store.deleteExpired(now);

  assert.match(calls[0].text, /DELETE FROM blead_workbook_responses/iu);
  assert.match(calls[0].text, /WHERE delete_after <= \$1::timestamptz/iu);
  assert.doesNotMatch(calls[0].text, /client_id|program_id|workbook_id/iu);
  assert.deepEqual(calls[0].values, [now.toISOString()]);
  assert.equal(rows, returned);
});

test("requires an injected query function", () => {
  assert.throws(() => createWorkbookResponseStore(), /query function/iu);
});
