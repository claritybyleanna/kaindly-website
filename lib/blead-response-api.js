import { promptPackContent } from "../Blead/session-1-prompts/content.js";
import {
  BLEAD_COOKIE_NAME,
  BLEAD_FACILITATOR_COOKIE_NAME,
  readCookie,
  verifyBleadFacilitatorSession,
  verifyBleadSession,
} from "./blead-auth.js";
import {
  normalizeExerciseSnapshot,
  responsesToCsv,
  retentionHasEnded,
  validateParticipantId,
} from "./blead-response-domain.js";

const RESPONSE_HEADERS = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
};
const MAX_REQUEST_BYTES = 64 * 1024;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function safeRequestId() {
  return crypto.randomUUID();
}

function logFailure(logger, category, requestId) {
  logger.error("blead_response_api_error", { category, requestId });
}

async function readSnapshot(request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new Error("Request exceeds the size limit");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    throw new Error("Request exceeds the size limit");
  }

  const input = JSON.parse(text);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("One exercise snapshot is required");
  }
  return normalizeExerciseSnapshot(input, promptPackContent);
}

export function createParticipantResponseHandlers({
  store,
  now = () => new Date(),
  logger = console,
  requestId = safeRequestId,
} = {}) {
  if (!store || typeof store.upsert !== "function" || typeof store.listByParticipant !== "function") {
    throw new TypeError("A participant response store is required");
  }

  async function authorize(request) {
    const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
    const current = now();
    const currentTime = current instanceof Date ? current.getTime() : new Date(current).getTime();
    return verifyBleadSession(token, process.env.BLEAD_SESSION_SECRET, currentTime);
  }

  async function GET(request) {
    if (!await authorize(request)) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    let participantId;
    try {
      participantId = validateParticipantId(new URL(request.url).searchParams.get("participantId"));
    } catch {
      return jsonResponse({ error: "A valid anonymous participant ID is required" }, 400);
    }

    const id = requestId();
    try {
      const responses = await store.listByParticipant(participantId);
      return jsonResponse({ responses });
    } catch {
      logFailure(logger, "database_read", id);
      return jsonResponse({ error: "Unable to load responses" }, 500);
    }
  }

  async function POST(request) {
    if (!await authorize(request)) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return jsonResponse({ error: "Invalid request origin" }, 403);
    }

    if (retentionHasEnded(now())) {
      return jsonResponse({ error: "This workbook is no longer accepting responses" }, 410);
    }

    let snapshot;
    try {
      snapshot = await readSnapshot(request);
    } catch {
      return jsonResponse({ error: "Invalid exercise response" }, 400);
    }

    const id = requestId();
    try {
      const rows = await store.upsert(snapshot);
      return jsonResponse({ response: rows[0] ?? null });
    } catch {
      logFailure(logger, "database_write", id);
      return jsonResponse({ error: "Unable to save responses" }, 500);
    }
  }

  return { GET, POST };
}

export function createFacilitatorHandlers({
  store,
  now = () => new Date(),
  logger = console,
  requestId = safeRequestId,
} = {}) {
  if (!store || typeof store.listAll !== "function") {
    throw new TypeError("A facilitator response store is required");
  }

  async function authorize(request) {
    const token = readCookie(
      request.headers.get("cookie"),
      BLEAD_FACILITATOR_COOKIE_NAME,
    );
    const current = now();
    const currentTime = current instanceof Date ? current.getTime() : new Date(current).getTime();
    return verifyBleadFacilitatorSession(
      token,
      process.env.BLEAD_FACILITATOR_SESSION_SECRET,
      currentTime,
    );
  }

  async function loadRows(request, category) {
    if (!await authorize(request)) {
      return { response: jsonResponse({ error: "Authentication required" }, 401) };
    }
    const id = requestId();
    try {
      return { rows: await store.listAll() };
    } catch {
      logFailure(logger, category, id);
      return { response: jsonResponse({ error: "Unable to load responses" }, 500) };
    }
  }

  async function GET(request) {
    const result = await loadRows(request, "facilitator_database_read");
    return result.response ?? jsonResponse({ responses: result.rows });
  }

  async function EXPORT(request) {
    const result = await loadRows(request, "facilitator_database_export");
    if (result.response) return result.response;

    const csv = responsesToCsv(result.rows, promptPackContent);
    const current = now();
    const date = (current instanceof Date ? current : new Date(current)).toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="bracco-session-1-responses-${date}.csv"`,
        "content-type": "text/csv; charset=utf-8",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  }

  return { EXPORT, GET };
}
