BEGIN;

SELECT pg_advisory_xact_lock(
  hashtextextended('kaindly:2026-10-15-unified-workbook-responses', 0)
);

ALTER TABLE blead_workbook_responses
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS program_id text;

UPDATE blead_workbook_responses
SET client_id = 'bracco'
WHERE workbook_id = 'bracco-session-1'
  AND client_id IS NULL;

UPDATE blead_workbook_responses
SET program_id = 'leadership-accelerator'
WHERE workbook_id = 'bracco-session-1'
  AND program_id IS NULL;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM blead_workbook_responses
    WHERE client_id IS NULL OR program_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require workbook identities while rows with null identities remain';
  END IF;
END
$migration$;

ALTER TABLE blead_workbook_responses
  ALTER COLUMN client_id SET NOT NULL,
  ALTER COLUMN program_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS blead_workbook_responses_dashboard_idx
  ON blead_workbook_responses
  (client_id, program_id, workbook_id, updated_at DESC);

DROP INDEX IF EXISTS blead_workbook_responses_updated_idx;

CREATE INDEX IF NOT EXISTS blead_workbook_responses_delete_idx
  ON blead_workbook_responses (delete_after);

COMMIT;
