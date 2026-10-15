import assert from "node:assert/strict";
import test from "node:test";
import {
  createAutosaveController,
  getOrCreateParticipantId,
  initializeWorkbookSync,
} from "../assets/js/workbook-sync.js";

const uuidA = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const uuidB = "419ff9dd-0184-4c02-a5e3-356b1ae50ec0";

function memoryStorage(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

function fakeCrypto(ids) {
  let index = 0;
  return { randomUUID: () => ids[index++] };
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

function workbookCard({ exerciseId = "prompt-01", title = "", team = "", notes = "" } = {}) {
  const fields = [control("title", title), control("team", team)];
  const noteControl = control(null, notes);
  const listeners = new Map();
  return {
    dataset: { promptId: exerciseId },
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

function collectSnapshot(card, participantId) {
  return {
    participantId,
    exerciseId: card.dataset.promptId,
    fields: Object.fromEntries(card.fields.map((field) => [field.dataset.promptField, field.value])),
    notes: card.noteControl.value,
  };
}

function hydrateSnapshot(card, row) {
  let changed = false;
  for (const field of card.fields) {
    if (!field.value && Object.hasOwn(row.payload.fields, field.dataset.promptField)) {
      field.value = row.payload.fields[field.dataset.promptField];
      changed = true;
    }
  }
  if (!card.noteControl.value && row.payload.notes) {
    card.noteControl.value = row.payload.notes;
    changed = true;
  }
  return changed;
}

function eventTarget(initial = {}) {
  const listeners = new Map();
  return {
    ...initial,
    addEventListener(type, listener) { listeners.set(type, listener); },
    emit(type) { listeners.get(type)?.(); },
  };
}

test("participant IDs are stable within a workbook and different across workbooks", () => {
  const storage = memoryStorage();
  const cryptoApi = fakeCrypto([uuidA, uuidB]);

  const first = getOrCreateParticipantId(storage, "sales-pack-1", cryptoApi);
  const again = getOrCreateParticipantId(storage, "sales-pack-1", cryptoApi);
  const other = getOrCreateParticipantId(storage, "sales-pack-2", cryptoApi);

  assert.equal(first, again);
  assert.notEqual(first, other);
  assert.equal(storage.values.get("kaindly:workbook:sales-pack-1:participant-id"), uuidA);
  assert.equal(storage.values.get("kaindly:workbook:sales-pack-2:participant-id"), uuidB);
});

test("autosave serializes requests and keeps only the newest queued snapshot", async () => {
  const sent = [];
  const resolvers = [];
  let inFlight = 0;
  let peakInFlight = 0;
  const controller = createAutosaveController({
    delay: 0,
    save: (snapshot) => new Promise((resolve) => {
      sent.push(snapshot.notes);
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      resolvers.push(() => {
        inFlight -= 1;
        resolve();
      });
    }),
  });

  controller.schedule({ notes: "first" });
  await tick();
  controller.schedule({ notes: "intermediate" });
  controller.schedule({ notes: "newest" });
  resolvers.shift()();
  await tick();
  resolvers.shift()();
  await controller.whenIdle();

  assert.deepEqual(sent, ["first", "newest"]);
  assert.equal(peakInFlight, 1);
});

test("autosave debounces edits and status callback failures are harmless", async () => {
  const sent = [];
  const controller = createAutosaveController({
    delay: 5,
    save: async (snapshot) => { sent.push(snapshot.notes); },
    onStatus: () => { throw new Error("status element disappeared"); },
  });

  controller.schedule({ notes: "old" });
  controller.schedule({ notes: "latest" });
  await controller.whenIdle();

  assert.deepEqual(sent, ["latest"]);
});

test("a failed snapshot is retained and the newest value retries on a later flush", async () => {
  const sent = [];
  let attempts = 0;
  const controller = createAutosaveController({
    delay: 60_000,
    save: async (snapshot) => {
      sent.push(snapshot.notes);
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
    },
  });

  await controller.flush({ notes: "kept locally" });
  await controller.flush({ notes: "newest local value" });

  assert.deepEqual(sent, ["kept locally", "newest local value"]);
});

test("initialization hydrates local first, fills only empty values from server, and reconciles local data", async () => {
  const workbookId = "sales-pack-1";
  const storage = memoryStorage([
    [`kaindly:workbook:${workbookId}:participant-id`, uuidA],
    [`kaindly:workbook:${workbookId}:exercise:prompt-01:field:title`, "Local title"],
  ]);
  const card = workbookCard();
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (!options.method) {
      assert.equal(card.fields[0].value, "Local title");
      return {
        ok: true,
        json: async () => ({
          responses: [{
            exercise_id: "prompt-01",
            payload: { fields: { title: "Server title", team: "Server team" }, notes: "Server notes" },
          }],
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  const sync = initializeWorkbookSync({
    workbookId,
    endpoint: "/sales/api/responses",
    cards: [card],
    collectSnapshot,
    hydrateSnapshot,
    storage,
    cryptoApi: fakeCrypto([uuidB]),
    fetchImpl,
    documentRoot: eventTarget({ visibilityState: "visible" }),
    windowRoot: eventTarget(),
    delay: 0,
  });
  await sync.ready;
  await sync.whenIdle();

  assert.equal(card.fields[0].value, "Local title");
  assert.equal(card.fields[1].value, "Server team");
  assert.equal(card.noteControl.value, "Server notes");
  assert.equal(requests[0].url, `/sales/api/responses?participantId=${encodeURIComponent(uuidA)}`);
  assert.equal(requests[0].options.credentials, "same-origin");
  assert.equal(requests[1].url, "/sales/api/responses");
  assert.equal(requests[1].options.credentials, "same-origin");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    participantId: uuidA,
    exerciseId: "prompt-01",
    fields: { title: "Local title", team: "Server team" },
    notes: "Server notes",
  });
});

test("input persists exact workbook keys and failed sync retries on a hidden-page flush", async () => {
  const workbookId = "leadership";
  const storage = memoryStorage();
  const card = workbookCard();
  const documentRoot = eventTarget({ visibilityState: "visible" });
  const windowRoot = eventTarget();
  const sent = [];
  let saves = 0;
  const fetchImpl = async (_url, options = {}) => {
    if (!options.method) return { ok: true, json: async () => ({ responses: [] }) };
    const snapshot = JSON.parse(options.body);
    sent.push(snapshot);
    saves += 1;
    if (saves === 1) throw new Error("offline");
    return { ok: true, json: async () => ({}) };
  };

  const sync = initializeWorkbookSync({
    workbookId,
    endpoint: "/leadership/api/responses",
    cards: [card],
    collectSnapshot,
    hydrateSnapshot,
    storage,
    cryptoApi: fakeCrypto([uuidA]),
    fetchImpl,
    documentRoot,
    windowRoot,
    delay: 60_000,
  });
  await sync.ready;

  card.fields[0].value = "First";
  card.fields[0].emit("input");
  card.fields[0].emit("blur");
  await sync.whenIdle();
  assert.equal(
    storage.values.get("kaindly:workbook:leadership:exercise:prompt-01:field:title"),
    "First",
  );

  card.fields[0].value = "Newest";
  card.fields[0].emit("input");
  card.noteControl.value = "Remember";
  card.noteControl.emit("input");
  documentRoot.visibilityState = "hidden";
  documentRoot.emit("visibilitychange");
  await sync.whenIdle();

  assert.deepEqual(sent.map(({ fields }) => fields.title), ["First", "Newest"]);
  assert.equal(
    storage.values.get("kaindly:workbook:leadership:exercise:prompt-01:notes"),
    "Remember",
  );

  card.fields[1].value = "Pagehide team";
  card.fields[1].emit("input");
  windowRoot.emit("pagehide");
  await sync.whenIdle();
  assert.equal(sent.at(-1).fields.team, "Pagehide team");
});

test("lifecycle flushes never create responses for untouched empty exercises", async () => {
  const card = workbookCard();
  const documentRoot = eventTarget({ visibilityState: "visible" });
  const windowRoot = eventTarget();
  let posts = 0;
  const sync = initializeWorkbookSync({
    workbookId: "untouched-workbook",
    endpoint: "/untouched/api/responses",
    cards: [card],
    collectSnapshot,
    hydrateSnapshot,
    storage: memoryStorage(),
    cryptoApi: fakeCrypto([uuidA]),
    fetchImpl: async (_url, options = {}) => {
      if (!options.method) return { ok: true, json: async () => ({ responses: [] }) };
      posts += 1;
      return { ok: true, json: async () => ({}) };
    },
    documentRoot,
    windowRoot,
    delay: 0,
  });
  await sync.ready;

  documentRoot.visibilityState = "hidden";
  documentRoot.emit("visibilitychange");
  windowRoot.emit("pagehide");
  await sync.whenIdle();

  assert.equal(posts, 0);
});
