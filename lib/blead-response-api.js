import { promptPackContent } from "../Blead/session-1-prompts/content.js";
import {
  BLEAD_COOKIE_NAME,
  BLEAD_FACILITATOR_COOKIE_NAME,
  readCookie,
  verifyBleadFacilitatorSession,
  verifyBleadSession,
} from "./blead-auth.js";
import {
  responsesToCsv,
  retentionHasEnded,
} from "./blead-response-domain.js";
import { getWorkbookRegistration } from "./workbook-registry.js";
import { createParticipantResponseHandlers as createWorkbookParticipantHandlers } from "./workbook-response-api.js";

const RESPONSE_HEADERS = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
};
const BLEAD_REGISTRATION = getWorkbookRegistration("bracco-leadership-session-1");

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

function formatFacilitatorResponse(row) {
  const prompt = promptPackContent.prompts.find(({ id }) => id === row.exercise_id);
  if (!prompt) throw new Error("Unknown exercise in facilitator response");
  const values = row.payload?.fields ?? {};
  return {
    participant_id: row.participant_id,
    workbook_id: row.workbook_id,
    exercise_id: row.exercise_id,
    exercise_number: prompt.number,
    exercise_title: prompt.title,
    fields: prompt.fields
      .filter(({ id }) => Object.hasOwn(values, id))
      .map(({ id, label }) => ({ id, label, value: String(values[id] ?? "") })),
    notes: String(row.payload?.notes ?? ""),
    created_at: row.created_at,
    updated_at: row.updated_at,
    delete_after: row.delete_after,
  };
}

export function createParticipantResponseHandlers({
  store,
  now = () => new Date(),
  logger = console,
  requestId = safeRequestId,
} = {}) {
  async function authorize(request) {
    const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
    const current = now();
    const currentTime = current instanceof Date ? current.getTime() : new Date(current).getTime();
    return verifyBleadSession(token, process.env.BLEAD_SESSION_SECRET, currentTime);
  }
  return createWorkbookParticipantHandlers({
    registration: BLEAD_REGISTRATION,
    authorize,
    store,
    now,
    logger,
    requestId,
  });
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
    if (result.response) return result.response;
    try {
      return jsonResponse({ responses: result.rows.map(formatFacilitatorResponse) });
    } catch {
      logFailure(logger, "facilitator_response_format", requestId());
      return jsonResponse({ error: "Unable to load responses" }, 500);
    }
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

export function createRetentionHandler({ store, now = () => new Date() } = {}) {
  if (!store || typeof store.deleteExpired !== "function") {
    throw new TypeError("A retention response store is required");
  }

  return async function GET(request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "cache-control": "no-store" },
      });
    }

    const current = now();
    const currentDate = current instanceof Date ? current : new Date(current);
    const headers = {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    };
    if (!retentionHasEnded(currentDate)) {
      return new Response(JSON.stringify({ ok: true, deleted: 0, active: true }), {
        status: 200,
        headers,
      });
    }

    const deleted = await store.deleteExpired(currentDate.toISOString());
    return new Response(JSON.stringify({ ok: true, deleted: deleted.length, active: false }), {
      status: 200,
      headers,
    });
  };
}
