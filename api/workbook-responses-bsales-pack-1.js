import { readCookie } from "../lib/blead-auth.js";
import {
  BSALES_COOKIE_NAME,
  verifyBsalesSession,
} from "../lib/bsales-auth.js";
import { getWorkbookQuery } from "../lib/blead-db.js";
import { getWorkbookRegistration } from "../lib/workbook-registry.js";
import { createParticipantResponseHandlers } from "../lib/workbook-response-api.js";
import { createWorkbookResponseStore } from "../lib/workbook-response-store.js";

const registration = getWorkbookRegistration("bracco-sales-pack-1");

async function authorize(request) {
  const token = readCookie(request.headers.get("cookie"), BSALES_COOKIE_NAME);
  return verifyBsalesSession(token, process.env.BSALES_SESSION_SECRET);
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
