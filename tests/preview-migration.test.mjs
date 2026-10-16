import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Preview migration skips every non-Preview deployment", async () => {
  const { runPreviewWorkbookMigration } = await import("../scripts/migrate-preview-workbook-db.mjs");
  let migrationCalls = 0;

  const result = await runPreviewWorkbookMigration({
    environment: "production",
    connectionString: "postgresql://user:secret@production.example/db",
    productionHost: "production.example",
    migrate: async () => { migrationCalls += 1; },
    log: () => {},
  });

  assert.deepEqual(result, { skipped: true });
  assert.equal(migrationCalls, 0);
});

test("Preview migration fails closed when the database still resolves to Production", async () => {
  const { runPreviewWorkbookMigration } = await import("../scripts/migrate-preview-workbook-db.mjs");
  let migrationCalls = 0;

  await assert.rejects(
    runPreviewWorkbookMigration({
      environment: "preview",
      connectionString: "postgresql://user:secret@ep-production-pooler.neon.tech/db",
      productionHost: "ep-production.neon.tech",
      migrate: async () => { migrationCalls += 1; },
      log: () => {},
    }),
    /refusing to migrate the production database/i,
  );
  assert.equal(migrationCalls, 0);
});

test("Preview migration runs only against a distinct Neon branch", async () => {
  const { runPreviewWorkbookMigration } = await import("../scripts/migrate-preview-workbook-db.mjs");
  let migrationCalls = 0;
  const logs = [];

  const result = await runPreviewWorkbookMigration({
    environment: "preview",
    connectionString: "postgresql://user:secret@ep-preview-pooler.neon.tech/db",
    productionHost: "ep-production.neon.tech",
    migrate: async () => { migrationCalls += 1; },
    log: (message) => logs.push(message),
  });

  assert.deepEqual(result, { skipped: false });
  assert.equal(migrationCalls, 1);
  assert.deepEqual(logs, ["Preview database isolation verified; applying workbook migration."]);
});

test("Vercel runs the curated site builder and serves only its static output", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.equal(config.buildCommand, "node scripts/build-vercel-site.mjs");
  assert.equal(config.outputDirectory, ".vercel-static");
});
