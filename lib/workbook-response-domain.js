const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_FIELD_LENGTH = 12_000;
const MAX_NOTES_LENGTH = 20_000;
const MAX_REQUEST_BYTES = 64 * 1024;

export function validateParticipantId(value) {
  const participantId = String(value ?? "");
  if (!UUID.test(participantId)) {
    throw new Error("A valid anonymous participant ID is required");
  }
  return participantId;
}

export function normalizeWorkbookSnapshot(input, registration) {
  const participantId = validateParticipantId(input?.participantId);
  const exercise = registration.exercises.find(({ id }) => id === input?.exerciseId);
  if (!exercise) throw new Error("An approved exercise ID is required");
  const allowedFields = new Set(exercise.fields.map(({ id }) => id));
  const entries = Object.entries(input?.fields ?? {});
  if (entries.some(([id]) => !allowedFields.has(id))) throw new Error("Unknown field for this exercise");
  const normalizedFields = Object.fromEntries(entries.map(([id, value]) => [id, String(value ?? "")]));
  if (Object.values(normalizedFields).some((value) => value.length > MAX_FIELD_LENGTH)) {
    throw new Error("Exercise field exceeds the size limit");
  }
  const notes = String(input?.notes ?? "");
  if (notes.length > MAX_NOTES_LENGTH) throw new Error("Exercise notes exceed the size limit");
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > MAX_REQUEST_BYTES) {
    throw new Error("Request exceeds the size limit");
  }
  return {
    clientId: registration.client.id,
    programId: registration.program.id,
    workbookId: registration.workbook.id,
    participantId,
    exerciseId: exercise.id,
    payload: { fields: normalizedFields, notes },
    deleteAfter: registration.deleteAfter,
  };
}

export function retentionHasEnded(now, deleteAfter) {
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return currentTime >= new Date(deleteAfter).getTime();
}

export function formatDashboardResponse(row, registration) {
  if (row.workbook_id !== registration.workbook.id) {
    throw new Error("Unknown or mismatched workbook in dashboard response");
  }
  const index = registration.exercises.findIndex(({ id }) => id === row.exercise_id);
  if (index < 0) throw new Error("Unknown exercise in dashboard response");
  const exercise = registration.exercises[index];
  const values = row.payload?.fields ?? {};
  return {
    client_id: registration.client.id,
    client_name: registration.client.name,
    program_id: registration.program.id,
    program_name: registration.program.name,
    workbook_id: registration.workbook.id,
    workbook_name: registration.workbook.name,
    participant_id: row.participant_id,
    exercise_id: exercise.id,
    exercise_number: index + 1,
    exercise_title: exercise.title,
    fields: [...exercise.fields.filter(({ id }) => Object.hasOwn(values, id))
      .map(({ id, label }) => ({ id, label, value: String(values[id] ?? "") })),
      ...(row.workbook_id === "owr-purposeful-next-move" && Array.isArray(row.payload?.questions) ? row.payload.questions.flatMap((question,index) => [
        {id:"question-"+index,label:"Question "+(index+1),value:String(question.question ?? "")},
        {id:"answer-"+index,label:"Facilitator answer "+(index+1),value:String(question.answer ?? "")},
        {id:"status-"+index,label:"Question status "+(index+1),value:String(question.status ?? "open")},
      ]) : [])],
    notes: String(row.payload?.notes ?? ""),
    created_at: row.created_at,
    updated_at: row.updated_at,
    delete_after: row.delete_after,
  };
}

function csvValue(value) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

// The compatibility option keeps the existing Blead seven-column export intact.
export function responsesToCsv(rows, registrations, { includeIdentity = true } = {}) {
  const byWorkbook = new Map(registrations.map((registration) => [registration.workbook.id, registration]));
  const header = [
    ...(includeIdentity ? ["Client", "Program", "Workbook"] : []),
    "Participant ID", "Exercise", "Field", "Response", "Notes", "Updated At", "Delete After",
  ];
  const body = rows.flatMap((row) => {
    const registration = byWorkbook.get(row.workbook_id);
    if (!registration) throw new Error("Cannot export an unknown workbook");
    const response = formatDashboardResponse(row, registration);
    const fields = response.fields.length ? response.fields : [{ label: "", value: "" }];
    return fields.map((field, index) => [
      ...(includeIdentity ? [response.client_name, response.program_name, response.workbook_name] : []),
      response.participant_id, response.exercise_title, field.label, field.value,
      index === 0 ? response.notes : "", response.updated_at, response.delete_after,
    ]);
  });
  return [header, ...body].map((columns) => columns.map(csvValue).join(",")).join("\r\n") + "\r\n";
}
