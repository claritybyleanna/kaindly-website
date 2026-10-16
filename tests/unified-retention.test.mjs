import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeUrl = new URL("../api/workbook-retention.js", import.meta.url);

test("provides a client-neutral workbook retention route", () => {
  assert.equal(existsSync(routeUrl), true);
});

test("rejects missing and incorrect cron secrets before opening the store", async () => {
  const { createWorkbookRetentionHandler } = await import(routeUrl);
  let storeCalls = 0;
  const GET = createWorkbookRetentionHandler({
    getSecret: () => "cron-secret",
    getStore: () => {
      storeCalls += 1;
      return { deleteExpired: async () => [] };
    },
  });

  const missing = await GET(new Request("https://www.kaindly.ai/api/workbook-retention"));
  const incorrect = await GET(new Request("https://www.kaindly.ai/api/workbook-retention", {
    headers: { authorization: "Bearer incorrect" },
  }));
  const missingConfiguration = await createWorkbookRetentionHandler({
    getSecret: () => undefined,
    getStore: () => {
      storeCalls += 1;
      return { deleteExpired: async () => [] };
    },
  })(new Request("https://www.kaindly.ai/api/workbook-retention", {
    headers: { authorization: "Bearer cron-secret" },
  }));

  assert.equal(missing.status, 401);
  assert.equal(incorrect.status, 401);
  assert.equal(missingConfiguration.status, 401);
  assert.equal(storeCalls, 0);
});

test("deletes each expired row by its own deadline and is safe to repeat", async () => {
  const { createWorkbookRetentionHandler } = await import(routeUrl);
  const rows = [
    { id: "bracco-expired", deleteAfter: "2026-11-01T00:00:00.000Z" },
    { id: "mclendon-expired", deleteAfter: "2026-12-01T00:00:00.000Z" },
    { id: "future", deleteAfter: "2027-03-01T06:00:00.000Z" },
  ];
  const thresholds = [];
  const store = {
    async deleteExpired(threshold) {
      thresholds.push(threshold);
      const expired = rows.filter(({ deleteAfter }) => deleteAfter <= threshold);
      for (const row of expired) rows.splice(rows.indexOf(row), 1);
      return expired;
    },
  };
  const now = "2026-12-15T12:00:00.000Z";
  const GET = createWorkbookRetentionHandler({
    getSecret: () => "cron-secret",
    getStore: () => store,
    now: () => new Date(now),
  });
  const request = () => new Request("https://www.kaindly.ai/api/workbook-retention", {
    headers: { authorization: "Bearer cron-secret" },
  });

  const first = await GET(request());
  const second = await GET(request());

  assert.deepEqual(await first.json(), { ok: true, deleted: 2 });
  assert.deepEqual(await second.json(), { ok: true, deleted: 0 });
  assert.deepEqual(thresholds, [now, now]);
  assert.deepEqual(rows.map(({ id }) => id), ["future"]);
});

test("keeps the old retention URL as a rewrite without another serverless function", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.equal(existsSync(new URL("../api/blead-retention.js", import.meta.url)), false);
  assert.ok(config.rewrites.some(({ source, destination }) => (
    source === "/api/blead-retention" && destination === "/api/workbook-retention"
  )));
});

test("schedules only the client-neutral retention route", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(config.crons, [{ path: "/api/workbook-retention", schedule: "0 9 * * *" }]);
});
