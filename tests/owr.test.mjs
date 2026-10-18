import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";

async function withOwrEnvironment(callback) {
  const keys = ["VERCEL_ENV", "OWR_PASSWORD", "OWR_SESSION_SECRET"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.VERCEL_ENV = "development";
  process.env.OWR_PASSWORD = "reunion";
  process.env.OWR_SESSION_SECRET = "owr-test-session-secret-with-adequate-length";
  try {
    return await callback();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("registers the OneWe Reach career workbook for the unified dashboard", async () => {
  const { getWorkbookRegistration } = await import("../lib/workbook-registry.js");
  const registration = getWorkbookRegistration("owr-career-architecture");

  assert.deepEqual(registration.client, { id: "onewe-reach", name: "OneWe Reach" });
  assert.equal(registration.program.name, "Career Architecture in the AI Era");
  assert.equal(registration.workbook.id, "owr-career-architecture");
  assert.equal(registration.hubUrl, "/OWR/");
  assert.equal(registration.participantApiPath, "/OWR/api/responses");
  assert.deepEqual(registration.exercises.map(({ id }) => id), ["ex1", "ex2", "ex3", "ex4", "ex5"]);
});

test("protects OWR with its own scoped PIN session", async () => {
  await withOwrEnvironment(async () => {
    const middleware = await import("../middleware.js");
    const blocked = await middleware.default(new Request("https://www.kaindly.ai/OWR/#plan"));
    assert.equal(blocked.status, 303);
    assert.equal(blocked.headers.get("location"), "https://www.kaindly.ai/OWR/access/?returnTo=%2FOWR%2F");

    const body = new URLSearchParams({ password: "reunion", returnTo: "/OWR/" });
    const allowed = await middleware.default(new Request("https://www.kaindly.ai/OWR/access/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.kaindly.ai",
      },
      body,
    }));
    const cookie = allowed.headers.get("set-cookie");
    assert.equal(allowed.status, 303);
    assert.equal(allowed.headers.get("location"), "/OWR/");
    assert.match(cookie, /^kaindly_owr_session=/u);
    assert.match(cookie, /Path=\/OWR\//u);
    assert.match(cookie, /HttpOnly/u);
    assert.match(cookie, /SameSite=Strict/u);

    const authenticated = await middleware.default(new Request("https://www.kaindly.ai/OWR/", {
      headers: { cookie: cookie.split(";", 1)[0] },
    }));
    assert.equal(authenticated.headers.get("x-middleware-next"), "1");
  });
});

test("publishes a client hub at OWR and keeps the supplied workbook as a protected working page", async () => {
  const hubUrl = new URL("../OWR/index.html", import.meta.url);
  const pageUrl = new URL("../OWR/workbook/index.html", import.meta.url);
  const accessUrl = new URL("../OWR/access/index.html", import.meta.url);
  assert.equal(existsSync(hubUrl), true);
  assert.equal(existsSync(pageUrl), true);
  assert.equal(existsSync(accessUrl), true);

  const hub = await readFile(hubUrl, "utf8");
  assert.match(hub, /class="blead-page owr-page"/u);
  assert.match(hub, /Career Architecture in the AI Era/u);
  assert.match(hub, /href="\/OWR\/workbook\/"/u);
  assert.match(hub, /href="#overview"/u);
  assert.match(hub, /href="#workbook"/u);
  assert.match(hub, /href="#how-to-use"/u);
  assert.match(hub, /href="#resources"/u);

  const html = await readFile(pageUrl, "utf8");
  assert.match(html, /Career Architecture in the AI Era/u);
  assert.match(html, /data-workbook-id="owr-career-architecture"/u);
  assert.match(html, /data-response-endpoint="\/OWR\/api\/responses"/u);
  assert.match(html, /Information entered in this workbook is submitted to facilitators only\. Other attendees do not see your worksheet\./u);
  assert.doesNotMatch(html, /Submitting to the facilitator is simulated|Submitted \(simulated\)/u);
  assert.doesNotMatch(html, /Review and submit to facilitator|id="do-submit"|data-subkey/u);
  assert.match(html, /scheduleFacilitatorSave\(exId\)/u);
  assert.match(html, /\n\[hidden\]\s*\{\s*display:\s*none\s*!important;/u);
  assert.match(html, /section\[data-view\]\[hidden\]\s*\{\s*display:\s*none\s*!important;/u);
  assert.doesNotMatch(html, /class="time-chip">' \+ e\.time/u);
  assert.doesNotMatch(html, /Exercise ' \+ e\.n \+ ' of 5 · ' \+ e\.time/u);
});

test("OWR workbook entries save to the facilitator endpoint without a separate submit action", async () => {
  const { createOwrSubmissionClient } = await import("../assets/js/owr-submissions.js");
  const requests = [];
  const storage = new Map();
  const client = createOwrSubmissionClient({
    workbookId: "owr-career-architecture",
    endpoint: "/OWR/api/responses",
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    cryptoApi: { randomUUID: () => participantId },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ response: { saved: true } }) };
    },
  });

  await client.save("ex1", { experience: "Career strategy leader" });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/OWR/api/responses");
  assert.equal(requests[0].options.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    participantId,
    exerciseId: "ex1",
    fields: { experience: "Career strategy leader" },
    notes: "",
  });
});

test("routes OWR responses through an authenticated route-owned adapter without adding a function", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const rewrites = new Map(config.rewrites.map(({ source, destination }) => [source, destination]));
  assert.equal(rewrites.get("/OWR/api/responses"), "/api/blead-responses?workbook=owr-career-architecture");

  const adapter = await import("../api/blead-responses.js");
  assert.equal(typeof adapter.DELETE, "function");
  assert.equal(typeof adapter.GET, "function");
  assert.equal(typeof adapter.POST, "function");
});

test("the Vercel static build includes OWR", async () => {
  const { PUBLIC_PATHS } = await import("../scripts/build-vercel-site.mjs");
  assert.ok(PUBLIC_PATHS.includes("OWR"));
});

test("OWR selective submissions can be withdrawn from facilitator storage", async () => {
  const { createParticipantResponseHandlers } = await import("../lib/workbook-response-api.js");
  const { getWorkbookRegistration } = await import("../lib/workbook-registry.js");
  const deleted = [];
  const handlers = createParticipantResponseHandlers({
    registration: getWorkbookRegistration("owr-career-architecture"),
    authorize: async () => true,
    store: {
      upsert: async () => [],
      listByParticipant: async () => [],
      deleteOne: async (snapshot) => (deleted.push(snapshot), [{ participant_id: snapshot.participantId }]),
    },
  });
  const response = await handlers.DELETE(new Request("https://www.kaindly.ai/OWR/api/responses", {
    method: "DELETE",
    headers: { "content-type": "application/json", origin: "https://www.kaindly.ai" },
    body: JSON.stringify({ participantId, exerciseId: "ex1", fields: {}, notes: "" }),
  }));

  assert.equal(response.status, 200);
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].workbookId, "owr-career-architecture");
});
