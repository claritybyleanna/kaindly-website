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

test("workbook status callbacks receive card context while restore failures remain workbook-wide", async () => {
  const card = workbookCard({ exerciseId: "prompt-context" });
  const events = [];
  const sync = initializeWorkbookSync({
    workbookId: "context-workbook",
    endpoint: "/context/api/responses",
    cards: [card],
    collectSnapshot,
    hydrateSnapshot,
    storage: memoryStorage(),
    cryptoApi: fakeCrypto([uuidA]),
    fetchImpl: async (_url, options = {}) => options.method
      ? { ok: true, json: async () => ({}) }
      : { ok: true, json: async () => ({ responses: [] }) },
    documentRoot: eventTarget({ visibilityState: "visible" }),
    windowRoot: eventTarget(),
    delay: 0,
    onStatus(state, context) { events.push([state, context]); },
  });
  await sync.ready;
  card.fields[0].value = "Context-aware save";
  card.fields[0].emit("input");
  card.fields[0].emit("blur");
  await sync.whenIdle();

  assert.deepEqual(events.map(([state]) => state), ["saving", "saved"]);
  for (const [, context] of events) {
    assert.equal(context.card, card);
    assert.equal(context.exerciseId, "prompt-context");
  }

  const restoreEvents = [];
  const restoreSync = initializeWorkbookSync({
    workbookId: "context-restore",
    endpoint: "/context-restore/api/responses",
    cards: [workbookCard({ exerciseId: "prompt-restore" })],
    collectSnapshot,
    hydrateSnapshot,
    storage: memoryStorage(),
    cryptoApi: fakeCrypto([uuidB]),
    fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
    documentRoot: eventTarget({ visibilityState: "visible" }),
    windowRoot: eventTarget(),
    onStatus(...args) { restoreEvents.push(args); },
  });
  await restoreSync.ready;
  assert.deepEqual(restoreEvents, [["offline"]]);
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
    navigatorRoot: { sendBeacon: () => true },
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

test("normal saves from different exercises share one serialized workbook transport", async () => {
  const first = workbookCard({ exerciseId: "prompt-01" });
  const second = workbookCard({ exerciseId: "prompt-02" });
  const sent = [];
  const releases = [];
  let inFlight = 0;
  let peakInFlight = 0;
  const sync = initializeWorkbookSync({
    workbookId: "serialized-workbook",
    endpoint: "/serialized/api/responses",
    cards: [first, second],
    collectSnapshot,
    hydrateSnapshot,
    storage: memoryStorage(),
    cryptoApi: fakeCrypto([uuidA]),
    fetchImpl: async (_url, options = {}) => {
      if (!options.method) return { ok: true, json: async () => ({ responses: [] }) };
      const snapshot = JSON.parse(options.body);
      sent.push([snapshot.exerciseId, snapshot.fields.title]);
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((resolve) => releases.push(resolve));
      inFlight -= 1;
      return { ok: true, json: async () => ({}) };
    },
    documentRoot: eventTarget({ visibilityState: "visible" }),
    windowRoot: eventTarget(),
    delay: 0,
  });
  await sync.ready;

  first.fields[0].value = "First exercise";
  first.fields[0].emit("input");
  second.fields[0].value = "Second draft";
  second.fields[0].emit("input");
  second.fields[0].value = "Second newest";
  second.fields[0].emit("input");
  await tick();

  assert.deepEqual(sent, [["prompt-01", "First exercise"]]);
  assert.equal(peakInFlight, 1);

  releases.shift()();
  await tick();
  assert.deepEqual(sent, [
    ["prompt-01", "First exercise"],
    ["prompt-02", "Second newest"],
  ]);
  assert.equal(peakInFlight, 1);
  releases.shift()();
  await sync.whenIdle();
});

test("hidden then pagehide makes one immediate beacon attempt with the latest local snapshot", async () => {
  const card = workbookCard();
  const storage = memoryStorage();
  const documentRoot = eventTarget({ visibilityState: "visible" });
  const windowRoot = eventTarget();
  const normalReleases = [];
  const beacons = [];
  const sync = initializeWorkbookSync({
    workbookId: "unload-workbook",
    endpoint: "/unload/api/responses",
    cards: [card],
    collectSnapshot,
    hydrateSnapshot,
    storage,
    cryptoApi: fakeCrypto([uuidA]),
    fetchImpl: async (_url, options = {}) => {
      if (!options.method) return { ok: true, json: async () => ({ responses: [] }) };
      await new Promise((resolve) => normalReleases.push(resolve));
      return { ok: true, json: async () => ({}) };
    },
    navigatorRoot: {
      sendBeacon(url, body) {
        beacons.push({ url, body });
        return true;
      },
    },
    documentRoot,
    windowRoot,
    delay: 60_000,
  });
  await sync.ready;

  card.fields[0].value = "First";
  card.fields[0].emit("input");
  card.fields[0].emit("blur");
  await tick();
  assert.equal(normalReleases.length, 1);

  card.fields[0].value = "Newest before unload";
  card.fields[0].emit("input");
  documentRoot.visibilityState = "hidden";
  documentRoot.emit("visibilitychange");
  windowRoot.emit("pagehide");

  assert.equal(beacons.length, 1);
  assert.equal(beacons[0].url, "/unload/api/responses");
  assert.equal(beacons[0].body.type, "application/json");
  assert.equal(JSON.parse(await beacons[0].body.text()).fields.title, "Newest before unload");
  assert.equal(
    storage.values.get("kaindly:workbook:unload-workbook:exercise:prompt-01:field:title"),
    "Newest before unload",
  );

  normalReleases.shift()();
  await tick();
  normalReleases.shift()();
  await sync.whenIdle();
});

test("pagehide falls back to an immediate keepalive fetch when beacon declines", async () => {
  const card = workbookCard();
  const windowRoot = eventTarget();
  const normalReleases = [];
  const posts = [];
  const sync = initializeWorkbookSync({
    workbookId: "fallback-workbook",
    endpoint: "/fallback/api/responses",
    cards: [card],
    collectSnapshot,
    hydrateSnapshot,
    storage: memoryStorage(),
    cryptoApi: fakeCrypto([uuidA]),
    fetchImpl: async (_url, options = {}) => {
      if (!options.method) return { ok: true, json: async () => ({ responses: [] }) };
      posts.push(JSON.parse(options.body));
      if (posts.length === 1) {
        await new Promise((resolve) => normalReleases.push(resolve));
      }
      return { ok: true, json: async () => ({}) };
    },
    navigatorRoot: { sendBeacon: () => false },
    documentRoot: eventTarget({ visibilityState: "visible" }),
    windowRoot,
    delay: 60_000,
  });
  await sync.ready;

  card.fields[0].value = "Normal in flight";
  card.fields[0].emit("input");
  card.fields[0].emit("blur");
  await tick();

  card.fields[0].value = "Immediate fallback";
  card.fields[0].emit("input");
  windowRoot.emit("pagehide");
  await tick();

  assert.equal(posts.length, 2);
  assert.equal(posts[1].fields.title, "Immediate fallback");

  normalReleases.shift()();
  await tick();
  await sync.whenIdle();
});
