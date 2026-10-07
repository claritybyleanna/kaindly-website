import {
  BLEAD_DELETE_AFTER,
  BLEAD_WORKBOOK_ID,
} from "./blead-response-domain.js";

const RETURNING_COLUMNS = `
  participant_id,
  workbook_id,
  exercise_id,
  payload,
  created_at,
  updated_at,
  delete_after
`;

export function createBleadResponseStore(query) {
  if (typeof query !== "function") {
    throw new TypeError("A database query function is required");
  }

  return {
    async upsert(snapshot) {
      return query(`
        INSERT INTO blead_workbook_responses (
          participant_id,
          workbook_id,
          exercise_id,
          payload,
          delete_after
        ) VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
        ON CONFLICT (participant_id, workbook_id, exercise_id)
        DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = now(),
          delete_after = EXCLUDED.delete_after
        RETURNING ${RETURNING_COLUMNS}
      `, [
        snapshot.participantId,
        snapshot.workbookId,
        snapshot.exerciseId,
        JSON.stringify(snapshot.payload),
        BLEAD_DELETE_AFTER,
      ]);
    },

    async listByParticipant(participantId) {
      return query(`
        SELECT ${RETURNING_COLUMNS}
        FROM blead_workbook_responses
        WHERE participant_id = $1
          AND workbook_id = $2
        ORDER BY exercise_id
      `, [participantId, BLEAD_WORKBOOK_ID]);
    },

    async listAll() {
      return query(`
        SELECT ${RETURNING_COLUMNS}
        FROM blead_workbook_responses
        WHERE workbook_id = $1
        ORDER BY updated_at DESC, participant_id, exercise_id
      `, [BLEAD_WORKBOOK_ID]);
    },

    async deleteExpired(now = new Date()) {
      const threshold = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
      return query(`
        DELETE FROM blead_workbook_responses
        WHERE delete_after <= $1
        RETURNING participant_id
      `, [threshold]);
    },
  };
}
