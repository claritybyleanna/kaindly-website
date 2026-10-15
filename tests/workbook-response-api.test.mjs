import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BLEAD_COOKIE_NAME, signBleadSession } from "../lib/blead-auth.js";
import { BSALES_COOKIE_NAME, signBsalesSession } from "../lib/bsales-auth.js";
import { getWorkbookRegistration } from "../lib/workbook-registry.js";

const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const currentTime = new Date("2026-10-15T15:00:00.000Z");

function jsonRequest(url, body, { origin = new URL(url).origin } = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function createStore(overrides = {}) {
  return {
    upsert: async (snapshot) => [snapshot],
    listByParticipant: async () => [],
    ...overrides,
  };
}

test("route-owned registration ignores tampered client, program, and workbook identities", async () => {
  const { createParticipantResponseHandlers } = await import("../lib/workbook-response-api.js");
  const registration = getWorkbookRegistration("bracco-sales-pack-1");
  const saved = [];
  const handlers = createParticipantResponseHandlers({
    registration,
    authorize: async () => true,
    store: createStore({ upsert: async (snapshot) => (saved.push(snapshot), [snapshot]) }),
    now: () => currentTime,
  });

  const response = await handlers.POST(jsonRequest(
    "https://www.kaindly.ai/bsales/prompt-pack-1/api/responses",
    {
      clientId: "mclendon-working-smarter",
      programId: "working-smarter-from-day-one",
      workbookId: "mclendon-working-smarter",
      participantId,
      exerciseId: "prompt-02",
      fields: { "field-01": "District sales manager" },
      notes: "",
    },
  ));

  assert.equal(response.status, 200);
  assert.equal(saved.length, 1);
  assert.deepEqual(
    {
      clientId: saved[0].clientId,
      programId: saved[0].programId,
      workbookId: saved[0].workbookId,
      deleteAfter: saved[0].deleteAfter,
    },
    {
      clientId: "bracco",
      programId: "sales-ai-working-session",
      workbookId: "bracco-sales-ai-brain",
      deleteAfter: registration.deleteAfter,
    },
  );
});

test("authorization runs before participant reads or writes can touch storage", async () => {
  const { createParticipantResponseHandlers } = await import("../lib/workbook-response-api.js");
  const calls = [];
  const handlers = createParticipantResponseHandlers({
    registration: getWorkbookRegistration("bracco-sales-pack-1"),
    authorize: async () => (calls.push("authorize"), false),
    store: createStore({
      upsert: async () => { calls.push("upsert"); throw new Error("must not run"); },
      listByParticipant: async () => { calls.push("list"); throw new Error("must not run"); },
    }),
    now: () => currentTime,
  });

  const getResponse = await handlers.GET(new Request(
    `https://www.kaindly.ai/bsales/prompt-pack-1/api/responses?participantId=${participantId}`,
  ));
  const postResponse = await handlers.POST(jsonRequest(
    "https://www.kaindly.ai/bsales/prompt-pack-1/api/responses",
    { participantId, exerciseId: "prompt-02", fields: {}, notes: "" },
  ));

  assert.equal(getResponse.status, 401);
  assert.equal(postResponse.status, 401);
  assert.deepEqual(calls, ["authorize", "authorize"]);
});

test("participant GET restores only one participant within the route-owned workbook", async () => {
  const { createParticipantResponseHandlers } = await import("../lib/workbook-response-api.js");
  const registration = getWorkbookRegistration("bracco-sales-pack-2");
  const lookups = [];
  const expected = [{ participant_id: participantId, workbook_id: registration.workbook.id }];
  const handlers = createParticipantResponseHandlers({
    registration,
    authorize: async () => true,
    store: createStore({
      listByParticipant: async (...args) => (lookups.push(args), expected),
    }),
    now: () => currentTime,
  });

  const response = await handlers.GET(new Request(
    `https://www.kaindly.ai/bsales/prompt-pack-2/api/responses?participantId=${participantId}`,
  ));

  assert.equal(response.status, 200);
  assert.deepEqual(lookups, [[participantId, registration]]);
  assert.deepEqual((await response.json()).responses, expected);
});

test("participant POST rejects a cross-origin request before storage", async () => {
  const { createParticipantResponseHandlers } = await import("../lib/workbook-response-api.js");
  let writes = 0;
  const handlers = createParticipantResponseHandlers({
    registration: getWorkbookRegistration("bracco-sales-pack-1"),
    authorize: async () => true,
    store: createStore({ upsert: async () => { writes += 1; return []; } }),
    now: () => currentTime,
  });

  const response = await handlers.POST(jsonRequest(
    "https://www.kaindly.ai/bsales/prompt-pack-1/api/responses",
    { participantId, exerciseId: "prompt-02", fields: {}, notes: "" },
    { origin: "https://attacker.example" },
  ));

  assert.equal(response.status, 403);
  assert.equal(writes, 0);
});

test("participant POST rejects malformed JSON, unknown exercise fields, and bodies over 64 KiB", async () => {
  const { createParticipantResponseHandlers } = await import("../lib/workbook-response-api.js");
  let writes = 0;
  const handlers = createParticipantResponseHandlers({
    registration: getWorkbookRegistration("bracco-sales-pack-1"),
    authorize: async () => true,
    store: createStore({ upsert: async () => { writes += 1; return []; } }),
    now: () => currentTime,
  });
  const url = "https://www.kaindly.ai/bsales/prompt-pack-1/api/responses";

  const malformed = await handlers.POST(jsonRequest(url, "{not-json"));
  const unknownField = await handlers.POST(jsonRequest(url, {
    participantId,
    exerciseId: "prompt-02",
    fields: { injected: "reject me" },
    notes: "",
  }));
  const oversized = await handlers.POST(jsonRequest(url, {
    participantId,
    exerciseId: "prompt-02",
    fields: {},
    notes: "",
    ignoredIdentityPadding: "x".repeat(66_000),
  }));

  assert.equal(malformed.status, 400);
  assert.equal(unknownField.status, 400);
  assert.equal(oversized.status, 400);
  assert.equal(writes, 0);
});

test("participant writes return 410 at the route registration deadline", async () => {
  const { createParticipantResponseHandlers } = await import("../lib/workbook-response-api.js");
  const registration = getWorkbookRegistration("mclendon-working-smarter");
  let writes = 0;
  const handlers = createParticipantResponseHandlers({
    registration,
    authorize: async () => true,
    store: createStore({ upsert: async () => { writes += 1; return []; } }),
    now: () => new Date(registration.deleteAfter),
  });

  const response = await handlers.POST(jsonRequest(
    "https://www.kaindly.ai/McLendon/api/responses",
    { participantId, exerciseId: "build-app", fields: {}, notes: "Draft" },
  ));

  assert.equal(response.status, 410);
  assert.equal(writes, 0);
});

test("McLendon sessions are non-identifying, signed, path-scoped, and expire after eight hours", async () => {
  const {
    MCLENDON_COOKIE_NAME,
    serializeMclendonSession,
    signMclendonSession,
    verifyMclendonSession,
  } = await import("../lib/mclendon-auth.js");
  const secret = "mclendon-test-secret-that-is-long-enough";
  const token = await signMclendonSession({
    expiresAt: currentTime.getTime() + (8 * 60 * 60 * 1000),
    secret,
  });

  assert.equal(await verifyMclendonSession(token, secret, currentTime.getTime()), true);
  assert.equal(await verifyMclendonSession(token, `${secret}-wrong`, currentTime.getTime()), false);
  assert.equal(await verifyMclendonSession(token, secret, currentTime.getTime() + (8 * 60 * 60 * 1000)), false);
  assert.equal(await verifyMclendonSession(token, secret, currentTime.getTime() + (8 * 60 * 60 * 1000) + 1), false);
  assert.doesNotMatch(token, new RegExp(participantId, "u"));
  const cookie = serializeMclendonSession(token);
  assert.match(cookie, new RegExp(`^${MCLENDON_COOKIE_NAME}=`));
  assert.match(cookie, /Path=\/McLendon\//u);
  assert.match(cookie, /Max-Age=28800/u);
  assert.match(cookie, /HttpOnly/u);
  assert.match(cookie, /SameSite=Strict/u);
  assert.match(cookie, /Secure/u);
});

test("McLendon page GET issues one valid session without password gating or copy changes", async () => {
  const keys = [
    "VERCEL_ENV",
    "MCLENDON_SESSION_SECRET",
    "BLEAD_SESSION_SECRET",
    "BSALES_SESSION_SECRET",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.VERCEL_ENV = "development";
  process.env.MCLENDON_SESSION_SECRET = "mclendon-middleware-secret-with-adequate-length";
  process.env.BLEAD_SESSION_SECRET = "different-blead-session-secret-with-adequate-length";
  process.env.BSALES_SESSION_SECRET = "different-sales-session-secret-with-adequate-length";
  try {
    const { default: middleware } = await import("../middleware.js");
    const { MCLENDON_COOKIE_NAME, verifyMclendonSession } = await import("../lib/mclendon-auth.js");
    const first = await middleware(new Request("https://www.kaindly.ai/McLendon/"));
    const setCookie = first.headers.get("set-cookie");

    assert.equal(first.headers.get("x-middleware-next"), "1");
    assert.match(setCookie, new RegExp(`^${MCLENDON_COOKIE_NAME}=`));
    assert.match(setCookie, /Path=\/McLendon\//u);
    assert.match(setCookie, /Max-Age=28800/u);
    assert.match(setCookie, /HttpOnly/u);
    assert.match(setCookie, /SameSite=Strict/u);
    assert.match(setCookie, /Secure/u);
    const token = setCookie.split(";", 1)[0].split("=", 2)[1];
    assert.equal(await verifyMclendonSession(token, process.env.MCLENDON_SESSION_SECRET), true);

    const repeat = await middleware(new Request("https://www.kaindly.ai/McLendon/", {
      headers: { cookie: `${MCLENDON_COOKIE_NAME}=${token}` },
    }));
    assert.equal(repeat.headers.get("x-middleware-next"), "1");
    assert.equal(repeat.headers.get("set-cookie"), null);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("McLendon refuses to reuse another hub signing key", async () => {
  const keys = ["VERCEL_ENV", "MCLENDON_SESSION_SECRET", "BLEAD_FACILITATOR_SESSION_SECRET"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.VERCEL_ENV = "development";
  process.env.BLEAD_FACILITATOR_SESSION_SECRET = "shared-secret-that-must-not-cross-scopes";
  process.env.MCLENDON_SESSION_SECRET = process.env.BLEAD_FACILITATOR_SESSION_SECRET;
  try {
    const { default: middleware } = await import("../middleware.js");
    const response = await middleware(new Request("https://www.kaindly.ai/McLendon/"));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("fixed physical adapters reject absent and wrong-client sessions before database access", async () => {
  const previous = {
    BLEAD_SESSION_SECRET: process.env.BLEAD_SESSION_SECRET,
    BSALES_SESSION_SECRET: process.env.BSALES_SESSION_SECRET,
    MCLENDON_SESSION_SECRET: process.env.MCLENDON_SESSION_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  process.env.BLEAD_SESSION_SECRET = "adapter-blead-secret-with-adequate-length";
  process.env.BSALES_SESSION_SECRET = "adapter-sales-secret-with-adequate-length";
  process.env.MCLENDON_SESSION_SECRET = "adapter-mclendon-secret-with-adequate-length";
  delete process.env.DATABASE_URL;
  try {
    const blead = await import("../api/workbook-responses-blead.js");
    const packOne = await import("../api/workbook-responses-bsales-pack-1.js");
    const packTwo = await import("../api/workbook-responses-bsales-pack-2.js");
    const mclendon = await import("../api/workbook-responses-mclendon.js");
    const alias = await import("../api/blead-responses.js");
    const salesToken = await signBsalesSession({
      expiresAt: Date.now() + 60_000,
      secret: process.env.BSALES_SESSION_SECRET,
    });
    const bleadToken = await signBleadSession({
      expiresAt: Date.now() + 60_000,
      secret: process.env.BLEAD_SESSION_SECRET,
    });

    assert.equal((await blead.GET(new Request(
      `https://www.kaindly.ai/Blead/api/responses?participantId=${participantId}`,
      { headers: { cookie: `${BSALES_COOKIE_NAME}=${salesToken}` } },
    ))).status, 401);
    for (const route of [packOne, packTwo]) {
      assert.equal((await route.GET(new Request(
        `https://www.kaindly.ai/bsales/api/responses?participantId=${participantId}`,
        { headers: { cookie: `${BLEAD_COOKIE_NAME}=${bleadToken}` } },
      ))).status, 401);
    }
    assert.equal((await mclendon.GET(new Request(
      `https://www.kaindly.ai/McLendon/api/responses?participantId=${participantId}`,
      { headers: { cookie: `${BSALES_COOKIE_NAME}=${salesToken}` } },
    ))).status, 401);
    assert.equal((await alias.GET(new Request(
      `https://www.kaindly.ai/api/blead-responses?participantId=${participantId}`,
    ))).status, 401);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Vercel rewrites bind each workbook URL to one physical adapter and preserve the Blead alias", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const rewrites = new Map(config.rewrites.map(({ source, destination }) => [source, destination]));

  assert.equal(rewrites.get("/Blead/api/responses"), "/api/workbook-responses-blead");
  assert.equal(rewrites.get("/bsales/prompt-pack-1/api/responses"), "/api/workbook-responses-bsales-pack-1");
  assert.equal(rewrites.get("/bsales/prompt-pack-2/api/responses"), "/api/workbook-responses-bsales-pack-2");
  assert.equal(rewrites.get("/McLendon/api/responses"), "/api/workbook-responses-mclendon");
  const alias = await import("../api/blead-responses.js");
  assert.equal(typeof alias.GET, "function");
  assert.equal(typeof alias.POST, "function");
});
