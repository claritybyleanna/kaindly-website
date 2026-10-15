import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Pool } from "@neondatabase/serverless";

const migrationUrl = new URL(
  "../db/migrations/2026-10-15-unified-workbook-responses.sql",
  import.meta.url,
);

const invariantQuery = `
  SELECT count(*) FILTER (
           WHERE client_id IS NULL OR program_id IS NULL
         ) AS invalid_rows,
         count(*) FILTER (
           WHERE workbook_id = 'bracco-session-1'
         ) AS preserved_blead_rows
  FROM blead_workbook_responses
`;

function parseCount(value, name) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Migration invariant returned an invalid ${name} count`);
  }
  return count;
}

export async function runWorkbookMigration({
  query,
  readMigration = () => readFile(migrationUrl, "utf8"),
  log = console.log,
} = {}) {
  if (typeof query !== "function") {
    throw new TypeError("A database query function is required");
  }

  const migration = await readMigration();
  await query(migration);

  const rows = await query(invariantQuery);
  const row = rows?.[0];
  const invalidRows = parseCount(row?.invalid_rows, "invalid_rows");
  const preservedBleadRows = parseCount(
    row?.preserved_blead_rows,
    "preserved_blead_rows",
  );

  if (invalidRows !== 0) {
    throw new Error(`Migration invariant failed: invalid_rows=${invalidRows}`);
  }

  log(
    `Unified workbook migration complete: invalid_rows=${invalidRows}, ` +
      `preserved_blead_rows=${preservedBleadRows}.`,
  );

  return { invalidRows, preservedBleadRows };
}

export async function runWorkbookMigrationCli() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await runWorkbookMigration({
      query: async (text, values = []) => {
        const result = values.length > 0
          ? await client.query(text, values)
          : await client.query(text);
        return result.rows ?? [];
      },
    });
  } finally {
    client.release();
    await pool.end();
  }
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  await runWorkbookMigrationCli();
}
