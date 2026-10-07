import assert from "node:assert/strict";
import test from "node:test";
import { promptPackContent } from "../Blead/session-1-prompts/content.js";
import {
  BLEAD_DELETE_AFTER,
  BLEAD_WORKBOOK_ID,
  normalizeExerciseSnapshot,
  responsesToCsv,
  retentionHasEnded,
} from "../lib/blead-response-domain.js";

const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";

test("normalizes only authored fields for an anonymous exercise", () => {
  const result = normalizeExerciseSnapshot({
    participantId,
    exerciseId: "prompt-01",
    fields: { title: "VP", team: "Analytics" },
    notes: "Try this next week",
  }, promptPackContent);

  assert.equal(result.participantId, participantId);
  assert.equal(result.workbookId, BLEAD_WORKBOOK_ID);
  assert.deepEqual(result.payload.fields, { title: "VP", team: "Analytics" });
  assert.equal(result.payload.notes, "Try this next week");
  assert.throws(
    () => normalizeExerciseSnapshot({ participantId: "not-a-uuid" }, promptPackContent),
    /participant/i,
  );
  assert.throws(
    () => normalizeExerciseSnapshot({
      participantId,
      exerciseId: "prompt-01",
      fields: { injected: "reject me" },
    }, promptPackContent),
    /unknown field/i,
  );
  assert.throws(
    () => normalizeExerciseSnapshot({
      participantId,
      exerciseId: "prompt-01",
      fields: { title: "x".repeat(12_001) },
    }, promptPackContent),
    /size limit/i,
  );
});

test("uses the approved fixed retention boundary", () => {
  assert.equal(BLEAD_DELETE_AFTER, "2027-03-01T06:00:00.000Z");
  assert.equal(retentionHasEnded(new Date("2027-03-01T05:59:59.999Z")), false);
  assert.equal(retentionHasEnded(new Date("2027-03-01T06:00:00.000Z")), true);
});

test("exports commas, quotes, newlines, and formulas as inert CSV", () => {
  const csv = responsesToCsv([{
    participant_id: participantId,
    exercise_id: "prompt-01",
    payload: {
      fields: { title: "=HYPERLINK(\"bad\")", team: "A, B\nC" },
      notes: "+SUM(1,1)",
    },
    updated_at: "2026-10-07T15:00:00.000Z",
    delete_after: BLEAD_DELETE_AFTER,
  }], promptPackContent);

  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"A, B\nC"/);
  assert.match(csv, /"'\+SUM\(1,1\)"/);
});

test("exports notes even when an exercise has no authored fields", () => {
  const csv = responsesToCsv([{
    participant_id: participantId,
    exercise_id: "prompt-07",
    payload: { fields: {}, notes: "Keep this note" },
    updated_at: "2026-10-07T15:00:00.000Z",
    delete_after: BLEAD_DELETE_AFTER,
  }], promptPackContent);

  assert.match(csv, /Keep this note/);
});
