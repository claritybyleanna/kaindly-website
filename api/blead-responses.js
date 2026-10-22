import {createLiveConnectionsHandler,EVENT} from '../lib/owr-connections-live.js';
import { createNextMoveStore } from "../lib/owr-next-move-store.js";
import { createNextMoveHandlers } from "../lib/owr-next-move-api.js";
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

const OWR_WORKBOOKS = new Set(["owr-career-architecture", "owr-purposeful-next-move"]);

function isOwrRequest(request) {
  return OWR_WORKBOOKS.has(new URL(request.url).searchParams.get("workbook"));
}

async function authorizeOwr(request) {
  const token = readCookie(request.headers.get("cookie"), OWR_COOKIE_NAME);
  return verifyOwrSession(token, process.env.OWR_SESSION_SECRET);
}

function owrHandlers(request) {
  const registration = getWorkbookRegistration(new URL(request.url).searchParams.get("workbook"));
  const store = createWorkbookResponseStore((text, values) => getWorkbookQuery()(text, values));
  return createParticipantResponseHandlers({ registration, authorize: authorizeOwr, store });
}

function nextMove(request) { return createNextMoveHandlers({store:createNextMoveStore((text,values)=>getWorkbookQuery()(text,values))})(request); }
function isNextMove(request) { return new URL(request.url).searchParams.get("workbook") === "owr-purposeful-next-move"; }

export function GET(request) {
  if(new URL(request.url).searchParams.get('workbook')===EVENT)return createLiveConnectionsHandler({query:(text,values)=>getWorkbookQuery()(text,values)})(request);
  if (isNextMove(request)) return nextMove(request);
  return isOwrRequest(request) ? owrHandlers(request).GET(request) : getBleadResponses(request);
}

export function POST(request) {
  if(new URL(request.url).searchParams.get('workbook')===EVENT)return createLiveConnectionsHandler({query:(text,values)=>getWorkbookQuery()(text,values)})(request);
  if (isNextMove(request)) return nextMove(request);
  return isOwrRequest(request) ? owrHandlers(request).POST(request) : postBleadResponse(request);
}

export function DELETE(request) {
  if(new URL(request.url).searchParams.get('workbook')===EVENT)return createLiveConnectionsHandler({query:(text,values)=>getWorkbookQuery()(text,values)})(request);
  if (isNextMove(request)) return nextMove(request);
  return isOwrRequest(request) ? owrHandlers(request).DELETE(request) : deleteBleadResponse(request);
}
