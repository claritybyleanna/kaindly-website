import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../Blead/session-1-prompts/index.html", import.meta.url);

test("Session 1 prompt pack is a protected interactive workbook", async () => {
  assert.equal(existsSync(pageUrl), true, "the Session 1 prompt workbook page is missing");

  const html = await readFile(pageUrl, "utf8");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const cards = html.match(/<article class="blead-prompt-card"/g) ?? [];

  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(visibleText, /Build Your AI Brain/);
  assert.match(visibleText, /Prompt Pack for Microsoft Copilot/);
  assert.match(visibleText, /Two paths to the same result/);
  assert.equal(cards.length, 11);
  assert.equal((html.match(/data-copy-prompt/g) ?? []).length, 11);
  assert.equal((html.match(/data-prompt-template/g) ?? []).length, 11);
  assert.equal((html.match(/data-prompt-notes/g) ?? []).length, 11);
  assert.match(html, /data-prompt-field="title"/);
  assert.match(html, /data-prompt-field="team"/);
  assert.match(html, /data-prompt-field="prompt-results"/);
  assert.match(html, /href="\/Blead\/"/);
  assert.match(html, /action="\/Blead\/logout\/"/);
  assert.match(html, /src="\/assets\/js\/blead-prompts\.js"/);
  assert.match(html, /href="\/assets\/css\/blead-prompts\.css"/);
  assert.match(visibleText, /retained through February 28, 2027/i);
  assert.match(visibleText, /Your private notes/);
  assert.match(visibleText, /Saved only in this browser on this device\./);
  assert.doesNotMatch(visibleText, /visible only to KAINDLY facilitators/i);
  assert.doesNotMatch(visibleText, /Do not enter personal, patient, regulated/i);
  assert.match(html, /data-sync-status/);
  assert.doesNotMatch(visibleText, /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu);

  const { promptPackContent } = await import("../Blead/session-1-prompts/content.js");
  const { renderBleadPromptPack } = await import("../scripts/build-blead-prompts.mjs");
  assert.equal(promptPackContent.prompts.length, 11);
  assert.deepEqual(promptPackContent.prompts.map(({ title }) => title), [
    "The Master Prompt: Build Your AI Operating System",
    "The Before-and-After Test",
    "Mine Your Writing Style",
    "Map Your Work",
    "The Operating Manual Interview",
    "Compress Into Custom Instructions",
    "Extract Your Saved Memories",
    "Build Your Prompt Library",
    "Brief Your AI Chief of Staff",
    "Create Your Team Objectives Page",
    "The Quarterly Refresh",
  ]);
  assert.equal(html, renderBleadPromptPack(promptPackContent));
});

test("generated prompt and field identities match the registered Blead workbook schema", async () => {
  const html = await readFile(pageUrl, "utf8");
  const { getWorkbookRegistration } = await import("../lib/workbook-registry.js");
  const registration = getWorkbookRegistration("bracco-leadership-session-1");

  assert.equal(registration.workbook.id, "bracco-session-1");
  assert.deepEqual(
    [...html.matchAll(/data-prompt-card data-prompt-id="([^"]+)"/g)].map(([, id]) => id),
    registration.exercises.map(({ id }) => id),
  );
  assert.deepEqual(
    [...html.matchAll(/data-prompt-field="([^"]+)"/g)].map(([, id]) => id),
    registration.exercises.flatMap(({ fields }) => fields.map(({ id }) => id)),
  );
});

test("prompt exercises compile personalized copy and keep a workbook-scoped local-first copy", async () => {
  assert.equal(
    existsSync(new URL("../assets/js/blead-prompts.js", import.meta.url)),
    true,
    "the prompt workbook interaction module is missing",
  );

  const {
    compilePrompt,
    copyPrompt,
    loadExerciseValue,
    saveExerciseValue,
  } = await import("../assets/js/blead-prompts.js");

  const template = "I am [YOUR TITLE] leading [YOUR TEAM].";
  assert.equal(
    compilePrompt(template, {
      "[YOUR TITLE]": "VP, Commercial Analytics",
      "[YOUR TEAM]": "a team of 12",
    }),
    "I am VP, Commercial Analytics leading a team of 12.",
  );
  assert.equal(
    compilePrompt(template, { "[YOUR TITLE]": "" }),
    "I am [YOUR TITLE] leading [YOUR TEAM].",
  );

  const saved = new Map();
  const storage = {
    getItem(key) { return saved.has(key) ? saved.get(key) : null; },
    setItem(key, value) { saved.set(key, value); },
  };
  saveExerciseValue(storage, "prompt-01", "title", "VP, Commercial Analytics");
  assert.equal(
    loadExerciseValue(storage, "prompt-01", "title"),
    "VP, Commercial Analytics",
  );
  assert.equal(
    saved.get("kaindly:workbook:bracco-session-1:exercise:prompt-01:field:title"),
    "VP, Commercial Analytics",
  );

  const copied = [];
  await copyPrompt({ writeText(value) { copied.push(value); return Promise.resolve(); } }, "Personalized prompt");
  assert.deepEqual(copied, ["Personalized prompt"]);

  const source = await readFile(new URL("../assets/js/blead-prompts.js", import.meta.url), "utf8");
  assert.match(source, /initializePromptSync/);
  assert.match(source, /blead:hydrate/);
});

test("legacy exercise values migrate only when their workbook-scoped destination is empty", async () => {
  const { loadExerciseValue } = await import("../assets/js/blead-prompts.js");
  const values = new Map([
    ["kaindly:blead:session-1:prompt-01:title", "Legacy title"],
    ["kaindly:workbook:bracco-session-1:exercise:prompt-01:field:title", ""],
    ["kaindly:blead:session-1:prompt-01:team", "Legacy team"],
    ["kaindly:workbook:bracco-session-1:exercise:prompt-01:field:team", "Current team"],
    ["kaindly:blead:session-1:prompt-01:notes", "Legacy notes"],
  ]);
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
  };

  assert.equal(loadExerciseValue(storage, "prompt-01", "title"), "Legacy title");
  assert.equal(
    values.get("kaindly:workbook:bracco-session-1:exercise:prompt-01:field:title"),
    "Legacy title",
  );
  assert.equal(loadExerciseValue(storage, "prompt-01", "team"), "Current team");
  assert.equal(
    values.get("kaindly:workbook:bracco-session-1:exercise:prompt-01:field:team"),
    "Current team",
  );
  assert.equal(loadExerciseValue(storage, "prompt-01", "notes"), "Legacy notes");
  assert.equal(
    values.get("kaindly:workbook:bracco-session-1:exercise:prompt-01:notes"),
    "Legacy notes",
  );
});

test("workbook startup uses the persisted Blead ID and protected response endpoint", async () => {
  const { initializePromptWorkbook } = await import("../assets/js/blead-prompts.js");
  const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
  const values = new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
  };
  const requests = [];
  const documentRoot = {
    visibilityState: "visible",
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {},
  };

  const sync = initializePromptWorkbook(documentRoot, storage, {
    cryptoApi: { randomUUID: () => participantId },
    fetchImpl: async (url, options = {}) => {
      requests.push([url, options]);
      return { ok: true, json: async () => ({ responses: [] }) };
    },
    windowRoot: { addEventListener() {} },
    navigatorRoot: {},
  });
  await sync.ready;

  assert.equal(
    values.get("kaindly:workbook:bracco-session-1:participant-id"),
    participantId,
  );
  assert.deepEqual(
    requests.map(([url]) => url),
    [`/Blead/api/responses?participantId=${participantId}`],
  );
});
