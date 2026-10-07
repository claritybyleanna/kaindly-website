import { getBleadQuery } from "../lib/blead-db.js";

const statements = [
  `CREATE TABLE IF NOT EXISTS blead_workbook_responses (
    participant_id uuid NOT NULL,
    workbook_id text NOT NULL,
    exercise_id text NOT NULL,
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    delete_after timestamptz NOT NULL,
    PRIMARY KEY (participant_id, workbook_id, exercise_id)
  )`,
  `CREATE INDEX IF NOT EXISTS blead_workbook_responses_updated_idx
    ON blead_workbook_responses (workbook_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS blead_workbook_responses_delete_idx
    ON blead_workbook_responses (delete_after)`,
];

const query = getBleadQuery();

for (const statement of statements) {
  await query(statement);
}

console.log(`Applied ${statements.length} Blead database migration statements.`);
