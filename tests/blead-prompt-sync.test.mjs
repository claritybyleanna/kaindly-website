import assert from "node:assert/strict";
import test from "node:test";
import {
  collectExerciseSnapshot,
  createAutosaveController,
  getOrCreateParticipantId,
  hydrateExerciseFromServer,
  initializePromptSync,
} from "../assets/js/blead-prompt-sync.js";

const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";

function mapStorage(values = new Map()) {
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
  };
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function control(fieldId, value = "") {
  const listeners = new Map();
  return {
    dataset: fieldId ? { promptField: fieldId } : {},
    value,
    addEventListener(type, listener) { listeners.set(type, listener); },
    emit(type) { listeners.get(type)?.({ target: this }); },
  };
}

function promptCard({ title = "", team = "", notes = "" } = {}) {
  const fields = [control("title", title), control("team", team)];
  const noteControl = control(null, notes);
  const listeners = new Map();
  return {
    dataset: { promptId: "prompt-01" },
    fields,
    noteControl,
    querySelectorAll(selector) {
      return selector === "[data-prompt-field]" ? fields : [];
    },
    querySelector(selector) {
      return selector === "[data-prompt-notes]" ? noteControl : null;
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
  };
}

test("reuses one random anonymous ID through the Blead compatibility wrapper", () => {
  const values = new Map();
  const storage = mapStorage(values);
  const cryptoApi = { randomUUID: () => participantId };

  assert.equal(
    getOrCreateParticipantId(storage, cryptoApi),
    getOrCreateParticipantId(storage, cryptoApi),
  );
  assert.equal(
    values.get("kaindly:workbook:bracco-session-1:participant-id"),
    participantId,
  );
  assert.equal(values.has("kaindly:workbook:bracco-leadership-session-1:participant-id"), false);
});

test("migrates the legacy Blead participant ID into the persisted workbook ID key", () => {
  const values = new Map([["kaindly:blead:anonymous-participant-id", participantId]]);
  const storage = mapStorage(values);

  assert.equal(
    getOrCreateParticipantId(storage, { randomUUID: () => { throw new Error("should not run"); } }),
    participantId,
  );
  assert.equal(values.get("kaindly:workbook:bracco-session-1:participant-id"), participantId);
});

test("queues the newest snapshot while one save is in flight", async () => {
  const resolvers = [];
  const sent = [];
  const controller = createAutosaveController({
    delay: 0,
    save: (snapshot) => new Promise((resolve) => {
      sent.push(snapshot);
      resolvers.push(resolve);
    }),
  });

  controller.schedule({ notes: "first" });
  await tick();
  controller.schedule({ notes: "newest" });
  resolvers.shift()({ ok: true });
  await tick();
  resolvers.shift()({ ok: true });
  await controller.whenIdle();

  assert.deepEqual(sent.map(({ notes }) => notes), ["first", "newest"]);
});

test("a rejected save reports offline and a later edit retries", async () => {
  const statuses = [];
  const sent = [];
  let attempts = 0;
  const controller = createAutosaveController({
    delay: 0,
    onStatus: (status) => statuses.push(status),
    save: async (snapshot) => {
      sent.push(snapshot);
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return { ok: true };
    },
  });

  controller.schedule({ notes: "kept locally" });
  await controller.whenIdle();
  controller.schedule({ notes: "kept locally and edited" });
  await controller.whenIdle();

  assert.deepEqual(sent.map(({ notes }) => notes), [
    "kept locally",
    "kept locally and edited",
  ]);
  assert.ok(statuses.includes("offline"));
  assert.equal(statuses.at(-1), "saved");
});

test("collects one authored exercise snapshot", () => {
  const card = promptCard({ title: "VP", team: "Analytics", notes: "Remember this" });

  assert.deepEqual(collectExerciseSnapshot(card, participantId), {
    participantId,
    exerciseId: "prompt-01",
    fields: { title: "VP", team: "Analytics" },
    notes: "Remember this",
  });
});

test("server hydration preserves populated local fields and fills empty controls", () => {
  const populated = promptCard({ title: "Local title" });
  const empty = promptCard();
  const row = {
    payload: {
      fields: { title: "Server title", team: "Server team" },
      notes: "Server notes",
    },
  };

  assert.equal(hydrateExerciseFromServer(populated, row), true);
  assert.equal(populated.fields[0].value, "Local title");
  assert.equal(populated.fields[1].value, "Server team");
  assert.equal(populated.noteControl.value, "Server notes");
  assert.equal(hydrateExerciseFromServer(empty, row), true);
  assert.equal(empty.fields[0].value, "Server title");
  assert.equal(empty.noteControl.value, "Server notes");
});

test("blur and hidden-page lifecycle events flush the latest snapshot", async () => {
  const card = promptCard();
  const status = { textContent: "" };
  const documentListeners = new Map();
  const documentRoot = {
    visibilityState: "visible",
    querySelectorAll(selector) { return selector === "[data-prompt-card]" ? [card] : []; },
    querySelector(selector) { return selector === "[data-sync-status]" ? status : null; },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
  };
  const sent = [];
  const fetchImpl = async (url, options = {}) => {
    if (!options.method) return { ok: true, json: async () => ({ responses: [] }) };
    sent.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({}) };
  };

  const sync = initializePromptSync({
    documentRoot,
    storage: mapStorage(),
    cryptoApi: { randomUUID: () => participantId },
    fetchImpl,
    delay: 60_000,
    navigatorRoot: { sendBeacon: () => true },
  });
  await sync.ready;

  card.fields[0].value = "First value";
  card.fields[0].emit("input");
  card.fields[0].emit("blur");
  await sync.whenIdle();

  card.fields[0].value = "Latest value";
  card.fields[0].emit("input");
  documentRoot.visibilityState = "hidden";
  documentListeners.get("visibilitychange")();
  await sync.whenIdle();

  assert.deepEqual(sent.map(({ fields }) => fields.title), ["First value", "Latest value"]);
  assert.equal(status.textContent, "Responses saved.");
});
