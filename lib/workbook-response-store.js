import { validateParticipantId } from "./workbook-response-domain.js";

const RETURNING_COLUMNS = `
  client_id,
  program_id,
  participant_id,
  workbook_id,
  exercise_id,
  payload,
  created_at,
  updated_at,
  delete_after
`;

const FILTER_KEYS = new Set([
  "clientId",
  "programId",
  "workbookId",
  "exerciseId",
  "participantId",
  "from",
  "to",
  "search",
]);

function requireRegistration(registration) {
  if (
    !registration?.client?.id
    || !registration?.program?.id
    || !registration?.workbook?.id
  ) {
    throw new TypeError("A workbook registration is required");
  }
  return registration;
}

function requireFilterString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} dashboard filter must be a non-empty string`);
  }
  return value;
}

function requireIsoTimestamp(value, label) {
  if (
    typeof value !== "string"
    || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value
  ) {
    throw new TypeError(`${label} dashboard filter must be an ISO timestamp`);
  }
  return value;
}

function buildDashboardWhere(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("Dashboard filters must be an object");
  }

  for (const key of Object.keys(filters)) {
    if (!FILTER_KEYS.has(key)) throw new TypeError(`Unknown dashboard filter: ${key}`);
  }

  const clauses = [];
  const values = [];
  const add = (clause, value) => {
    values.push(value);
    clauses.push(`${clause} $${values.length}`);
  };

  if (filters.clientId !== undefined) {
    add("client_id =", requireFilterString(filters.clientId, "Client"));
  }
  if (filters.programId !== undefined) {
    add("program_id =", requireFilterString(filters.programId, "Program"));
  }
  if (filters.workbookId !== undefined) {
    add("workbook_id =", requireFilterString(filters.workbookId, "Workbook"));
  }
  if (filters.exerciseId !== undefined) {
    add("exercise_id =", requireFilterString(filters.exerciseId, "Exercise"));
  }
  if (filters.participantId !== undefined) {
    add("participant_id =", validateParticipantId(filters.participantId));
  }

  const from = filters.from === undefined
    ? undefined
    : requireIsoTimestamp(filters.from, "From");
  const to = filters.to === undefined
    ? undefined
    : requireIsoTimestamp(filters.to, "To");
  if (from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to)) {
    throw new RangeError("Dashboard date range must begin before it ends");
  }
  if (from !== undefined) add("updated_at >=", from);
  if (to !== undefined) add("updated_at <=", to);

  if (filters.search !== undefined) {
    const search = requireFilterString(filters.search, "Search");
    add("payload::text ILIKE", `%${search}%`);
  }

  const castDates = clauses.map((clause) => (
    clause.startsWith("updated_at ") ? `${clause}::timestamptz` : clause
  ));
  return {
    clauses: castDates,
    values,
    sql: castDates.length ? `WHERE ${castDates.join("\n          AND ")}` : "",
  };
}

export function createWorkbookResponseStore(query) {
  if (typeof query !== "function") {
    throw new TypeError("A database query function is required");
  }

  return {
    async upsert(snapshot) {
      return query(`
        INSERT INTO blead_workbook_responses (
          client_id,
          program_id,
          participant_id,
          workbook_id,
          exercise_id,
          payload,
          delete_after
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
        ON CONFLICT (participant_id, workbook_id, exercise_id)
        DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = now()
        RETURNING ${RETURNING_COLUMNS}
      `, [
        snapshot.clientId,
        snapshot.programId,
        snapshot.participantId,
        snapshot.workbookId,
        snapshot.exerciseId,
        JSON.stringify(snapshot.payload),
        snapshot.deleteAfter,
      ]);
    },

    async listByParticipant(participantId, registration) {
      const approved = requireRegistration(registration);
      const anonymousId = validateParticipantId(participantId);
      return query(`
        SELECT ${RETURNING_COLUMNS}
        FROM blead_workbook_responses
        WHERE participant_id = $1
          AND client_id = $2
          AND program_id = $3
          AND workbook_id = $4
        ORDER BY exercise_id
      `, [
        anonymousId,
        approved.client.id,
        approved.program.id,
        approved.workbook.id,
      ]);
    },

    async deleteOne(snapshot) {
      return query(`
        DELETE FROM blead_workbook_responses
        WHERE participant_id = $1
          AND client_id = $2
          AND program_id = $3
          AND workbook_id = $4
          AND exercise_id = $5
        RETURNING ${RETURNING_COLUMNS}
      `, [
        validateParticipantId(snapshot.participantId),
        snapshot.clientId,
        snapshot.programId,
        snapshot.workbookId,
        snapshot.exerciseId,
      ]);
    },

    async listDashboard(filters = {}) {
      const where = buildDashboardWhere(filters);
      return query(`
        SELECT ${RETURNING_COLUMNS}
        FROM blead_workbook_responses
        ${where.sql}
        ORDER BY updated_at DESC, participant_id, exercise_id
      `, where.values);
    },

    async countDashboard(filters = {}) {
      const where = buildDashboardWhere(filters);
      return query(`
        SELECT
          COUNT(DISTINCT client_id)::integer AS clients,
          COUNT(DISTINCT workbook_id)::integer AS workbooks,
          COUNT(DISTINCT (workbook_id, participant_id))::integer AS participants,
          COUNT(*)::integer AS responses
        FROM blead_workbook_responses
        ${where.sql}
      `, where.values);
    },

    async deleteExpired(now = new Date()) {
      const threshold = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
      return query(`
        DELETE FROM blead_workbook_responses
        WHERE delete_after <= $1::timestamptz
        RETURNING participant_id
      `, [threshold]);
    },
  };
}
