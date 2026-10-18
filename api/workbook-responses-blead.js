import {
  BLEAD_COOKIE_NAME,
  readCookie,
  verifyBleadSession,
} from "../lib/blead-auth.js";
import { getWorkbookQuery } from "../lib/blead-db.js";
import { getWorkbookRegistration } from "../lib/workbook-registry.js";
import { createParticipantResponseHandlers } from "../lib/workbook-response-api.js";
import { createWorkbookResponseStore } from "../lib/workbook-response-store.js";

const registration = getWorkbookRegistration("bracco-leadership-session-1");

async function authorize(request) {
  const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
  return verifyBleadSession(token, process.env.BLEAD_SESSION_SECRET);
}

function handlers() {
  const store = createWorkbookResponseStore((text, values) => getWorkbookQuery()(text, values));
  return createParticipantResponseHandlers({ registration, authorize, store });
}

export function GET(request) {
  return handlers().GET(request);
}

export function POST(request) {
  return handlers().POST(request);
}

export function DELETE(request) {
  return handlers().DELETE(request);
}
