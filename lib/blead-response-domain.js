export const BLEAD_WORKBOOK_ID = "bracco-session-1";
export const BLEAD_DELETE_AFTER = "2027-03-01T06:00:00.000Z";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_FIELD_LENGTH = 12_000;
const MAX_NOTES_LENGTH = 20_000;

export function validateParticipantId(value) {
  const participantId = String(value ?? "");
  if (!UUID.test(participantId)) {
    throw new Error("A valid anonymous participant ID is required");
  }
  return participantId;
}

export function normalizeExerciseSnapshot(input, content) {
  const participantId = validateParticipantId(input?.participantId);
  const prompt = content?.prompts?.find(({ id }) => id === input?.exerciseId);
  if (!prompt) throw new Error("An approved exercise ID is required");

  const allowedFields = new Set(prompt.fields.map(({ id }) => id));
  const entries = Object.entries(input?.fields ?? {});
  if (entries.some(([fieldId]) => !allowedFields.has(fieldId))) {
    throw new Error("Unknown field for this exercise");
  }
  if (entries.some(([, value]) => String(value ?? "").length > MAX_FIELD_LENGTH)) {
    throw new Error("Exercise field exceeds the size limit");
  }

  const notes = String(input?.notes ?? "");
  if (notes.length > MAX_NOTES_LENGTH) {
    throw new Error("Exercise notes exceed the size limit");
  }

  return {
    participantId,
    workbookId: BLEAD_WORKBOOK_ID,
    exerciseId: prompt.id,
    payload: {
      fields: Object.fromEntries(entries.map(([fieldId, value]) => [fieldId, String(value ?? "")])),
      notes,
    },
  };
}

export function retentionHasEnded(now = new Date(), deadline = BLEAD_DELETE_AFTER) {
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return currentTime >= new Date(deadline).getTime();
}

function csvValue(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function responsesToCsv(rows, content) {
  const header = [
    "Participant ID",
    "Exercise",
    "Field",
    "Response",
    "Notes",
    "Updated At",
    "Delete After",
  ];
  const body = rows.flatMap((row) => {
    const prompt = content?.prompts?.find(({ id }) => id === row.exercise_id);
    if (!prompt) throw new Error("Cannot export an unknown exercise");
    const labels = new Map(prompt.fields.map(({ id, label }) => [id, label]));
    const entries = Object.entries(row.payload?.fields ?? {});
    const exportEntries = entries.length ? entries : [["", ""]];
    return exportEntries.map(([fieldId, response], index) => [
      row.participant_id,
      prompt.title,
      fieldId ? labels.get(fieldId) ?? fieldId : "",
      response,
      index === 0 ? row.payload?.notes : "",
      row.updated_at,
      row.delete_after,
    ]);
  });

  return [header, ...body]
    .map((columns) => columns.map(csvValue).join(","))
    .join("\r\n") + "\r\n";
}
