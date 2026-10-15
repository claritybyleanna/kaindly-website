function freezeExercise(exercise) {
  exercise.fields.forEach(Object.freeze);
  Object.freeze(exercise.fields);
  return Object.freeze(exercise);
}

export function createPromptExerciseSchema({ id, title, fields = [], noteField = false }) {
  const normalizedFields = fields.map(({ id: fieldId, label }) => ({ id: fieldId, label }));

  return freezeExercise({
    id,
    title,
    fields: normalizedFields,
    acceptsNotes: Boolean(noteField),
  });
}

function fieldLabel(token) {
  return token.slice(1, -1)
    .replace(/^PASTE\s+/u, "")
    .replace(/\s+OR\s+.*$/u, "")
    .trim();
}

function createBsalesFields(prompt) {
  const tokens = [...prompt.matchAll(/\[[^\]\n]{2,140}\]/gu)].map(([token]) => token);
  const uniqueTokens = [...new Set(tokens)].filter((token) => token !== "[Inferred]" && !/^\[OR:/u.test(token));

  return uniqueTokens.map((token, index) => ({
    id: `field-${String(index + 1).padStart(2, "0")}`,
    label: fieldLabel(token),
  }));
}

export function createBsalesSchemas(content) {
  const setupExercises = (content.setup ?? []).map((item) => createPromptExerciseSchema({
    id: `setup-${String(item.number).padStart(2, "0")}`,
    title: item.title,
    fields: createBsalesFields(item.prompt),
  }));
  const promptExercises = (content.prompts ?? []).map((item) => createPromptExerciseSchema({
    id: `prompt-${String(item.number).padStart(2, "0")}`,
    title: item.title,
    fields: createBsalesFields(item.prompt),
  }));

  return Object.freeze([...setupExercises, ...promptExercises]);
}
