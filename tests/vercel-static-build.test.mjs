import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("Vercel site builder copies public paths and excludes application source", async () => {
  const root = await mkdtemp(join(tmpdir(), "kaindly-vercel-build-"));
  const output = join(root, "output");
  await mkdir(join(root, "assets"), { recursive: true });
  await mkdir(join(root, "api"), { recursive: true });
  await writeFile(join(root, "index.html"), "<h1>KAINDLY</h1>");
  await writeFile(join(root, ".nojekyll"), "");
  await writeFile(join(root, "assets", "site.js"), "public");
  await writeFile(join(root, "api", "private.js"), "private");

  try {
    const { buildStaticOutput } = await import("../scripts/build-vercel-site.mjs");
    await buildStaticOutput({
      rootDirectory: root,
      outputDirectory: output,
      publicPaths: ["index.html", ".nojekyll", "assets"],
    });

    assert.equal(await readFile(join(output, "index.html"), "utf8"), "<h1>KAINDLY</h1>");
    assert.equal(await readFile(join(output, "assets", "site.js"), "utf8"), "public");
    assert.equal(existsSync(join(output, "api")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
