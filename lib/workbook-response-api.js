import {
  normalizeWorkbookSnapshot,
  retentionHasEnded,
  validateParticipantId,
} from "./workbook-response-domain.js";

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
  logger.error("workbook_response_api_error", { category, requestId });
}

async function readTextWithinLimit(request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new Error("Request exceeds the size limit");
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("Request exceeds the size limit");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function readSnapshot(request, registration) {
  const text = await readTextWithinLimit(request);
  const input = JSON.parse(text);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("One exercise snapshot is required");
  }
  return normalizeWorkbookSnapshot(input, registration);
}

export function createParticipantResponseHandlers({
  registration,
  authorize,
  store,
  now = () => new Date(),
  logger = console,
  requestId = safeRequestId,
} = {}) {
  if (!registration?.client?.id || !registration?.program?.id || !registration?.workbook?.id) {
    throw new TypeError("A route-owned workbook registration is required");
  }
  if (typeof authorize !== "function") {
    throw new TypeError("A participant authorization function is required");
  }
  if (!store || typeof store.upsert !== "function" || typeof store.listByParticipant !== "function") {
    throw new TypeError("A participant response store is required");
  }

  async function isAuthorized(request) {
    try {
      return await authorize(request) === true;
    } catch {
      return false;
    }
  }

  async function GET(request) {
    if (!await isAuthorized(request)) {
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
      const responses = await store.listByParticipant(participantId, registration);
      return jsonResponse({ responses });
    } catch {
      logFailure(logger, "database_read", id);
      return jsonResponse({ error: "Unable to load responses" }, 500);
    }
  }

  async function POST(request) {
    if (!await isAuthorized(request)) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return jsonResponse({ error: "Invalid request origin" }, 403);
    }

    if (retentionHasEnded(now(), registration.deleteAfter)) {
      return jsonResponse({ error: "This workbook is no longer accepting responses" }, 410);
    }

    let snapshot;
    try {
      snapshot = await readSnapshot(request, registration);
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
