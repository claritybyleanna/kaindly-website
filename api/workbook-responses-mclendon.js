import { readCookie } from "../lib/blead-auth.js";
import { getWorkbookQuery } from "../lib/blead-db.js";
import {
  MCLENDON_COOKIE_NAME,
  isValidMclendonSessionSecret,
  verifyMclendonSession,
} from "../lib/mclendon-auth.js";
import { getWorkbookRegistration } from "../lib/workbook-registry.js";
import { createParticipantResponseHandlers } from "../lib/workbook-response-api.js";
import { createWorkbookResponseStore } from "../lib/workbook-response-store.js";

const registration = getWorkbookRegistration("mclendon-working-smarter");

async function authorize(request) {
  const secret = process.env.MCLENDON_SESSION_SECRET;
  if (!isValidMclendonSessionSecret(secret, {
    reservedSecrets: [
      process.env.BLEAD_SESSION_SECRET,
      process.env.BLEAD_FACILITATOR_SESSION_SECRET,
      process.env.BSALES_SESSION_SECRET,
    ],
  })) {
    return false;
  }
  const token = readCookie(request.headers.get("cookie"), MCLENDON_COOKIE_NAME);
  return verifyMclendonSession(token, secret);
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
