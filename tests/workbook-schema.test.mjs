import assert from "node:assert/strict";
import test from "node:test";
import { packOneContent } from "../bsales/pack-1/content.js";
import { packTwoContent } from "../bsales/pack-2/content.js";
import { createBsalesSchemas, createPromptExerciseSchema } from "../lib/workbook-schema.js";

test("creates a normalized prompt exercise schema", () => {
  assert.deepEqual(createPromptExerciseSchema({
    id: "exercise-a",
    title: "Exercise A",
    fields: [{ id: "role", label: "Your role" }],
    noteField: true,
  }), {
    id: "exercise-a",
    title: "Exercise A",
    fields: [{ id: "role", label: "Your role" }],
    acceptsNotes: true,
  });
});

test("keeps fieldless Bsales prompts and derives stable personalization IDs", () => {
  const exercises = createBsalesSchemas(packOneContent);
  const [fieldlessPrompt, firstPersonalizedPrompt] = exercises;

  assert.equal(fieldlessPrompt.id, "prompt-01");
  assert.deepEqual(fieldlessPrompt.fields, []);
  assert.equal(firstPersonalizedPrompt.id, "prompt-02");
  assert.equal(firstPersonalizedPrompt.fields[0].id, "field-01");
  assert.equal(firstPersonalizedPrompt.fields[0].label, "YOUR ROLE");
  assert.deepEqual(createBsalesSchemas(packOneContent), exercises);
});

test("generates fields for every unique authored Bsales placeholder in order", () => {
  const [exercise] = createBsalesSchemas({
    prompts: [{ number: 1, title: "Placeholder test", prompt: "[FIRST] then [SECOND], then [FIRST]." }],
  });

  assert.deepEqual(exercise.fields, [
    { id: "field-01", label: "FIRST" },
    { id: "field-02", label: "SECOND" },
  ]);
});

test("includes setup and prompt exercises for Bsales Pack 2", () => {
  const exercises = createBsalesSchemas(packTwoContent);

  assert.equal(exercises[0].id, "setup-01");
  assert.equal(exercises[0].title, "Coaching Log");
  assert.equal(exercises.at(-1).id, "prompt-08");
});
