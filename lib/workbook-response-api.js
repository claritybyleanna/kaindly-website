import {
  formatDashboardResponse,
  normalizeWorkbookSnapshot,
  responsesToCsv,
  retentionHasEnded,
  validateParticipantId,
} from "./workbook-response-domain.js";
import { listWorkbookRegistrations } from "./workbook-registry.js";

const RESPONSE_HEADERS = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8",
  "x-robots-tag": "noindex, nofollow",
};
const MAX_REQUEST_BYTES = 64 * 1024;
const DASHBOARD_QUERY_KEYS = new Set([
  "client",
  "program",
  "workbook",
  "exercise",
  "participant",
  "from",
  "to",
  "search",
]);

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

function requireExactValue(value, label) {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new TypeError(`${label} dashboard filter must be a non-empty exact value`);
  }
  return value;
}

function parseDateFilter(value, label, endOfDay) {
  const input = requireExactValue(value, label);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(input)) {
    const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    const timestamp = `${input}${suffix}`;
    if (new Date(timestamp).toISOString() !== timestamp) {
      throw new TypeError(`${label} dashboard filter must be a valid date`);
    }
    return timestamp;
  }
  if (!Number.isFinite(Date.parse(input)) || new Date(input).toISOString() !== input) {
    throw new TypeError(`${label} dashboard filter must be a date or ISO timestamp`);
  }
  return input;
}

function uniqueById(values) {
  const seen = new Set();
  return values.filter(({ id }) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function requireRegistry(registry) {
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new TypeError("A dashboard workbook registry is required");
  }
  return registry;
}

export function parseDashboardFilters(url, registry = listWorkbookRegistrations()) {
  const registrations = requireRegistry(registry);
  const parsedUrl = url instanceof URL ? url : new URL(url);
  const params = parsedUrl.searchParams;
  for (const key of params.keys()) {
    if (!DASHBOARD_QUERY_KEYS.has(key)) {
      throw new TypeError(`Unknown dashboard filter: ${key}`);
    }
    if (params.getAll(key).length !== 1) {
      throw new TypeError(`Duplicate dashboard filter: ${key}`);
    }
  }

  const filters = {};
  const client = params.get("client");
  const program = params.get("program");
  const workbook = params.get("workbook");
  const exercise = params.get("exercise");
  const participant = params.get("participant");
  const from = params.get("from");
  const to = params.get("to");
  const search = params.get("search");

  if (client !== null) {
    filters.clientId = requireExactValue(client, "Client");
    if (!registrations.some((entry) => entry.client.id === filters.clientId)) {
      throw new TypeError("Unknown client dashboard filter");
    }
  }
  if (program !== null) {
    filters.programId = requireExactValue(program, "Program");
    if (!registrations.some((entry) => entry.program.id === filters.programId)) {
      throw new TypeError("Unknown program dashboard filter");
    }
  }
  if (workbook !== null) {
    filters.workbookId = requireExactValue(workbook, "Workbook");
    if (!registrations.some((entry) => entry.workbook.id === filters.workbookId)) {
      throw new TypeError("Unknown workbook dashboard filter");
    }
  }
  if (exercise !== null) {
    filters.exerciseId = requireExactValue(exercise, "Exercise");
    const exerciseRegistrations = filters.workbookId
      ? registrations.filter((entry) => entry.workbook.id === filters.workbookId)
      : registrations;
    if (!exerciseRegistrations.some((entry) => entry.exercises.some(({ id }) => id === filters.exerciseId))) {
      throw new TypeError("Unknown exercise dashboard filter");
    }
  }
  if (participant !== null) filters.participantId = validateParticipantId(participant);
  if (filters.participantId && !filters.workbookId) {
    throw new TypeError("Participant dashboard filter requires a workbook filter");
  }
  if (from !== null) filters.from = parseDateFilter(from, "From", false);
  if (to !== null) filters.to = parseDateFilter(to, "To", true);
  if (filters.from && filters.to && Date.parse(filters.from) > Date.parse(filters.to)) {
    throw new RangeError("Dashboard date range must begin before it ends");
  }
  if (search !== null) {
    const normalized = search.trim();
    if (!normalized || normalized.length > 1_000) {
      throw new TypeError("Search dashboard filter must contain 1 to 1000 characters");
    }
    filters.search = normalized;
  }

  const identityFiltersPresent = filters.clientId
    || filters.programId
    || filters.workbookId
    || filters.exerciseId;
  const hasMatchingRegistration = registrations.some((entry) => (
    (!filters.clientId || entry.client.id === filters.clientId)
    && (!filters.programId || entry.program.id === filters.programId)
    && (!filters.workbookId || entry.workbook.id === filters.workbookId)
    && (!filters.exerciseId || entry.exercises.some(({ id }) => id === filters.exerciseId))
  ));
  if (identityFiltersPresent && !hasMatchingRegistration) {
    throw new TypeError("Dashboard identity filter combination is not registered");
  }

  return filters;
}

function responseHeaders(contentType = "application/json; charset=utf-8") {
  return {
    "cache-control": "private, no-store",
    "content-type": contentType,
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow",
  };
}

function dashboardJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(),
  });
}

function normalizeSummary(rows) {
  const summary = rows?.[0] ?? {};
  return Object.fromEntries(["clients", "workbooks", "participants", "responses"].map((key) => {
    const value = Number(summary[key] ?? 0);
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Invalid dashboard summary");
    return [key, value];
  }));
}

function registrationMap(registry) {
  return new Map(registry.map((registration) => [registration.workbook.id, registration]));
}

function formatResponse(row, registrations) {
  const registration = registrations.get(row.workbook_id);
  if (!registration) throw new Error("Unknown workbook in dashboard response");
  const response = formatDashboardResponse(row, registration);
  return {
    client: { id: response.client_id, name: response.client_name },
    program: { id: response.program_id, name: response.program_name },
    workbook: { id: response.workbook_id, name: response.workbook_name },
    participantId: response.participant_id,
    exercise: {
      id: response.exercise_id,
      number: response.exercise_number,
      title: response.exercise_title,
    },
    fields: response.fields,
    notes: response.notes,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    deleteAfter: response.delete_after,
  };
}

function buildDirectory(registry, rows, currentTime) {
  return registry.map((registration) => {
    const workbookRows = rows.filter(({ workbook_id: workbookId }) => workbookId === registration.workbook.id);
    const latestActivity = workbookRows.reduce((latest, row) => {
      if (!latest || Date.parse(row.updated_at) > Date.parse(latest)) return row.updated_at;
      return latest;
    }, null);
    return {
      client: registration.client,
      program: registration.program,
      workbook: registration.workbook,
      hubUrl: registration.hubUrl,
      responseCount: workbookRows.length,
      latestActivity,
      deleteAfter: registration.deleteAfter,
      expired: retentionHasEnded(currentTime, registration.deleteAfter),
    };
  });
}

function buildFilterOptions(registry, responses) {
  const participantOptions = new Map();
  for (const response of responses) {
    const option = { id: response.participantId, workbookId: response.workbook.id };
    participantOptions.set(`${option.workbookId}\u0000${option.id}`, option);
  }
  return {
    clients: uniqueById(registry.map(({ client }) => ({ ...client }))),
    programs: uniqueById(registry.map(({ client, program }) => ({ ...program, clientId: client.id }))),
    workbooks: registry.map(({ client, program, workbook }) => ({
      ...workbook,
      clientId: client.id,
      programId: program.id,
    })),
    exercises: registry.flatMap(({ workbook, exercises }) => exercises.map(({ id, title }) => ({
      id,
      title,
      workbookId: workbook.id,
    }))),
    participants: [...participantOptions.values()].sort((left, right) => (
      left.workbookId.localeCompare(right.workbookId) || left.id.localeCompare(right.id)
    )),
  };
}

export function createDashboardHandlers({
  authorize,
  store,
  registry,
  now = () => new Date(),
  logger = console,
  requestId = safeRequestId,
} = {}) {
  const registrations = requireRegistry(registry);
  if (typeof authorize !== "function") {
    throw new TypeError("A dashboard authorization function is required");
  }
  if (!store || typeof store.listDashboard !== "function" || typeof store.countDashboard !== "function") {
    throw new TypeError("A dashboard response store is required");
  }
  const registrationsByWorkbook = registrationMap(registrations);

  async function authorized(request) {
    try {
      return Boolean(await authorize(request));
    } catch {
      return false;
    }
  }

  function filtersFor(request) {
    return parseDashboardFilters(new URL(request.url), registrations);
  }

  async function GET(request) {
    if (!await authorized(request)) return dashboardJson({ error: "Authentication required" }, 401);

    let filters;
    try {
      filters = filtersFor(request);
    } catch {
      return dashboardJson({ error: "Invalid dashboard filters" }, 400);
    }

    const id = requestId();
    try {
      const [summaryRows, rows, allRows] = await Promise.all([
        store.countDashboard(filters),
        store.listDashboard(filters),
        store.listDashboard({}),
      ]);
      const responses = rows.map((row) => formatResponse(row, registrationsByWorkbook));
      const current = now();
      return dashboardJson({
        summary: normalizeSummary(summaryRows),
        directory: buildDirectory(registrations, allRows, current),
        filters: buildFilterOptions(registrations, responses),
        responses,
      });
    } catch {
      logFailure(logger, "dashboard_database_read", id);
      return dashboardJson({ error: "Unable to load responses" }, 500);
    }
  }

  async function EXPORT(request) {
    if (!await authorized(request)) return dashboardJson({ error: "Authentication required" }, 401);

    let filters;
    try {
      filters = filtersFor(request);
    } catch {
      return dashboardJson({ error: "Invalid dashboard filters" }, 400);
    }

    const id = requestId();
    try {
      const rows = await store.listDashboard(filters);
      const csv = responsesToCsv(rows, registrations);
      const current = now();
      const date = (current instanceof Date ? current : new Date(current)).toISOString().slice(0, 10);
      return new Response(csv, {
        status: 200,
        headers: {
          ...responseHeaders("text/csv; charset=utf-8"),
          "content-disposition": `attachment; filename="kaindly-facilitator-responses-${date}.csv"`,
        },
      });
    } catch {
      logFailure(logger, "dashboard_database_export", id);
      return dashboardJson({ error: "Unable to export responses" }, 500);
    }
  }

  return { EXPORT, GET };
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

  async function DELETE(request) {
    if (!await isAuthorized(request)) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return jsonResponse({ error: "Invalid request origin" }, 403);
    }
    if (typeof store.deleteOne !== "function") {
      return jsonResponse({ error: "Unable to withdraw response" }, 501);
    }

    let snapshot;
    try {
      snapshot = await readSnapshot(request, registration);
    } catch {
      return jsonResponse({ error: "Invalid exercise response" }, 400);
    }

    const id = requestId();
    try {
      const rows = await store.deleteOne(snapshot);
      return jsonResponse({ withdrawn: rows.length > 0 });
    } catch {
      logFailure(logger, "database_delete", id);
      return jsonResponse({ error: "Unable to withdraw response" }, 500);
    }
  }

  return { DELETE, GET, POST };
}
