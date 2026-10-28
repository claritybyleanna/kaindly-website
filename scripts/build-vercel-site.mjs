import { cp, mkdir, rm, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { bsalesContent } from "../bsales/content.js";
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

  // Private attachments are provisioned locally, never from the public repository.
  // Stop a release if one is missing or altered instead of shipping a broken link.
  if (publicPaths.includes("bsales")) {
    for (const resource of bsalesContent.resources.filter(item => item.privateDeploymentAsset)) {
      const bytes = await readFile(resolve(root, "." + resource.href));
      if (createHash("sha256").update(bytes).digest("hex") !== resource.sha256) {
        throw new Error("Private session attachment does not match its approved checksum");
      }
    }
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
