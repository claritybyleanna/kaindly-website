import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPreviewWorkbookMigration } from "./migrate-preview-workbook-db.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const PUBLIC_PATHS = Object.freeze([
  "index.html",
  ".nojekyll",
  "about",
  "assessment",
  "assets",
  "Blead",
  "bsales",
  "McLendon",
  "OWR",
  "collective",
  "contact",
  "dashboard",
  "insights",
  "privacy",
  "terms",
]);

export async function buildStaticOutput({
  rootDirectory = projectRoot,
  outputDirectory = resolve(projectRoot, ".vercel-static"),
  publicPaths = PUBLIC_PATHS,
} = {}) {
  const root = resolve(rootDirectory);
  const output = resolve(outputDirectory);
  if (root === output) {
    throw new Error("Static output directory must be separate from the project root");
  }

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const publicPath of publicPaths) {
    await cp(resolve(root, publicPath), resolve(output, publicPath), { recursive: true });
  }
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  await runPreviewWorkbookMigration();
  await buildStaticOutput();
}
