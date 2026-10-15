import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as mclendon from "../assets/js/mclendon.js";

const workbookId = "mclendon-working-smarter";
const endpoint = "/McLendon/api/responses";
const participantId = "9ab73d11-c2e1-4b4d-a8c1-27f019451a85";
const exerciseIds = ["build-app", "crisis", "business-decision", "deal"];
const originalHtmlSha256 = "48d5c16b1f24b0c1da1300da300f41dd1cefdce13e2bf700219645b5c54b871e";

function memoryStorage(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

function noteControl(exerciseId, value = "") {
  const listeners = new Map();
  return {
    dataset: { workbookNote: exerciseId },
    value,
    addEventListener(type, listener) { listeners.set(type, listener); },
    emit(type) { listeners.get(type)?.({ target: this }); },
  };
}

function workbookCard(exerciseId, value = "") {
  const note = noteControl(exerciseId, value);
  return {
    note,
    querySelector(selector) {
      return selector === "[data-workbook-note]" ? note : null;
    },
    querySelectorAll() { return []; },
  };
}

function documentRoot(cards) {
  const listeners = new Map();
  return {
    visibilityState: "visible",
    querySelectorAll(selector) {
      if (selector === "[data-workbook-prompt]") return cards;
      if (selector === "[data-note-status]") return [];
      return [];
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
}

function newNotesKey(exerciseId) {
  return `kaindly:workbook:${workbookId}:exercise:${exerciseId}:notes`;
}

test("McLendon keeps four note exercises and changes only the five approved visible strings", () => {
  const html = readFileSync("McLendon/index.html", "utf8");
  assert.deepEqual(
    [...html.matchAll(/data-workbook-note="([^"]+)"/gu)].map((match) => match[1]),
    exerciseIds,
  );
  assert.match(html, /Your notes save automatically as you work\./u);
  assert.equal((html.match(/data-note-status>Saved\.<\/p>/gu) ?? []).length, 4);
  assert.doesNotMatch(html, /Saved privately on this device\.|Your notes stay in this browser on this device\./u);

  const restoredOriginal = html
    .replace(
      "Open any exercise, copy the complete CRAFT-I prompt, and paste it into the AI assistant you use. Capture what you learn in the private notes area. Your notes save automatically as you work.",
      "Open any exercise, copy the complete CRAFT-I prompt, and paste it into the AI assistant you use. Capture what you learn in the private notes area. Your notes stay in this browser on this device.",
    )
    .replaceAll(
      "data-note-status>Saved.</p>",
      "data-note-status>Saved privately on this device.</p>",
    );
  assert.equal(createHash("sha256").update(restoredOriginal).digest("hex"), originalHtmlSha256);
});

test("McLendon posts all four note-only snapshots through the authenticated workbook endpoint", async () => {
  const cards = exerciseIds.map((exerciseId) => workbookCard(exerciseId));
  const storage = memoryStorage();
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    return options.method
      ? { ok: true, json: async () => ({}) }
      : { ok: true, json: async () => ({ responses: [] }) };
  };

  const sync = mclendon.initializeMclendonResponseSync({
    documentRoot: documentRoot(cards),
    storage,
    cryptoApi: { randomUUID: () => participantId },
    fetchImpl,
    delay: 0,
    navigatorRoot: {},
    windowRoot: { addEventListener() {} },
  });
  await sync.ready;

  for (const [index, card] of cards.entries()) {
    card.note.value = `Note ${index + 1}`;
    card.note.emit("input");
    card.note.emit("blur");
  }
  await sync.whenIdle();

  assert.equal(storage.values.get(`kaindly:workbook:${workbookId}:participant-id`), participantId);
  const posts = requests.filter(({ url, options }) => url === endpoint && options.method === "POST");
  assert.equal(posts.length, 4);
  for (const [index, exerciseId] of exerciseIds.entries()) {
    const post = posts.findLast(({ options }) => JSON.parse(options.body).exerciseId === exerciseId);
    assert.ok(post, `expected a POST for ${exerciseId}`);
    assert.equal(post.options.credentials, "same-origin");
    assert.deepEqual(JSON.parse(post.options.body), {
      participantId,
      exerciseId,
      fields: {},
      notes: `Note ${index + 1}`,
    });
  }
  const restore = requests.find(({ options }) => !options.method);
  assert.equal(restore.url, `${endpoint}?participantId=${participantId}`);
  assert.equal(restore.options.credentials, "same-origin");
});

test("McLendon migrates legacy notes only when workbook-scoped notes are empty", async () => {
  const cards = exerciseIds.map((exerciseId) => workbookCard(exerciseId));
  const storage = memoryStorage([
    [newNotesKey("build-app"), ""],
    ["kaindly-mclendon-workbook:build-app", "Legacy app note"],
    [newNotesKey("crisis"), "New crisis note"],
    ["kaindly-mclendon-workbook:crisis", "Legacy crisis note"],
    ["kaindly-mclendon-workbook:business-decision", "Legacy decision note"],
  ]);
  const fetchImpl = async (_url, options = {}) => options.method
    ? { ok: true, json: async () => ({}) }
    : {
        ok: true,
        json: async () => ({
          responses: [
            { exercise_id: "build-app", payload: { fields: {}, notes: "Server app note" } },
            { exercise_id: "deal", payload: { fields: {}, notes: "Server deal note" } },
          ],
        }),
      };

  const sync = mclendon.initializeMclendonResponseSync({
    documentRoot: documentRoot(cards),
    storage,
    cryptoApi: { randomUUID: () => participantId },
    fetchImpl,
    delay: 0,
    navigatorRoot: {},
    windowRoot: { addEventListener() {} },
  });
  await sync.ready;
  await sync.whenIdle();

  assert.deepEqual(cards.map(({ note }) => note.value), [
    "Legacy app note",
    "New crisis note",
    "Legacy decision note",
    "Server deal note",
  ]);
  assert.equal(storage.values.get(newNotesKey("build-app")), "Legacy app note");
  assert.equal(storage.values.get(newNotesKey("crisis")), "New crisis note");
  assert.equal(storage.values.get(newNotesKey("business-decision")), "Legacy decision note");
  assert.equal(storage.values.get(newNotesKey("deal")), "Server deal note");
});
