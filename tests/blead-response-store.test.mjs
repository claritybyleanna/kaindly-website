import assert from "node:assert/strict";
import test from "node:test";
import {
  BLEAD_DELETE_AFTER,
  BLEAD_WORKBOOK_ID,
} from "../lib/blead-response-domain.js";
import { createBleadResponseStore } from "../lib/blead-response-store.js";

const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const snapshot = {
  participantId,
  workbookId: BLEAD_WORKBOOK_ID,
  exerciseId: "prompt-01",
  payload: {
    fields: { title: "VP", team: "Analytics" },
    notes: "Try this next week",
  },
};

function queryRecorder(rows = []) {
  const calls = [];
  const query = async (text, values = []) => {
    calls.push({ text, values });
    return rows;
  };
  return { calls, query };
}

test("upserts one snapshot per participant and exercise", async () => {
  const { calls, query } = queryRecorder([{
    participant_id: participantId,
    workbook_id: BLEAD_WORKBOOK_ID,
    exercise_id: "prompt-01",
  }]);
  const store = createBleadResponseStore(query);

  const rows = await store.upsert(snapshot);

  assert.match(
    calls[0].text,
    /ON CONFLICT \(participant_id, workbook_id, exercise_id\)/iu,
  );
  assert.match(calls[0].text, /payload = EXCLUDED\.payload/iu);
  assert.match(calls[0].text, /updated_at = now\(\)/iu);
  assert.equal(calls[0].values[0], snapshot.participantId);
  assert.equal(calls[0].values[1], snapshot.workbookId);
  assert.equal(calls[0].values[2], snapshot.exerciseId);
  assert.equal(calls[0].values[3], JSON.stringify(snapshot.payload));
  assert.equal(calls[0].values[4], BLEAD_DELETE_AFTER);
  assert.equal(rows[0].exercise_id, snapshot.exerciseId);
});

test("lists only the current participant and workbook", async () => {
  const { calls, query } = queryRecorder([]);
  const store = createBleadResponseStore(query);

  await store.listByParticipant(participantId);

  assert.match(calls[0].text, /WHERE participant_id = \$1/iu);
  assert.match(calls[0].text, /AND workbook_id = \$2/iu);
  assert.match(calls[0].text, /ORDER BY exercise_id/iu);
  assert.deepEqual(calls[0].values, [participantId, BLEAD_WORKBOOK_ID]);
});

test("lists all workbook responses in facilitator review order", async () => {
  const { calls, query } = queryRecorder([]);
  const store = createBleadResponseStore(query);

  await store.listAll();

  assert.match(calls[0].text, /WHERE workbook_id = \$1/iu);
  assert.match(
    calls[0].text,
    /ORDER BY updated_at DESC, participant_id, exercise_id/iu,
  );
  assert.deepEqual(calls[0].values, [BLEAD_WORKBOOK_ID]);
});

test("deletes only rows whose retention deadline has elapsed", async () => {
  const { calls, query } = queryRecorder([{ participant_id: participantId }]);
  const store = createBleadResponseStore(query);
  const now = new Date("2027-03-01T06:00:00.000Z");

  const rows = await store.deleteExpired(now);

  assert.match(calls[0].text, /DELETE FROM blead_workbook_responses/iu);
  assert.match(calls[0].text, /WHERE delete_after <= \$1/iu);
  assert.match(calls[0].text, /RETURNING participant_id/iu);
  assert.deepEqual(calls[0].values, [now.toISOString()]);
  assert.equal(rows.length, 1);
});

test("requires an injected query function", () => {
  assert.throws(() => createBleadResponseStore(), /query function/iu);
});
