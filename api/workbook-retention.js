import { getWorkbookQuery } from "../lib/blead-db.js";
import { createWorkbookResponseStore } from "../lib/workbook-response-store.js";

const RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: RESPONSE_HEADERS });
}

function defaultStore() {
  return createWorkbookResponseStore((text, values) => getWorkbookQuery()(text, values));
}

export function createWorkbookRetentionHandler({
  getSecret = () => process.env.CRON_SECRET,
  getStore = defaultStore,
  now = () => new Date(),
  logger = console,
} = {}) {
  if (typeof getSecret !== "function" || typeof getStore !== "function" || typeof now !== "function") {
    throw new TypeError("Retention handler dependencies must be functions");
  }

  return async function GET(request) {
    const secret = getSecret();
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    try {
      const current = now();
      const threshold = (current instanceof Date ? current : new Date(current)).toISOString();
      const store = getStore();
      if (!store || typeof store.deleteExpired !== "function") {
        throw new TypeError("A retention response store is required");
      }
      const deleted = await store.deleteExpired(threshold);
      if (!Array.isArray(deleted)) throw new TypeError("Retention store returned an invalid result");
      return json({ ok: true, deleted: deleted.length });
    } catch {
      logger.error("workbook_retention_error", { category: "database_cleanup" });
      return json({ error: "Unable to remove expired responses" }, 500);
    }
  };
}

const handleRetention = createWorkbookRetentionHandler();

export function GET(request) {
  return handleRetention(request);
}
