import { getWorkbookRegistration } from "./workbook-registry.js";
import {
  normalizeWorkbookSnapshot,
  responsesToCsv as workbookResponsesToCsv,
  retentionHasEnded as workbookRetentionHasEnded,
} from "./workbook-response-domain.js";

const registration = getWorkbookRegistration("bracco-leadership-session-1");
export const BLEAD_WORKBOOK_ID = registration.workbook.id;
export const BLEAD_DELETE_AFTER = registration.deleteAfter;
export { validateParticipantId } from "./workbook-response-domain.js";

function registrationForContent(content) {
  return { ...registration, exercises: content?.prompts ?? [] };
}

export function normalizeExerciseSnapshot(input, content) {
  const { participantId, workbookId, exerciseId, payload } = normalizeWorkbookSnapshot(input, registrationForContent(content));
  return { participantId, workbookId, exerciseId, payload };
}

export function retentionHasEnded(now = new Date(), deadline = BLEAD_DELETE_AFTER) {
  return workbookRetentionHasEnded(now, deadline);
}

export function responsesToCsv(rows, content) {
  // Legacy callers omit workbook_id because this export only serves Blead.
  const workbookRows = rows.map((row) => ({ ...row, workbook_id: BLEAD_WORKBOOK_ID }));
  return workbookResponsesToCsv(workbookRows, [registrationForContent(content)], { includeIdentity: false });
}
