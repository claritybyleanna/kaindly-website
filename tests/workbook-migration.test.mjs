import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../db/migrations/2026-10-15-unified-workbook-responses.sql",
  import.meta.url,
);

test("migration backfills only legacy Blead rows before adding non-null constraints", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /^BEGIN;/mu);
  assert.match(sql, /pg_advisory_xact_lock/u);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS client_id text/u);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS program_id text/u);
  assert.match(
    sql,
    /UPDATE blead_workbook_responses\s+SET client_id = 'bracco'\s+WHERE workbook_id = 'bracco-session-1'\s+AND client_id IS NULL;/u,
  );
  assert.match(
    sql,
    /UPDATE blead_workbook_responses\s+SET program_id = 'leadership-accelerator'\s+WHERE workbook_id = 'bracco-session-1'\s+AND program_id IS NULL;/u,
  );

  const backfillPosition = sql.indexOf("SET client_id = 'bracco'");
  const nullGuardPosition = sql.indexOf("RAISE EXCEPTION");
  const notNullPosition = sql.indexOf("SET NOT NULL");
  assert.ok(backfillPosition >= 0);
  assert.ok(nullGuardPosition > backfillPosition);
  assert.ok(notNullPosition > nullGuardPosition);

  assert.match(
    sql,
    /\(client_id, program_id, workbook_id, updated_at DESC\)/u,
  );
  assert.match(sql, /DROP INDEX IF EXISTS blead_workbook_responses_updated_idx/u);
  assert.match(sql, /blead_workbook_responses_delete_idx/u);
  assert.match(sql, /COMMIT;\s*$/u);
});

test("runner applies the migration, verifies invariants, and logs counts only", async () => {
  const { runWorkbookMigration } = await import("../scripts/migrate-workbook-db.mjs");
  const calls = [];
  const logs = [];
  const query = async (text) => {
    calls.push(text);
    if (/invalid_rows/u.test(text)) {
      return [{ invalid_rows: "0", preserved_blead_rows: "12", payload: "private" }];
    }
    return [];
  };

  const result = await runWorkbookMigration({
    query,
    readMigration: async () => "BEGIN; SELECT 1; COMMIT;",
    log: (message) => logs.push(message),
  });

  assert.deepEqual(result, { invalidRows: 0, preservedBleadRows: 12 });
  assert.equal(calls[0], "BEGIN; SELECT 1; COMMIT;");
  assert.match(
    calls[1],
    /count\(\*\) FILTER \(\s*WHERE client_id IS NULL OR program_id IS NULL\s*\) AS invalid_rows/u,
  );
  assert.match(calls[1], /workbook_id = 'bracco-session-1'/u);
  assert.deepEqual(logs, ["Unified workbook migration complete: invalid_rows=0, preserved_blead_rows=12."]);
  assert.doesNotMatch(logs.join("\n"), /private/u);
});

test("runner fails when any migrated row still lacks an identity", async () => {
  const { runWorkbookMigration } = await import("../scripts/migrate-workbook-db.mjs");
  const logs = [];

  await assert.rejects(
    runWorkbookMigration({
      query: async (text) =>
        /invalid_rows/u.test(text)
          ? [{ invalid_rows: 2, preserved_blead_rows: 12 }]
          : [],
      readMigration: async () => "BEGIN; SELECT 1; COMMIT;",
      log: (message) => logs.push(message),
    }),
    /invalid_rows=2/u,
  );
  assert.deepEqual(logs, []);
});
