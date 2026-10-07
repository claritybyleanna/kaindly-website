# Blead Facilitator Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically save anonymous Session 1 workbook entries to a facilitator-only dashboard with safe CSV export and deletion beginning March 1, 2027.

**Architecture:** Keep the existing generated static site and add focused Node.js Vercel Functions behind protected `/Blead/` rewrites. Store one validated JSON exercise snapshot per anonymous participant and exercise in Vercel-managed Neon Postgres. Preserve local browser storage as the immediate fallback while a separate signed facilitator session gates the dashboard and exports.

**Tech Stack:** Node.js 24, browser ES modules, Vercel Routing Middleware and Functions, `@neondatabase/serverless`, Neon Postgres, Vercel Cron, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-07-blead-facilitator-dashboard-design.md`

## Global Constraints

- Participants remain anonymous; do not collect names, email addresses, IP-derived identity, user-agent identity, or browser fingerprints.
- Generate a random UUID with `crypto.randomUUID()` and reuse it only within the same browser profile.
- Keep existing per-field local browser persistence as the immediate offline fallback.
- Store the facilitator password only in `BLEAD_FACILITATOR_PASSWORD`; never commit or render its value.
- Use a distinct `BLEAD_FACILITATOR_SESSION_SECRET`, cookie name, signature context, and cookie path from participant sessions.
- Facilitator sessions last four hours and use `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/Blead/facilitator/`.
- Retain responses through February 28, 2027; use `2027-03-01T06:00:00.000Z` as the deletion threshold corresponding to midnight America/Chicago.
- Beginning at the deletion threshold, reject participant writes with `410 Gone` and let the daily retention job delete expired rows.
- Participant-facing copy must say that KAINDLY facilitators can see entries; remove the misleading phrase `private notes`.
- Keep all Bracco content role-based and preserve the existing hub, workbook, PDF download, and site navigation.
- Use Node.js functions, not the Edge runtime. Keep request and response payloads comfortably below Vercel's 4.5 MB function limit.
- Configure and verify Preview before configuring or deploying Production.

## Review Focus

- A slow older autosave must not overwrite a newer edit; serialize saves per exercise and send the latest queued snapshot after the current request completes.
- A valid participant cookie must not authorize facilitator HTML, response JSON, or CSV export; test both logical and physical API URLs.
- CSV values containing commas, newlines, quotes, or leading `=`, `+`, `-`, or `@` must remain data rather than executable spreadsheet formulas.
- Cleanup must be a no-op before March 1, 2027, idempotent afterward, and participant writes must fail after the deadline.
- Network failure must leave local work intact, announce the offline state, and retry on a later edit or page lifecycle flush.

---

## File Structure

### New files

- `lib/blead-response-domain.js` — input validation, retention constants, CSV serialization, and response normalization.
- `lib/blead-db.js` — lazy Neon query client creation.
- `lib/blead-response-store.js` — parameterized persistence operations independent of HTTP.
- `lib/blead-response-api.js` — authenticated participant, facilitator, export, and retention request handlers with injected stores for tests.
- `api/blead-responses.js` — participant `GET` and `POST` Vercel Function exports.
- `api/blead-facilitator-responses.js` — facilitator `GET` Vercel Function export.
- `api/blead-facilitator-export.js` — facilitator CSV `GET` Vercel Function export.
- `api/blead-retention.js` — cron-only retention `GET` Vercel Function export.
- `scripts/migrate-blead-db.mjs` — idempotent table and index migration.
- `assets/js/blead-prompt-sync.js` — anonymous ID, debounce queue, sync status, and lifecycle flush behavior.
- `assets/js/blead-facilitator.js` — safe dashboard rendering, filters, and export action.
- `assets/css/blead-facilitator.css` — facilitator access and dashboard styling.
- `scripts/build-blead-facilitator.mjs` — deterministic generation of facilitator access and dashboard pages.
- `Blead/facilitator/access/index.html` — generated facilitator sign-in page.
- `Blead/facilitator/index.html` — generated facilitator dashboard shell.
- `tests/blead-response-domain.test.mjs` — validation, retention, and CSV tests.
- `tests/blead-response-store.test.mjs` — query contract tests.
- `tests/blead-response-api.test.mjs` — auth, HTTP, physical-route, export, and retention tests.
- `tests/blead-prompt-sync.test.mjs` — anonymous ID, serialized autosave, failure, and retry tests.
- `tests/blead-facilitator.test.mjs` — deterministic page and safe client-rendering tests.

### Modified files

- `package.json` and `package-lock.json` — Node 24 declaration, Neon dependency, build and migration scripts.
- `lib/blead-auth.js` — facilitator-only session primitives without changing participant token compatibility.
- `middleware.js` — facilitator login/logout and route isolation before participant-route handling.
- `scripts/build-blead-prompts.mjs` — participant notice, honest notes copy, and global sync status.
- `assets/js/blead-prompts.js` — connect current local persistence to the sync controller.
- `assets/css/blead-prompts.css` — notice and sync-state styles.
- `scripts/blead-prototype-server.mjs` — local rewrites and test environment for facilitator routes and response handlers.
- `tests/blead-auth.test.mjs` and `tests/blead-prompts.test.mjs` — facilitator isolation and generated-copy assertions.
- `vercel.json` — protected rewrites and daily retention cron.

---

### Task 1: Define and Test the Response Contract

**Files:**
- Create: `lib/blead-response-domain.js`
- Create: `tests/blead-response-domain.test.mjs`

**Interfaces:**
- Consumes: `promptPackContent.prompts` from `Blead/session-1-prompts/content.js`.
- Produces: `BLEAD_WORKBOOK_ID`, `BLEAD_DELETE_AFTER`, `validateParticipantId(value)`, `normalizeExerciseSnapshot(input, content)`, `retentionHasEnded(now, deadline)`, `responsesToCsv(rows, content)`.

- [ ] **Step 1: Write failing validation and retention tests**

```js
test("normalizes only authored fields for an anonymous exercise", () => {
  const result = normalizeExerciseSnapshot({
    participantId: "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930",
    exerciseId: "prompt-01",
    fields: { title: "VP", team: "Analytics" },
    notes: "Try this next week",
  }, promptPackContent);
  assert.deepEqual(result.payload.fields, { title: "VP", team: "Analytics" });
  assert.equal(result.payload.notes, "Try this next week");
  assert.throws(() => normalizeExerciseSnapshot({ participantId: "not-a-uuid" }, promptPackContent), /participant/i);
  assert.throws(() => normalizeExerciseSnapshot({
    participantId: result.participantId,
    exerciseId: "prompt-01",
    fields: { injected: "reject me" },
  }, promptPackContent), /unknown field/i);
});

test("uses the approved fixed retention boundary", () => {
  assert.equal(BLEAD_DELETE_AFTER, "2027-03-01T06:00:00.000Z");
  assert.equal(retentionHasEnded(new Date("2027-03-01T05:59:59.999Z")), false);
  assert.equal(retentionHasEnded(new Date("2027-03-01T06:00:00.000Z")), true);
});
```

- [ ] **Step 2: Run the tests and confirm missing-module failure**

Run: `node --test tests/blead-response-domain.test.mjs`  
Expected: FAIL because `lib/blead-response-domain.js` does not exist.

- [ ] **Step 3: Implement strict normalization**

```js
export const BLEAD_WORKBOOK_ID = "bracco-session-1";
export const BLEAD_DELETE_AFTER = "2027-03-01T06:00:00.000Z";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_FIELD_LENGTH = 12_000;
const MAX_NOTES_LENGTH = 20_000;

export function validateParticipantId(value) {
  const id = String(value ?? "");
  if (!UUID.test(id)) throw new Error("A valid anonymous participant ID is required");
  return id;
}

export function normalizeExerciseSnapshot(input, content) {
  const participantId = validateParticipantId(input?.participantId);
  const prompt = content.prompts.find(({ id }) => id === input?.exerciseId);
  if (!prompt) throw new Error("An approved exercise ID is required");
  const allowed = new Set(prompt.fields.map(({ id }) => id));
  const entries = Object.entries(input?.fields ?? {});
  if (entries.some(([key]) => !allowed.has(key))) throw new Error("Unknown field for this exercise");
  if (entries.some(([, value]) => String(value ?? "").length > MAX_FIELD_LENGTH)) throw new Error("Exercise field exceeds the size limit");
  const notes = String(input?.notes ?? "");
  if (notes.length > MAX_NOTES_LENGTH) throw new Error("Exercise notes exceed the size limit");
  const fields = Object.fromEntries(entries.map(([key, value]) => [key, String(value ?? "")]));
  return {
    participantId,
    workbookId: BLEAD_WORKBOOK_ID,
    exerciseId: prompt.id,
    payload: { fields, notes },
  };
}

export function retentionHasEnded(now = new Date(), deadline = BLEAD_DELETE_AFTER) {
  return now.getTime() >= new Date(deadline).getTime();
}
```

- [ ] **Step 4: Add CSV escaping and formula-injection tests**

```js
test("exports commas, quotes, newlines, and formulas as inert CSV", () => {
  const csv = responsesToCsv([{
    participant_id: "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930",
    exercise_id: "prompt-01",
    payload: { fields: { title: "=HYPERLINK(\"bad\")", team: "A, B\nC" }, notes: "+SUM(1,1)" },
    updated_at: "2026-10-07T15:00:00.000Z",
    delete_after: BLEAD_DELETE_AFTER,
  }], promptPackContent);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"A, B\nC"/);
  assert.match(csv, /"'\+SUM\(1,1\)"/);
});
```

- [ ] **Step 5: Implement `responsesToCsv` with one row per field and repeat the note on the first field row only**

```js
function csvValue(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function responsesToCsv(rows, content) {
  const header = ["Participant ID", "Exercise", "Field", "Response", "Notes", "Updated At", "Delete After"];
  const body = rows.flatMap((row) => {
    const prompt = content.prompts.find(({ id }) => id === row.exercise_id);
    const labels = new Map(prompt.fields.map(({ id, label }) => [id, label]));
    const entries = Object.entries(row.payload.fields);
    const exportEntries = entries.length ? entries : [["", ""]];
    return exportEntries.map(([fieldId, response], index) => [
      row.participant_id,
      prompt.title,
      fieldId ? labels.get(fieldId) ?? fieldId : "",
      response,
      index === 0 ? row.payload.notes : "",
      row.updated_at,
      row.delete_after,
    ]);
  });
  return [header, ...body].map((columns) => columns.map(csvValue).join(",")).join("\r\n") + "\r\n";
}
```

- [ ] **Step 6: Run and commit**

Run: `node --test tests/blead-response-domain.test.mjs`  
Expected: PASS.

```bash
git add lib/blead-response-domain.js tests/blead-response-domain.test.mjs
git commit -m "feat: define anonymous workbook response contract"
```

### Task 2: Add Separate Facilitator Session Primitives

**Files:**
- Modify: `lib/blead-auth.js`
- Modify: `tests/blead-auth.test.mjs`

**Interfaces:**
- Consumes: current HMAC helpers without changing `v1` participant tokens.
- Produces: `BLEAD_FACILITATOR_COOKIE_NAME`, `signBleadFacilitatorSession`, `verifyBleadFacilitatorSession`, `serializeBleadFacilitatorSession`, `clearBleadFacilitatorSession`, `sanitizeBleadFacilitatorReturnTo`.

- [ ] **Step 1: Write failing cookie and token-separation tests**

```js
test("facilitator sessions cannot be substituted with participant sessions", async () => {
  const secret = "facilitator-secret-with-adequate-length";
  const facilitator = await signBleadFacilitatorSession({ expiresAt: 20_000, secret });
  const participant = await signBleadSession({ expiresAt: 20_000, secret });
  assert.equal(await verifyBleadFacilitatorSession(facilitator, secret, 10_000), true);
  assert.equal(await verifyBleadFacilitatorSession(participant, secret, 10_000), false);
});

test("facilitator cookies are HTTP-only and narrowly scoped", () => {
  const cookie = serializeBleadFacilitatorSession("token", { secure: true, maxAge: 14_400 });
  assert.match(cookie, /^kaindly_blead_facilitator_session=token/);
  assert.match(cookie, /Path=\/Blead\/facilitator\//);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
});
```

- [ ] **Step 2: Run the targeted auth tests**

Run: `node --test tests/blead-auth.test.mjs`  
Expected: FAIL because facilitator exports do not exist.

- [ ] **Step 3: Implement a context-bound v2 token while retaining participant v1 verification**

```js
export const BLEAD_FACILITATOR_COOKIE_NAME = "kaindly_blead_facilitator_session";

async function signScopedSession({ expiresAt, secret, scope }) {
  if (encoder.encode(String(secret ?? "")).byteLength < 32) throw new Error("Session secret must be at least 32 bytes");
  const payload = `v2.${scope}.${Number(expiresAt)}`;
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export function signBleadFacilitatorSession(options) {
  return signScopedSession({ ...options, scope: "facilitator" });
}

export async function verifyBleadFacilitatorSession(token, secret, now = Date.now()) {
  return verifyScopedSession(token, secret, "facilitator", now);
}
```

- [ ] **Step 4: Add scoped cookie serialization and safe return-path tests, then implement them**

`sanitizeBleadFacilitatorReturnTo` accepts only `/Blead/facilitator/` and same-tree nested paths, rejecting protocol-relative URLs and traversal. `clearBleadFacilitatorSession` uses `Max-Age=0` with the identical cookie path.

- [ ] **Step 5: Run and commit**

Run: `node --test tests/blead-auth.test.mjs`  
Expected: PASS with existing participant compatibility tests unchanged.

```bash
git add lib/blead-auth.js tests/blead-auth.test.mjs
git commit -m "feat: isolate Blead facilitator sessions"
```

### Task 3: Provision and Abstract Neon Persistence

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/blead-db.js`
- Create: `lib/blead-response-store.js`
- Create: `scripts/migrate-blead-db.mjs`
- Create: `tests/blead-response-store.test.mjs`

**Interfaces:**
- Consumes: validated snapshots from Task 1.
- Produces: `getBleadQuery()` and `createBleadResponseStore(query)` with `upsert(snapshot)`, `listByParticipant(participantId)`, `listAll()`, and `deleteExpired(now)`.

- [ ] **Step 1: Install the supported Neon driver and declare Node 24**

Run: `npm install @neondatabase/serverless@^1.0.2`  
Then add `"engines": { "node": "24.x" }` and `"migrate:blead": "node --env-file=.env.local scripts/migrate-blead-db.mjs"` to `package.json`.

- [ ] **Step 2: Write failing store contract tests with an injected query recorder**

```js
test("upserts one snapshot per participant and exercise", async () => {
  const calls = [];
  const store = createBleadResponseStore(async (text, values) => {
    calls.push({ text, values });
    return [{ participant_id: values[0], exercise_id: values[2] }];
  });
  await store.upsert(snapshot);
  assert.match(calls[0].text, /ON CONFLICT \(participant_id, workbook_id, exercise_id\)/i);
  assert.equal(calls[0].values[0], snapshot.participantId);
  assert.equal(calls[0].values[4], BLEAD_DELETE_AFTER);
});
```

- [ ] **Step 3: Run the store test and verify it fails**

Run: `node --test tests/blead-response-store.test.mjs`  
Expected: FAIL because the store module is missing.

- [ ] **Step 4: Implement lazy Neon query creation**

```js
import { neon } from "@neondatabase/serverless";

let query;
export function getBleadQuery() {
  if (query) return query;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const sql = neon(connectionString);
  query = (text, values = []) => sql.query(text, values);
  return query;
}
```

- [ ] **Step 5: Implement parameterized store operations**

`upsert` uses `INSERT ... ON CONFLICT ... DO UPDATE SET payload = EXCLUDED.payload, updated_at = now(), delete_after = EXCLUDED.delete_after RETURNING ...`. `listByParticipant` filters by both participant and workbook. `listAll` orders by `updated_at DESC, participant_id, exercise_id`. `deleteExpired` uses `DELETE ... WHERE delete_after <= $1 RETURNING participant_id`.

- [ ] **Step 6: Create the idempotent migration script**

```js
const statements = [
  `CREATE TABLE IF NOT EXISTS blead_workbook_responses (
    participant_id uuid NOT NULL,
    workbook_id text NOT NULL,
    exercise_id text NOT NULL,
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    delete_after timestamptz NOT NULL,
    PRIMARY KEY (participant_id, workbook_id, exercise_id)
  )`,
  `CREATE INDEX IF NOT EXISTS blead_workbook_responses_updated_idx
     ON blead_workbook_responses (workbook_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS blead_workbook_responses_delete_idx
     ON blead_workbook_responses (delete_after)`,
];
```

The script fails closed when `DATABASE_URL` is absent, executes each statement through `getBleadQuery()`, and prints only statement counts—not connection strings.

- [ ] **Step 7: Provision Preview Neon, pull environment variables, migrate, test, and commit**

Run: `npm exec --yes vercel -- integration add neon` and connect the resource to Preview first.  
Run: `npm exec --yes vercel -- env pull .env.local --yes --environment=preview`  
Run: `npm run migrate:blead`  
Run: `node --test tests/blead-response-store.test.mjs`  
Expected: PASS; migration is safe to run twice.

```bash
git add package.json package-lock.json lib/blead-db.js lib/blead-response-store.js scripts/migrate-blead-db.mjs tests/blead-response-store.test.mjs
git commit -m "feat: persist anonymous Blead responses in Neon"
```

### Task 4: Add Participant Response APIs and Protected Rewrites

**Files:**
- Create: `lib/blead-response-api.js`
- Create: `api/blead-responses.js`
- Create: `vercel.json`
- Create: `tests/blead-response-api.test.mjs`

**Interfaces:**
- Consumes: `verifyBleadSession`, `readCookie`, `normalizeExerciseSnapshot`, `retentionHasEnded`, `createBleadResponseStore`.
- Produces: `createParticipantResponseHandlers({ store, now })` returning Web API `GET(request)` and `POST(request)` functions.

- [ ] **Step 1: Write failing participant API tests**

Tests must cover a valid signed participant cookie, missing/tampered cookies, a direct request to `/api/blead-responses`, hostile `Origin`, malformed UUID, unknown exercise/field rejection, oversized-value rejection, database failure, and `410 Gone` at the deadline.

```js
test("participant POST validates and upserts an authored snapshot", async () => {
  const saved = [];
  const { POST } = createParticipantResponseHandlers({
    store: { upsert: async (value) => (saved.push(value), value) },
    now: () => new Date("2026-10-07T15:00:00.000Z"),
  });
  const response = await POST(authenticatedRequest("POST", validBody));
  assert.equal(response.status, 200);
  assert.equal(saved[0].workbookId, "bracco-session-1");
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/blead-response-api.test.mjs`  
Expected: FAIL because the handler factory is missing.

- [ ] **Step 3: Implement API helpers and participant handlers**

The handler must:

1. Verify `BLEAD_COOKIE_NAME` with `BLEAD_SESSION_SECRET` inside the function.
2. Require `request.headers.get("origin") === new URL(request.url).origin` for POST.
3. Return JSON with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow`.
4. Reject writes after `BLEAD_DELETE_AFTER` with status 410.
5. Parse at most one JSON exercise snapshot, normalize it against `promptPackContent`, and upsert it.
6. Let GET return only rows matching the requested anonymous participant UUID.
7. Log only a stable error category and request ID; never log payloads, notes, participant IDs, secrets, or connection strings.

- [ ] **Step 4: Add thin Vercel Function exports**

```js
import { createParticipantResponseHandlers } from "../lib/blead-response-api.js";
import { createBleadResponseStore } from "../lib/blead-response-store.js";
import { getBleadQuery } from "../lib/blead-db.js";

function handlers() {
  return createParticipantResponseHandlers({ store: createBleadResponseStore(getBleadQuery()) });
}
export function GET(request) { return handlers().GET(request); }
export function POST(request) { return handlers().POST(request); }
```

- [ ] **Step 5: Add the participant rewrite without exposing a broader cookie path**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/Blead/api/responses", "destination": "/api/blead-responses" }
  ]
}
```

- [ ] **Step 6: Run and commit**

Run: `node --test tests/blead-response-api.test.mjs tests/blead-auth.test.mjs`  
Expected: PASS, including a direct physical API URL without valid auth returning 401.

```bash
git add lib/blead-response-api.js api/blead-responses.js vercel.json tests/blead-response-api.test.mjs
git commit -m "feat: add protected Blead response API"
```

### Task 5: Add Anonymous Autosave to the Workbook

**Files:**
- Create: `assets/js/blead-prompt-sync.js`
- Create: `tests/blead-prompt-sync.test.mjs`
- Modify: `assets/js/blead-prompts.js`
- Modify: `scripts/build-blead-prompts.mjs`
- Modify: `assets/css/blead-prompts.css`
- Modify: `tests/blead-prompts.test.mjs`
- Modify: `Blead/session-1-prompts/index.html` (generated)

**Interfaces:**
- Consumes: `/Blead/api/responses`, current `saveExerciseValue` and authored prompt DOM attributes.
- Produces: `getOrCreateParticipantId(storage, crypto)`, `createAutosaveController({ save, delay, timers })`, `collectExerciseSnapshot(card, participantId)`, `initializePromptSync(...)`.

- [ ] **Step 1: Write failing ID and serialized-debounce tests**

```js
test("reuses one random anonymous ID in the same browser", () => {
  const values = new Map();
  const storage = mapStorage(values);
  const crypto = { randomUUID: () => "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930" };
  assert.equal(getOrCreateParticipantId(storage, crypto), getOrCreateParticipantId(storage, crypto));
});

test("queues the newest snapshot while one save is in flight", async () => {
  const resolvers = [];
  const sent = [];
  const controller = createAutosaveController({
    delay: 0,
    save: (snapshot) => new Promise((resolve) => { sent.push(snapshot); resolvers.push(resolve); }),
  });
  controller.schedule({ notes: "first" });
  await tick();
  controller.schedule({ notes: "newest" });
  resolvers.shift()({ ok: true });
  await tick();
  assert.deepEqual(sent.map(({ notes }) => notes), ["first", "newest"]);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/blead-prompt-sync.test.mjs`  
Expected: FAIL because the sync module does not exist.

- [ ] **Step 3: Implement the anonymous ID, one-in-flight queue, and status callback**

The controller exposes `schedule(snapshot)`, `flush(snapshot)`, and `whenIdle()`. It debounces for 750 ms, never runs two saves for the same controller concurrently, replaces a pending snapshot with the newest one, and reports `saving`, `saved`, or `offline` without throwing away the local value.

- [ ] **Step 4: Connect each prompt card to local-first server sync**

In `blead-prompts.js`, retain existing field-level local saves, then call `controller.schedule(collectExerciseSnapshot(card, participantId))` after each input. Use `fetch("/Blead/api/responses", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) })`. Treat non-2xx as a sync failure and keep the local state.

On page initialization, GET the same participant's server snapshots. If the local card has no stored values, hydrate from the server. If local values exist, treat them as authoritative and schedule an upsert so older server data cannot replace unsynced local work.

- [ ] **Step 5: Replace misleading notes copy and add the disclosure/status region**

Generated copy must include:

> Your entries are automatically saved under an anonymous participant ID and are visible only to KAINDLY facilitators. Do not enter personal, patient, regulated, confidential, or otherwise restricted information. Responses are retained through February 28, 2027.

Change `Your private notes` to `Exercise notes` and `Saved only in this browser on this device.` to `Saved on this device and synced to KAINDLY when connected.` Add a page-level `role="status"` region for sync state.

- [ ] **Step 6: Add failure and lifecycle tests**

Tests must verify local values survive rejected fetches; the status becomes offline; a later edit retries; blur or `visibilitychange` flushes the latest snapshot; server data never overwrites populated local fields; and no participant ID appears in visible text.

- [ ] **Step 7: Build, test, and commit**

Run: `npm run build:blead`  
Run: `node --test tests/blead-prompt-sync.test.mjs tests/blead-prompts.test.mjs`  
Expected: PASS and deterministic generated HTML.

```bash
git add assets/js/blead-prompt-sync.js assets/js/blead-prompts.js assets/css/blead-prompts.css scripts/build-blead-prompts.mjs Blead/session-1-prompts/index.html tests/blead-prompt-sync.test.mjs tests/blead-prompts.test.mjs
git commit -m "feat: autosave anonymous Session 1 responses"
```

### Task 6: Build and Protect Facilitator Access

**Files:**
- Create: `scripts/build-blead-facilitator.mjs`
- Create: `assets/css/blead-facilitator.css`
- Create: `Blead/facilitator/access/index.html` (generated)
- Create: `Blead/facilitator/index.html` (generated shell)
- Create: `tests/blead-facilitator.test.mjs`
- Modify: `middleware.js`
- Modify: `tests/blead-auth.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: facilitator auth primitives from Task 2.
- Produces: `isFacilitatorPath(pathname)`, `handleBleadFacilitatorAccess(request, options)`, deterministic access/dashboard pages, and a four-hour facilitator session.

- [ ] **Step 1: Write failing middleware isolation tests**

Tests must prove:

- `/Blead/facilitator/` redirects to `/Blead/facilitator/access/` without a facilitator cookie.
- A valid participant cookie still redirects.
- A valid facilitator cookie reaches the dashboard.
- The facilitator password creates only the facilitator cookie and never appears in the response.
- Facilitator logout clears only the facilitator cookie.
- Missing facilitator env configuration fails closed for facilitator paths without breaking participant pages.

- [ ] **Step 2: Implement facilitator routing before generic `/Blead/` handling**

Use `BLEAD_FACILITATOR_PASSWORD` and `BLEAD_FACILITATOR_SESSION_SECRET`. POSTs require same origin. The session expiry is `now + 4 * 60 * 60 * 1000`. Facilitator access and logout paths are handled before the generic participant path branch so participant authentication cannot grant dashboard access.

- [ ] **Step 3: Generate branded access and dashboard shells**

The access page copy says `KAINDLY Facilitator Access` and never names or hints at the password. The dashboard shell contains a retention notice, filter input, response count, empty/error/loading states, an `Export CSV` link to `/Blead/facilitator/api/export.csv`, and a facilitator logout form.

- [ ] **Step 4: Add deterministic-build and content-safety tests**

```js
test("facilitator pages are private, deterministic, and contain no secret", async () => {
  const access = await readFile(accessUrl, "utf8");
  const dashboard = await readFile(dashboardUrl, "utf8");
  assert.match(access, /KAINDLY Facilitator Access/);
  assert.match(dashboard, /Responses are retained through February 28, 2027/);
  assert.doesNotMatch(`${access}${dashboard}`, /test-facilitator-password/i);
  assert.equal(dashboard, renderBleadFacilitatorDashboard());
});
```

- [ ] **Step 5: Add the facilitator build to `build:blead`, run, and commit**

Run: `npm run build:blead`  
Run: `node --test tests/blead-auth.test.mjs tests/blead-facilitator.test.mjs`  
Expected: PASS.

```bash
git add middleware.js lib/blead-auth.js scripts/build-blead-facilitator.mjs assets/css/blead-facilitator.css Blead/facilitator/access/index.html Blead/facilitator/index.html tests/blead-auth.test.mjs tests/blead-facilitator.test.mjs package.json
git commit -m "feat: protect Blead facilitator access"
```

### Task 7: Add Facilitator Response and CSV APIs

**Files:**
- Modify: `lib/blead-response-api.js`
- Create: `api/blead-facilitator-responses.js`
- Create: `api/blead-facilitator-export.js`
- Modify: `vercel.json`
- Modify: `tests/blead-response-api.test.mjs`

**Interfaces:**
- Consumes: facilitator cookie verification, `store.listAll()`, and `responsesToCsv`.
- Produces: `createFacilitatorHandlers({ store })` with `GET(request)` and `EXPORT(request)`.

- [ ] **Step 1: Write failing facilitator JSON and CSV authorization tests**

```js
test("participant sessions cannot read or export facilitator data", async () => {
  const { GET, EXPORT } = createFacilitatorHandlers({ store: fakeStore });
  assert.equal((await GET(participantOnlyRequest())).status, 401);
  assert.equal((await EXPORT(participantOnlyRequest())).status, 401);
});

test("facilitator export is private downloadable CSV", async () => {
  const response = await handlers.EXPORT(facilitatorRequest());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.match(response.headers.get("content-disposition"), /attachment; filename="bracco-session-1-responses-/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
```

- [ ] **Step 2: Implement facilitator verification inside both physical functions**

Both handlers read and verify `BLEAD_FACILITATOR_COOKIE_NAME` with `BLEAD_FACILITATOR_SESSION_SECRET`. They never rely solely on middleware or rewrite paths. JSON returns normalized database rows; CSV delegates to the tested pure serializer.

- [ ] **Step 3: Add thin named Vercel Function exports and rewrites**

Add:

```json
{ "source": "/Blead/facilitator/api/responses", "destination": "/api/blead-facilitator-responses" },
{ "source": "/Blead/facilitator/api/export.csv", "destination": "/api/blead-facilitator-export" }
```

- [ ] **Step 4: Run and commit**

Run: `node --test tests/blead-response-api.test.mjs`  
Expected: PASS for valid facilitator access, participant denial, missing-secret denial, direct physical URL denial, safe CSV, and database failure.

```bash
git add lib/blead-response-api.js api/blead-facilitator-responses.js api/blead-facilitator-export.js vercel.json tests/blead-response-api.test.mjs
git commit -m "feat: expose facilitator responses and CSV"
```

### Task 8: Implement the Facilitator Dashboard Client

**Files:**
- Create: `assets/js/blead-facilitator.js`
- Modify: `assets/css/blead-facilitator.css`
- Modify: `scripts/build-blead-facilitator.mjs`
- Modify: `Blead/facilitator/index.html` (generated)
- Modify: `tests/blead-facilitator.test.mjs`

**Interfaces:**
- Consumes: `/Blead/facilitator/api/responses` JSON.
- Produces: `groupFacilitatorResponses(rows)`, `responseMatchesFilter(group, query)`, `renderFacilitatorResponses(root, groups)`, `initializeFacilitatorDashboard(...)`.

- [ ] **Step 1: Write failing grouping, filtering, and safe-rendering tests**

Use fake DOM nodes whose `textContent` setter records values. Include a response containing `<img src=x onerror=alert(1)>` and assert it is assigned as text and never passed to `innerHTML`.

- [ ] **Step 2: Implement pure grouping and filtering**

Group rows by participant UUID, sort participants by most recent `updated_at`, sort exercises by authored prompt order, and match case-insensitive participant-ID prefixes plus exercise titles.

- [ ] **Step 3: Implement DOM rendering with `createElement` and `textContent` only**

Each participant card shows an abbreviated display ID, full ID in accessible copy, last updated time, completion count, and exercise disclosures. Each field displays authored labels from the API response; notes appear in their own block only when non-empty.

- [ ] **Step 4: Add fetch, filter, export, loading, empty, and failure states**

Fetch with `credentials: "same-origin"`. A 401 response redirects to `/Blead/facilitator/access/?returnTo=/Blead/facilitator/`. The export control remains a regular same-origin download link so the facilitator cookie is included automatically.

- [ ] **Step 5: Build, test, and commit**

Run: `npm run build:blead`  
Run: `node --test tests/blead-facilitator.test.mjs`  
Expected: PASS, including hostile response text remaining inert.

```bash
git add assets/js/blead-facilitator.js assets/css/blead-facilitator.css scripts/build-blead-facilitator.mjs Blead/facilitator/index.html tests/blead-facilitator.test.mjs
git commit -m "feat: render private facilitator dashboard"
```

### Task 9: Add and Verify Automatic Retention Cleanup

**Files:**
- Modify: `lib/blead-response-api.js`
- Create: `api/blead-retention.js`
- Modify: `vercel.json`
- Modify: `tests/blead-response-api.test.mjs`

**Interfaces:**
- Consumes: `store.deleteExpired(now)`, `CRON_SECRET`, and `BLEAD_DELETE_AFTER`.
- Produces: `createRetentionHandler({ store, now })` and cron `GET(request)`.

- [ ] **Step 1: Write failing retention tests**

Test invalid or absent bearer secrets; exact valid authorization; a no-op one millisecond before the deadline; deletion at the deadline; repeated deletion returning zero without error; and responses containing counts but no participant IDs.

- [ ] **Step 2: Implement the cron handler**

```js
export function createRetentionHandler({ store, now = () => new Date() }) {
  return async function GET(request) {
    if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const current = now();
    if (!retentionHasEnded(current)) return Response.json({ ok: true, deleted: 0, active: true });
    const deleted = await store.deleteExpired(current.toISOString());
    return Response.json({ ok: true, deleted: deleted.length, active: false });
  };
}
```

- [ ] **Step 3: Add the thin function and daily cron**

```json
"crons": [
  { "path": "/api/blead-retention", "schedule": "0 9 * * *" }
]
```

- [ ] **Step 4: Run and commit**

Run: `node --test tests/blead-response-api.test.mjs tests/blead-response-store.test.mjs`  
Expected: PASS before, at, and after the retention boundary.

```bash
git add lib/blead-response-api.js api/blead-retention.js vercel.json tests/blead-response-api.test.mjs
git commit -m "feat: delete expired Blead responses automatically"
```

### Task 10: Extend Local Integration Coverage

**Files:**
- Modify: `scripts/blead-prototype-server.mjs`
- Modify: `tests/blead-access.test.mjs`
- Modify: `tests/blead-auth.test.mjs`
- Modify: `tests/blead-prompts.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: all prior static routes and handler factories.
- Produces: a local prototype that exercises participant login, participant API, facilitator login, facilitator API, and CSV export with an injected in-memory store.

- [ ] **Step 1: Add a deterministic in-memory response store to the prototype server**

The store is process-local and development-only. It matches the production store interface exactly and is never imported by production Vercel Functions.

- [ ] **Step 2: Add full-flow tests**

The test must:

1. Log in as a participant.
2. POST an anonymous prompt snapshot through `/Blead/api/responses`.
3. Confirm the participant cannot open `/Blead/facilitator/`.
4. Log in separately as a facilitator using only test credentials.
5. Retrieve the anonymous response through the facilitator API.
6. Download CSV and verify the participant ID and inert response text.
7. Confirm both dashboard and APIs send no-store/noindex headers.

- [ ] **Step 3: Run the entire local suite and commit**

Run: `npm run build:blead`  
Run: `npm test`  
Expected: all existing and new tests pass; no current website, McLendon, PDF, hub, or workbook assertions regress.

```bash
git add scripts/blead-prototype-server.mjs tests/blead-access.test.mjs tests/blead-auth.test.mjs tests/blead-prompts.test.mjs package.json
git commit -m "test: verify Blead autosave and facilitator flow"
```

### Task 11: Configure and Verify a Preview Deployment

**Files:**
- No committed source changes unless verification finds a defect.

**Interfaces:**
- Consumes: linked Vercel project, Preview Neon database, and built branch.
- Produces: a reviewable Vercel Preview URL with working anonymous autosave and facilitator dashboard.

- [ ] **Step 1: Configure Preview-only secrets without echoing values**

Set `BLEAD_FACILITATOR_PASSWORD`, a generated 48-byte `BLEAD_FACILITATOR_SESSION_SECRET`, `CRON_SECRET`, `DATABASE_URL`, and `BLEAD_DELETE_AFTER=2027-03-01T06:00:00.000Z` for Preview. Use interactive Vercel prompts or stdin so secret values do not appear in command history or logs.

- [ ] **Step 2: Pull Preview env, run the idempotent migration twice, and execute the full suite**

Run: `npm exec --yes vercel -- env pull .env.local --yes --environment=preview`  
Run: `npm run migrate:blead` twice  
Run: `npm test`  
Expected: both migrations succeed and all tests pass.

- [ ] **Step 3: Deploy Preview and perform browser verification**

Deploy with `npm exec --yes vercel -- --yes --scope claritybyleannas-projects`. In a clean browser session, verify participant login, notice, stable anonymous ID across reload, saving/saved states, local fallback while offline, facilitator denial, separate facilitator login, response display, filtering, and CSV download.

- [ ] **Step 4: Verify direct-route and retention defenses**

Request each physical `/api/blead-*` endpoint without cookies and expect 401. Request the retention endpoint without `CRON_SECRET` and expect 401. Confirm preview response headers are private/no-store and no secret values appear in HTML, JavaScript, network response bodies, or logs.

- [ ] **Step 5: Record the preview URL and verification evidence in the handoff**

Do not deploy Production until the Preview behavior is approved.

### Task 12: Production Rollout and Final Verification

**Files:**
- No committed source changes unless verification finds a defect.

**Interfaces:**
- Consumes: approved Preview deployment.
- Produces: verified Production autosave, facilitator dashboard, CSV export, and scheduled cleanup.

- [ ] **Step 1: Configure Production storage and secrets**

Connect the production Neon branch/database, apply the migration, and set the facilitator password, generated facilitator session secret, cron secret, and fixed retention deadline for Production without echoing values.

- [ ] **Step 2: Re-run verification immediately before deployment**

Run: `npm run build:blead`  
Run: `npm test`  
Run: `git diff --check`  
Expected: deterministic build, all tests pass, and no whitespace errors.

- [ ] **Step 3: Deploy Production**

Run: `npm exec --yes vercel -- --prod --yes --scope claritybyleannas-projects`.

- [ ] **Step 4: Verify the complete production story**

Confirm:

- `https://www.kaindly.ai/Blead/session-1-prompts/` autosaves a test response under an anonymous ID.
- `https://www.kaindly.ai/Blead/facilitator/` requires the separate facilitator password.
- The dashboard shows the anonymous test response and exports valid CSV.
- A participant-only cookie cannot access facilitator JSON or CSV.
- The Session 1 PDF still returns `application/pdf` after participant authentication.
- Public KAINDLY pages, `/Blead/`, and `/McLendon/` still return expected content.
- The Vercel deployment is `READY`, the custom domain is aliased, and the daily cron exists.

- [ ] **Step 5: Remove the production smoke-test response through a narrowly scoped maintenance query and report the retention schedule**

Delete only the known smoke-test participant UUID, confirm it disappears from the dashboard and CSV, and leave all real participant data untouched.

---

## Self-Review

- **Spec coverage:** Every approved requirement maps to Tasks 1–12: anonymity, local fallback, autosave, facilitator-only auth, dashboard, CSV, fixed retention, deletion, participant notice, Preview-first rollout, and production verification.
- **Placeholder scan:** No unresolved placeholders, unspecified error handling, or unnamed follow-up implementation remains in the plan.
- **Interface consistency:** Domain normalization feeds the store; the store feeds injected API handlers; thin Vercel functions construct those dependencies; clients call only rewritten protected URLs.
- **Review focus coverage:** Serialized saves are tested in Task 5; auth isolation and direct routes in Tasks 6–7; CSV hazards in Tasks 1 and 7; retention boundaries in Task 9; offline preservation in Task 5.
