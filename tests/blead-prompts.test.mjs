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

test("prompt exercises compile personalized copy and persist only in local storage", async () => {
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

  const copied = [];
  await copyPrompt({ writeText(value) { copied.push(value); return Promise.resolve(); } }, "Personalized prompt");
  assert.deepEqual(copied, ["Personalized prompt"]);
});
