import { readCookie } from "../lib/blead-auth.js";
import {
  OWR_COOKIE_NAME,
  verifyOwrSession,
} from "../lib/owr-auth.js";
import { getWorkbookQuery } from "../lib/blead-db.js";
import { getWorkbookRegistration } from "../lib/workbook-registry.js";
import { createParticipantResponseHandlers } from "../lib/workbook-response-api.js";
import { createWorkbookResponseStore } from "../lib/workbook-response-store.js";
import {
  DELETE as deleteBleadResponse,
  GET as getBleadResponses,
  POST as postBleadResponse,
} from "./workbook-responses-blead.js";

const OWR_WORKBOOK = "owr-career-architecture";

function isOwrRequest(request) {
  return new URL(request.url).searchParams.get("workbook") === OWR_WORKBOOK;
}

async function authorizeOwr(request) {
  const token = readCookie(request.headers.get("cookie"), OWR_COOKIE_NAME);
  return verifyOwrSession(token, process.env.OWR_SESSION_SECRET);
}

function owrHandlers() {
  const registration = getWorkbookRegistration(OWR_WORKBOOK);
  const store = createWorkbookResponseStore((text, values) => getWorkbookQuery()(text, values));
  return createParticipantResponseHandlers({ registration, authorize: authorizeOwr, store });
}

export function GET(request) {
  return isOwrRequest(request) ? owrHandlers().GET(request) : getBleadResponses(request);
}

export function POST(request) {
  return isOwrRequest(request) ? owrHandlers().POST(request) : postBleadResponse(request);
}

export function DELETE(request) {
  return isOwrRequest(request) ? owrHandlers().DELETE(request) : deleteBleadResponse(request);
}
