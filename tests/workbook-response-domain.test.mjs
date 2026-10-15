import assert from "node:assert/strict";
import test from "node:test";
import { getWorkbookRegistration, listWorkbookRegistrations } from "../lib/workbook-registry.js";
import {
  normalizeWorkbookSnapshot, validateParticipantId, retentionHasEnded,
  formatDashboardResponse, responsesToCsv,
} from "../lib/workbook-response-domain.js";

const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const registration = getWorkbookRegistration("bracco-sales-pack-1");
const snapshot = { participantId, exerciseId: "prompt-02", fields: { "field-01": "Regional sales director" } };
const row = {
  participant_id: participantId, workbook_id: registration.workbook.id, exercise_id: "prompt-02",
  payload: { fields: { "field-01": "Regional sales director" }, notes: "Try this" },
  updated_at: "2026-10-15T15:00:00.000Z", delete_after: registration.deleteAfter,
};

test("uses route-selected identity and retention, never request-supplied identity", () => {
  const result = normalizeWorkbookSnapshot({ ...snapshot, clientId: "attacker", programId: "attacker", workbookId: "attacker", deleteAfter: "2099-01-01" }, registration);
  assert.deepEqual(result, {
    clientId: "bracco", programId: "sales-ai-working-session", workbookId: "bracco-sales-ai-brain",
    participantId, exerciseId: "prompt-02", payload: { fields: snapshot.fields, notes: "" },
    deleteAfter: "2027-03-01T06:00:00.000Z",
  });
});

test("rejects invalid participant, exercise, and unknown fields", () => {
  assert.equal(validateParticipantId(participantId), participantId);
  assert.throws(() => validateParticipantId("not-a-uuid"), /participant/i);
  assert.throws(() => normalizeWorkbookSnapshot({ ...snapshot, exerciseId: "injected" }, registration), /approved exercise/i);
  assert.throws(() => normalizeWorkbookSnapshot({ ...snapshot, fields: { injected: "reject" } }, registration), /unknown field/i);
});

test("normalizes values to strings while enforcing field and notes limits", () => {
  const result = normalizeWorkbookSnapshot({ ...snapshot, fields: { "field-01": null, "field-02": 42 }, notes: 7 }, registration);
  assert.deepEqual(result.payload, { fields: { "field-01": "", "field-02": "42" }, notes: "7" });
  assert.doesNotThrow(() => normalizeWorkbookSnapshot({ ...snapshot, fields: { "field-01": "x".repeat(12_000) }, notes: "x".repeat(20_000) }, registration));
  assert.throws(() => normalizeWorkbookSnapshot({ ...snapshot, fields: { "field-01": "x".repeat(12_001) } }, registration), /field.*size limit/i);
  assert.throws(() => normalizeWorkbookSnapshot({ ...snapshot, notes: "x".repeat(20_001) }, registration), /notes.*size limit/i);
});

test("enforces a 64 KiB UTF-8 request limit including ignored input keys", () => {
  assert.throws(() => normalizeWorkbookSnapshot({ ...snapshot, ignored: "x".repeat(65_536) }, registration), /request.*size limit/i);
  assert.throws(() => normalizeWorkbookSnapshot({ ...snapshot, fields: { "field-01": "😀".repeat(6_000), "field-02": "😀".repeat(6_000), "field-03": "😀".repeat(6_000) } }, registration), /request.*size limit/i);
});

test("retention uses each explicit deadline and includes its exact boundary", () => {
  assert.equal(retentionHasEnded("2026-12-01T00:00:00.000Z", "2026-12-01T00:00:00.001Z"), false);
  assert.equal(retentionHasEnded(new Date("2026-12-01T00:00:00.000Z"), "2026-12-01T00:00:00.000Z"), true);
});

test("dashboard formatting uses registry labels and leaves hostile HTML as text", () => {
  const result = formatDashboardResponse({ ...row, client_id: "attacker", payload: { fields: { "field-01": "<img onerror=alert(1)>", injected: "hidden" }, notes: "<script>bad</script>" } }, registration);
  assert.equal(result.client_id, "bracco");
  assert.equal(result.client_name, "Bracco");
  assert.equal(result.program_name, "Sales Team AI Working Session");
  assert.equal(result.workbook_name, registration.workbook.name);
  assert.equal(result.exercise_title, "The CRAFT-I Coaching Prompt");
  assert.deepEqual(result.fields, [{ id: "field-01", label: "YOUR ROLE", value: "<img onerror=alert(1)>" }]);
  assert.equal(result.notes, "<script>bad</script>");
  assert.equal(result.updated_at, row.updated_at);
});

test("formatting rejects mismatched workbooks and unknown exercises", () => {
  assert.throws(() => formatDashboardResponse({ ...row, workbook_id: "other" }, registration), /workbook/i);
  assert.throws(() => formatDashboardResponse({ ...row, exercise_id: "other" }, registration), /exercise/i);
  assert.throws(() => responsesToCsv([{ ...row, workbook_id: "other" }], listWorkbookRegistrations()), /workbook/i);
});

test("CSV uses registry labels, escapes multiline values, and neutralizes formula prefixes", () => {
  const csv = responsesToCsv([{ ...row, payload: { fields: { "field-01": '=HYPERLINK("bad")', "field-02": "A, B\nC" }, notes: "+SUM(1,1)" } }], listWorkbookRegistrations());
  assert.match(csv, /^"Client","Program","Workbook","Participant ID"/);
  assert.ok(csv.includes('"Bracco","Sales Team AI Working Session"'));
  assert.ok(csv.includes('"YOUR ROLE","\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"A, B\nC"'));
  assert.ok(csv.includes('"\'+SUM(1,1)"'));
  for (const value of ["=1", "+1", "-1", "@SUM(1)", "\t=1", "\r=1", "\n=1"]) {
    assert.ok(responsesToCsv([{ ...row, payload: { fields: { "field-01": value } } }], [registration]).includes(`"'${value}"`));
  }
});

test("McLendon note-only snapshots appear in dashboard and mixed-workbook CSV", () => {
  const mclendon = getWorkbookRegistration("mclendon-working-smarter");
  const normalized = normalizeWorkbookSnapshot({ participantId, exerciseId: "crisis", notes: "Keep this note" }, mclendon);
  assert.deepEqual(normalized.payload, { fields: {}, notes: "Keep this note" });
  const noteRow = { ...row, workbook_id: mclendon.workbook.id, exercise_id: "crisis", payload: normalized.payload };
  assert.deepEqual(formatDashboardResponse(noteRow, mclendon).fields, []);
  const csv = responsesToCsv([row, noteRow], listWorkbookRegistrations());
  assert.ok(csv.includes('"The McLendon Foundation","Working Smarter From Day One"'));
  assert.ok(csv.includes('"The Crisis","","","Keep this note"'));
});
