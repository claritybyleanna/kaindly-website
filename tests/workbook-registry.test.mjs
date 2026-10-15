import assert from "node:assert/strict";
import test from "node:test";
import { validateRegistry } from "../lib/workbook-registry.js";
import {
  getWorkbookRegistration,
  listWorkbookRegistrations,
  validateWorkbookRegistration,
} from "../lib/workbook-registry.js";

const FUTURE_NOW = new Date("2026-10-15T00:00:00.000Z");

function validRegistration({ key, workbookId }) {
  return {
    key,
    client: { id: "client", name: "Client" },
    program: { id: "program", name: "Program" },
    workbook: { id: workbookId, name: "Workbook" },
    hubUrl: "/hub/",
    routePrefix: "/hub/workbook/",
    participantApiPath: "/hub/api/responses",
    deleteAfter: "2027-03-01T06:00:00.000Z",
    exportPrefix: "workbook",
    exercises: [{ id: "prompt-01", title: "Prompt", fields: [], acceptsNotes: true }],
  };
}

test("registers every current workbook with explicit identity and retention", () => {
  const registrations = listWorkbookRegistrations();

  assert.deepEqual(registrations.map(({ key }) => key), [
    "bracco-leadership-session-1",
    "bracco-sales-pack-1",
    "bracco-sales-pack-2",
    "mclendon-working-smarter",
  ]);
  assert.deepEqual(registrations.map(({ workbook }) => workbook.id), [
    "bracco-session-1",
    "bracco-sales-ai-brain",
    "bracco-sales-chief-of-staff",
    "mclendon-working-smarter",
  ]);
  assert.ok(registrations.every(({ deleteAfter }) => deleteAfter === "2027-03-01T06:00:00.000Z"));
  assert.ok(Object.isFrozen(registrations));
  assert.ok(registrations.every((registration) => Object.isFrozen(registration)));
  assert.ok(registrations.every((registration) => Object.isFrozen(registration.exercises)));
  assert.ok(registrations.every((registration) => Object.isFrozen(registration.client)));
  assert.ok(registrations.every((registration) => registration.exercises.every((exercise) => Object.isFrozen(exercise.fields))));
});

test("looks up registrations by server-owned workbook key", () => {
  assert.equal(getWorkbookRegistration("bracco-sales-pack-1").workbook.id, "bracco-sales-ai-brain");
  assert.equal(getWorkbookRegistration("unknown"), undefined);
});

test("rejects duplicate global workbook IDs and missing or expired deadlines", () => {
  assert.throws(() => validateWorkbookRegistration({ workbookId: "duplicate" }, FUTURE_NOW), /retention/i);
  const { deleteAfter: _deleteAfter, ...withoutDeadline } = validRegistration({ key: "old", workbookId: "old" });
  assert.throws(() => validateWorkbookRegistration(withoutDeadline, FUTURE_NOW), /retention/i);
  assert.throws(() => validateRegistry([
    validRegistration({ key: "one", workbookId: "same" }),
    validRegistration({ key: "two", workbookId: "same" }),
  ], FUTURE_NOW), /duplicate workbook/i);
  assert.throws(() => validateWorkbookRegistration({
    ...validRegistration({ key: "expired", workbookId: "expired" }),
    deleteAfter: "2026-10-14T00:00:00.000Z",
  }, FUTURE_NOW), /future/i);
  assert.throws(() => validateWorkbookRegistration({
    ...validRegistration({ key: "malformed", workbookId: "malformed" }),
    deleteAfter: "tomorrow",
  }, FUTURE_NOW), /retention/i);
});
