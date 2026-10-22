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
    "owr-purposeful-next-move",
    "bracco-leadership-session-1",
    "bracco-sales-pack-1",
    "bracco-sales-pack-2",
    "mclendon-working-smarter",
    "owr-career-architecture",
  ]);
  assert.deepEqual(registrations.map(({ workbook }) => workbook.id), [
    "owr-purposeful-next-move",
    "bracco-session-1",
    "bracco-sales-ai-brain",
    "bracco-sales-chief-of-staff",
    "mclendon-working-smarter",
    "owr-career-architecture",
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
  for (const inheritedKey of ["__proto__", "constructor", "toString"]) {
    assert.equal(getWorkbookRegistration(inheritedKey), undefined, `${inheritedKey} is not a registered workbook key`);
  }
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

test("fresh registry imports remain available at and after retention expiry", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2027-03-01T06:00:00.000Z") });
  for (const offset of [0, 1]) {
    t.mock.timers.setTime(new Date("2027-03-01T06:00:00.000Z").getTime() + offset);
    const registry = await import(`../lib/workbook-registry.js?expiry-regression=${offset}`);
    assert.equal(registry.listWorkbookRegistrations().length, 6);
    assert.equal(registry.getWorkbookRegistration("bracco-leadership-session-1").deleteAfter, "2027-03-01T06:00:00.000Z");
    assert.throws(() => registry.validateWorkbookRegistration(validRegistration({ key: "new", workbookId: "new" })), /future/i);
    assert.throws(() => registry.validateRegistry([validRegistration({ key: "new", workbookId: "new" })]), /future/i);
  }
});

test("runtime validation accepts expired deadlines but rejects malformed deadlines and duplicate identities", () => {
  const expired = { ...validRegistration({ key: "old", workbookId: "old" }), deleteAfter: "2026-10-14T00:00:00.000Z" };
  const runtime = { requireFuture: false };
  assert.equal(validateWorkbookRegistration(expired, FUTURE_NOW, runtime), expired);
  for (const deleteAfter of [undefined, "tomorrow", "2027-03-01", "2027-02-30T06:00:00.000Z"]) {
    assert.throws(() => validateWorkbookRegistration({ ...expired, deleteAfter }, FUTURE_NOW, runtime), /retention|ISO/i);
  }
  assert.throws(() => validateRegistry([expired, { ...expired, key: "other" }], FUTURE_NOW, runtime), /duplicate workbook/i);
});
