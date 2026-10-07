import assert from "node:assert/strict";
import test from "node:test";
import {
  BLEAD_COOKIE_NAME,
  BLEAD_FACILITATOR_COOKIE_NAME,
  signBleadFacilitatorSession,
  signBleadSession,
} from "../lib/blead-auth.js";
import { BLEAD_DELETE_AFTER } from "../lib/blead-response-domain.js";
import {
  createFacilitatorHandlers,
  createParticipantResponseHandlers,
} from "../lib/blead-response-api.js";

const secret = "participant-api-test-secret-with-adequate-length";
const participantId = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const currentTime = new Date("2026-10-07T15:00:00.000Z");
const previousSecret = process.env.BLEAD_SESSION_SECRET;
const previousFacilitatorSecret = process.env.BLEAD_FACILITATOR_SESSION_SECRET;
process.env.BLEAD_SESSION_SECRET = secret;
process.env.BLEAD_FACILITATOR_SESSION_SECRET = "facilitator-api-secret-with-adequate-length";

test.after(() => {
  if (previousSecret === undefined) delete process.env.BLEAD_SESSION_SECRET;
  else process.env.BLEAD_SESSION_SECRET = previousSecret;
  if (previousFacilitatorSecret === undefined) delete process.env.BLEAD_FACILITATOR_SESSION_SECRET;
  else process.env.BLEAD_FACILITATOR_SESSION_SECRET = previousFacilitatorSecret;
});

const validBody = {
  participantId,
  exerciseId: "prompt-01",
  fields: { title: "VP", team: "Analytics" },
  notes: "Try this next week",
};

async function authenticatedRequest(method, body, options = {}) {
  const url = options.url ?? "https://www.kaindly.ai/Blead/api/responses";
  const token = await signBleadSession({
    expiresAt: options.expiresAt ?? currentTime.getTime() + 60_000,
    secret,
  });
  const headers = {
    cookie: `${BLEAD_COOKIE_NAME}=${options.token ?? token}`,
  };
  if (method === "POST") {
    headers.origin = options.origin ?? new URL(url).origin;
    headers["content-type"] = "application/json";
  }
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createStore(overrides = {}) {
  return {
    upsert: async (snapshot) => [snapshot],
    listByParticipant: async () => [],
    ...overrides,
  };
}

test("participant POST validates and upserts an authored snapshot", async () => {
  const saved = [];
  const { POST } = createParticipantResponseHandlers({
    store: createStore({ upsert: async (value) => (saved.push(value), [value]) }),
    now: () => currentTime,
  });

  const response = await POST(await authenticatedRequest("POST", validBody));

  assert.equal(response.status, 200);
  assert.equal(saved[0].workbookId, "bracco-session-1");
  assert.equal(saved[0].exerciseId, "prompt-01");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("participant GET returns only the requested anonymous participant rows", async () => {
  const lookedUp = [];
  const expected = [{ participant_id: participantId, exercise_id: "prompt-01" }];
  const { GET } = createParticipantResponseHandlers({
    store: createStore({
      listByParticipant: async (value) => (lookedUp.push(value), expected),
    }),
    now: () => currentTime,
  });
  const request = await authenticatedRequest(
    "GET",
    undefined,
    { url: `https://www.kaindly.ai/Blead/api/responses?participantId=${participantId}` },
  );

  const response = await GET(request);

  assert.equal(response.status, 200);
  assert.deepEqual(lookedUp, [participantId]);
  assert.deepEqual((await response.json()).responses, expected);
});

test("missing and tampered participant cookies return 401", async () => {
  const { GET } = createParticipantResponseHandlers({
    store: createStore(),
    now: () => currentTime,
  });
  const directRequest = new Request(
    `https://www.kaindly.ai/api/blead-responses?participantId=${participantId}`,
  );
  const tampered = await authenticatedRequest(
    "GET",
    undefined,
    {
      url: `https://www.kaindly.ai/Blead/api/responses?participantId=${participantId}`,
      token: "v1.9999999999999.tampered",
    },
  );

  assert.equal((await GET(directRequest)).status, 401);
  assert.equal((await GET(tampered)).status, 401);
});

test("participant POST rejects cross-origin writes", async () => {
  const saved = [];
  const { POST } = createParticipantResponseHandlers({
    store: createStore({ upsert: async (value) => (saved.push(value), [value]) }),
    now: () => currentTime,
  });

  const response = await POST(await authenticatedRequest("POST", validBody, {
    origin: "https://attacker.example",
  }));

  assert.equal(response.status, 403);
  assert.equal(saved.length, 0);
});

test("participant inputs reject malformed IDs and unknown or oversized fields", async () => {
  const { GET, POST } = createParticipantResponseHandlers({
    store: createStore(),
    now: () => currentTime,
  });
  const malformedGet = await authenticatedRequest(
    "GET",
    undefined,
    { url: "https://www.kaindly.ai/Blead/api/responses?participantId=not-a-uuid" },
  );
  const malformedPost = await authenticatedRequest("POST", {
    ...validBody,
    participantId: "not-a-uuid",
  });
  const unknownExercise = await authenticatedRequest("POST", {
    ...validBody,
    exerciseId: "prompt-999",
  });
  const unknownField = await authenticatedRequest("POST", {
    ...validBody,
    fields: { injected: "reject me" },
  });
  const oversized = await authenticatedRequest("POST", {
    ...validBody,
    fields: { title: "x".repeat(12_001) },
  });

  assert.equal((await GET(malformedGet)).status, 400);
  assert.equal((await POST(malformedPost)).status, 400);
  assert.equal((await POST(unknownExercise)).status, 400);
  assert.equal((await POST(unknownField)).status, 400);
  assert.equal((await POST(oversized)).status, 400);
});

test("database failures return a generic error and log no participant content", async () => {
  const logged = [];
  const { POST } = createParticipantResponseHandlers({
    store: createStore({ upsert: async () => { throw new Error("DATABASE_URL secret detail"); } }),
    now: () => currentTime,
    logger: { error: (...values) => logged.push(values) },
    requestId: () => "test-request-id",
  });

  const response = await POST(await authenticatedRequest("POST", validBody));
  const logText = JSON.stringify(logged);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to save responses" });
  assert.match(logText, /database_write/iu);
  assert.match(logText, /test-request-id/u);
  assert.doesNotMatch(logText, /Try this next week|75f6c553|DATABASE_URL/iu);
});

test("participant writes stop at the fixed retention deadline", async () => {
  const { POST } = createParticipantResponseHandlers({
    store: createStore(),
    now: () => new Date(BLEAD_DELETE_AFTER),
  });

  const response = await POST(await authenticatedRequest("POST", validBody, {
    expiresAt: new Date(BLEAD_DELETE_AFTER).getTime() + 60_000,
  }));

  assert.equal(response.status, 410);
});

const facilitatorRows = [{
  participant_id: participantId,
  workbook_id: "bracco-session-1",
  exercise_id: "prompt-01",
  payload: { fields: { title: "VP" }, notes: "Facilitator view" },
  created_at: "2026-10-07T15:00:00.000Z",
  updated_at: "2026-10-07T15:01:00.000Z",
  delete_after: BLEAD_DELETE_AFTER,
}];

async function facilitatorRequest(options = {}) {
  const url = options.url ?? "https://www.kaindly.ai/Blead/facilitator/api/responses";
  const token = options.token ?? await signBleadFacilitatorSession({
    expiresAt: currentTime.getTime() + 60_000,
    secret: process.env.BLEAD_FACILITATOR_SESSION_SECRET,
  });
  return new Request(url, {
    headers: { cookie: `${BLEAD_FACILITATOR_COOKIE_NAME}=${token}` },
  });
}

test("valid facilitator sessions can read anonymous response rows", async () => {
  const handlers = createFacilitatorHandlers({
    store: { listAll: async () => facilitatorRows },
    now: () => currentTime,
  });

  const response = await handlers.GET(await facilitatorRequest());

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.responses[0].exercise_title, "The Master Prompt: Build Your AI Operating System");
  assert.equal(body.responses[0].exercise_number, 1);
  assert.deepEqual(body.responses[0].fields, [{ id: "title", label: "Your title", value: "VP" }]);
  assert.equal(body.responses[0].notes, "Facilitator view");
  assert.equal(body.responses[0].payload, undefined);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("participant sessions cannot read or export facilitator data", async () => {
  const handlers = createFacilitatorHandlers({
    store: { listAll: async () => facilitatorRows },
    now: () => currentTime,
  });
  const participantToken = await signBleadSession({
    expiresAt: currentTime.getTime() + 60_000,
    secret,
  });
  const participantOnly = () => new Request(
    "https://www.kaindly.ai/Blead/facilitator/api/responses",
    { headers: { cookie: `${BLEAD_COOKIE_NAME}=${participantToken}` } },
  );

  assert.equal((await handlers.GET(participantOnly())).status, 401);
  assert.equal((await handlers.EXPORT(participantOnly())).status, 401);
});

test("facilitator export is private downloadable CSV", async () => {
  const handlers = createFacilitatorHandlers({
    store: { listAll: async () => facilitatorRows },
    now: () => currentTime,
  });
  const response = await handlers.EXPORT(await facilitatorRequest({
    url: "https://www.kaindly.ai/Blead/facilitator/api/export.csv",
  }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.match(
    response.headers.get("content-disposition"),
    /attachment; filename="bracco-session-1-responses-2026-10-07\.csv"/u,
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(await response.text(), /Facilitator view/u);
});

test("facilitator APIs deny missing configuration and direct unauthenticated URLs", async () => {
  const handlers = createFacilitatorHandlers({
    store: { listAll: async () => facilitatorRows },
    now: () => currentTime,
  });
  const direct = new Request("https://www.kaindly.ai/api/blead-facilitator-responses");
  assert.equal((await handlers.GET(direct)).status, 401);

  const configured = process.env.BLEAD_FACILITATOR_SESSION_SECRET;
  delete process.env.BLEAD_FACILITATOR_SESSION_SECRET;
  try {
    assert.equal((await handlers.GET(await facilitatorRequest({ token: "missing" }))).status, 401);
  } finally {
    process.env.BLEAD_FACILITATOR_SESSION_SECRET = configured;
  }
});

test("facilitator database failures remain generic and payload-free", async () => {
  const logged = [];
  const handlers = createFacilitatorHandlers({
    store: { listAll: async () => { throw new Error("Facilitator view secret content"); } },
    now: () => currentTime,
    logger: { error: (...values) => logged.push(values) },
    requestId: () => "facilitator-request-id",
  });

  const response = await handlers.GET(await facilitatorRequest());
  const logText = JSON.stringify(logged);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load responses" });
  assert.match(logText, /facilitator_database_read/u);
  assert.doesNotMatch(logText, /secret content|75f6c553/iu);
});
