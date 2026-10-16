import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runWorkbookMigrationCli } from "./migrate-workbook-db.mjs";

function normalizeHost(value) {
  return String(value ?? "").trim().toLowerCase().replace(/-pooler(?=\.)/u, "");
}

function databaseHost(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Preview database connection is not configured correctly");
  }

  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol) || !url.hostname) {
    throw new Error("Preview database connection is not configured correctly");
  }
  return normalizeHost(url.hostname);
}

export async function runPreviewWorkbookMigration({
  environment = process.env.VERCEL_ENV,
  connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  productionHost = process.env.PRODUCTION_DATABASE_HOST,
  migrate = runWorkbookMigrationCli,
  log = console.log,
} = {}) {
  if (environment !== "preview") {
    return { skipped: true };
  }

  const previewHost = databaseHost(connectionString);
  const protectedHost = normalizeHost(productionHost);
  if (!protectedHost || previewHost === protectedHost) {
    throw new Error("Refusing to migrate the production database from a Preview build");
  }
  if (!previewHost.endsWith(".neon.tech")) {
    throw new Error("Preview database must use the configured Neon branch");
  }

  log("Preview database isolation verified; applying workbook migration.");
  await migrate();
  return { skipped: false };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  await runPreviewWorkbookMigration();
}
