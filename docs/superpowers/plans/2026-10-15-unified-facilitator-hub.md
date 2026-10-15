# Unified KAINDLY Facilitator Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect every current KAINDLY workbook to one anonymous-response backend and deliver a private, client-neutral `/dashboard/` with exact-email magic-link access, filtering, and safe CSV export.

**Architecture:** Generalize the existing Blead local-first response system behind a server-owned workbook registry. Keep one workbook-scoped anonymous UUID per browser, validate every field against the route-selected registry entry, persist to the existing Neon table after a non-destructive migration, and expose the data only through Clerk-authenticated dashboard APIs. Migrate Blead first through compatibility adapters, then add Bsales and McLendon without changing their participant-facing copy except for the two approved McLendon accuracy corrections.

**Tech Stack:** Node.js 24, browser ES modules, Vercel Routing Middleware and Functions, `@neondatabase/serverless`, Neon Postgres, Clerk JavaScript and Backend SDKs, Vercel Cron, esbuild, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-15-unified-facilitator-hub-design.md`

## Global Constraints

- Preserve all current live client routes, downloads, passwords, content, navigation, and copy unless this plan explicitly names a change.
- Preserve every existing row in `blead_workbook_responses`; migration is additive, transactional, and verified before Production.
- Collect typed workbook responses only. Do not store names, participant emails, page views, clicks, completion state, IP-derived identity, user-agent identity, or browser fingerprints.
- Scope anonymous UUIDs to one workbook and browser profile. Never reuse a participant UUID to correlate separate workbooks.
- Route adapters select `clientId`, `programId`, and `workbookId` on the server. Never accept those identities as authoritative request-body or query-string values.
- Keep local browser values as the immediate source of truth. A failed network save must not erase local work or block continued use.
- Retain all four current 2026 workbooks through February 28, 2027, using the explicit `2027-03-01T06:00:00.000Z` deletion threshold. Future workbook registrations must provide a valid future deadline.
- Allow only `leanna.baker@kaindly.ai` to access dashboard HTML, JSON, and CSV. Check a valid Clerk session, verified primary email, canonical exact email, and four-hour session age on the server.
- Keep participant sessions and dashboard sessions independent. Neither may authorize the other's routes.
- Keep private HTML, JSON, and CSV uncached with `Cache-Control: private, no-store` and unindexed with `X-Robots-Tag: noindex, nofollow`.
- Render participant response text only with `textContent`/text nodes. Never inject stored response data through `innerHTML`.
- Neutralize leading `=`, `+`, `-`, and `@` in CSV cells and correctly escape quotes, commas, and newlines.
- Do not log participant response bodies. Log only a failure category and generated request ID.
- Preserve unrelated dirty-worktree changes. Stage only the files named by the current task before each commit.
- Stop after the verified Vercel Preview and user review. Do not migrate or deploy Production without a separate explicit approval.

## Review Focus

- Cross-workbook isolation: one route must never read or write another workbook, even if a request body is tampered with.
- Migration safety: existing Blead rows must be backfilled and remain queryable before `NOT NULL` constraints are added.
- Save ordering: a slow earlier request must never overwrite a newer edit; only the newest queued snapshot is sent after an in-flight save.
- Local resilience: offline edits survive reload and retry on the next edit, blur, or hidden-page lifecycle event.
- Authentication depth: middleware improves UX, but every physical dashboard function must independently reject missing, expired, unverified, or wrong-email sessions.
- Copy preservation: Bsales and Blead copy stays byte-for-byte stable after generation; McLendon changes only the five approved strings.
- Safe output: hostile HTML remains visible text and spreadsheet formulas remain inert in both the dashboard and CSV.
- Retention: expired workbooks reject writes with `410`, cleanup works across all clients, and repeated cleanup is safe.

---

## File Structure

### New application files

- `lib/workbook-schema.js` — deterministic exercise and field-schema helpers shared by builders and server validation.
- `lib/workbook-registry.js` — validated server-owned client/program/workbook registrations.
- `lib/workbook-response-domain.js` — generic request normalization, limits, retention checks, dashboard formatting, and CSV serialization.
- `lib/workbook-response-store.js` — generic Neon persistence and filtered dashboard queries.
- `lib/workbook-response-api.js` — shared participant, dashboard, export, and retention handlers with injected dependencies.
- `lib/dashboard-auth.js` — Clerk request verification, exact-email authorization, and four-hour session enforcement.
- `lib/mclendon-auth.js` — public-page scoped session used only to protect McLendon response writes from unrelated origins.
- `api/workbook-responses-blead.js` — Blead route adapter.
- `api/workbook-responses-bsales-pack-1.js` — Bsales Pack 1 route adapter.
- `api/workbook-responses-bsales-pack-2.js` — Bsales Pack 2 route adapter.
- `api/workbook-responses-mclendon.js` — McLendon route adapter.
- `api/dashboard-auth-config.js` — public Clerk publishable-key configuration only.
- `api/dashboard-responses.js` — Clerk-authorized filtered dashboard JSON.
- `api/dashboard-export.js` — Clerk-authorized filtered CSV.
- `api/workbook-retention.js` — cron-authorized cross-workbook cleanup.
- `db/migrations/2026-10-15-unified-workbook-responses.sql` — transactional additive migration and indexes.
- `scripts/migrate-workbook-db.mjs` — migration runner with post-migration invariant checks.
- `assets/js/workbook-sync.js` — reusable workbook-scoped local-first autosave engine.
- `assets/js/dashboard-auth-entry.js` — source for Clerk email-link and sign-out browser flow.
- `assets/js/dashboard-auth.js` — generated browser bundle.
- `assets/js/dashboard.js` — dashboard loading, filters, directory, response rendering, and export URL behavior.
- `assets/css/dashboard.css` — access and dashboard layouts.
- `scripts/build-dashboard.mjs` — deterministic dashboard, access, and verification page generator.
- `dashboard/index.html` — generated dashboard shell.
- `dashboard/access/index.html` — generated branded email-link request page.
- `dashboard/verify/index.html` — generated email-link completion page.

### New tests

- `tests/workbook-schema.test.mjs`
- `tests/workbook-registry.test.mjs`
- `tests/workbook-response-domain.test.mjs`
- `tests/workbook-migration.test.mjs`
- `tests/workbook-response-store.test.mjs`
- `tests/workbook-response-api.test.mjs`
- `tests/workbook-sync.test.mjs`
- `tests/mclendon-response-sync.test.mjs`
- `tests/dashboard-auth.test.mjs`
- `tests/dashboard-api.test.mjs`
- `tests/dashboard-ui.test.mjs`
- `tests/unified-retention.test.mjs`

### Modified compatibility and integration files

- `package.json`, `package-lock.json`
- `middleware.js`, `vercel.json`
- `lib/blead-response-domain.js`, `lib/blead-response-store.js`, `lib/blead-response-api.js`, `lib/blead-db.js`
- `api/blead-responses.js`, `api/blead-facilitator-responses.js`, `api/blead-facilitator-export.js`, `api/blead-retention.js`
- `scripts/migrate-blead-db.mjs`, `scripts/build-blead-prompts.mjs`, `scripts/build-blead-facilitator.mjs`, `scripts/build-bsales.mjs`
- `assets/js/blead-prompt-sync.js`, `assets/js/blead-prompts.js`, `assets/js/blead-facilitator.js`, `assets/js/bsales.js`, `assets/js/mclendon.js`
- `Blead/session-1-prompts/index.html`, `Blead/facilitator/index.html`, `Blead/facilitator/access/index.html`
- `bsales/prompt-pack-1/index.html`, `bsales/prompt-pack-2/index.html`
- `McLendon/index.html`
- Existing Blead and Bsales tests whose compatibility assertions change.

---

### Task 1: Define Deterministic Workbook Schemas and the Registry

**Files:**
- Create: `lib/workbook-schema.js`
- Create: `lib/workbook-registry.js`
- Create: `tests/workbook-schema.test.mjs`
- Create: `tests/workbook-registry.test.mjs`

**Interfaces:**
- `createPromptExerciseSchema({ id, title, fields, noteField })`
- `createBsalesSchemas(content)`
- `getWorkbookRegistration(workbookKey)`
- `listWorkbookRegistrations()`
- `validateWorkbookRegistration(registration, now)`
- Initial registry keys: `bracco-leadership-session-1`, `bracco-sales-pack-1`, `bracco-sales-pack-2`, `mclendon-working-smarter`.
- Exact persisted workbook IDs: `bracco-session-1`, `bracco-sales-ai-brain`, `bracco-sales-chief-of-staff`, `mclendon-working-smarter`.

- [ ] **Step 1: Write failing schema tests for stable Bsales IDs**

```js
test("derives stable Bsales exercise and field IDs", () => {
  const [exercise] = createBsalesSchemas(packOneContent);
  assert.equal(exercise.id, "prompt-01");
  assert.equal(exercise.fields[0].id, "field-01");
  assert.ok(exercise.fields[0].label.length > 0);
});
```

- [ ] **Step 2: Write failing registry validation tests**

```js
test("registers every current workbook with explicit identity and retention", () => {
  const registrations = listWorkbookRegistrations();
  assert.deepEqual(registrations.map(({ key }) => key), [
    "bracco-leadership-session-1",
    "bracco-sales-pack-1",
    "bracco-sales-pack-2",
    "mclendon-working-smarter",
  ]);
  assert.deepEqual(registrations.map(({ workbook }) => workbook.id), [
    "bracco-session-1",
    "bracco-sales-ai-brain",
    "bracco-sales-chief-of-staff",
    "mclendon-working-smarter",
  ]);
  assert.ok(registrations.every(({ deleteAfter }) => deleteAfter === "2027-03-01T06:00:00.000Z"));
});

test("rejects duplicate global workbook IDs and missing deadlines", () => {
  assert.throws(() => validateWorkbookRegistration({ workbookId: "duplicate" }), /retention/i);
  assert.throws(() => validateRegistry([
    validRegistration({ key: "one", workbookId: "same" }),
    validRegistration({ key: "two", workbookId: "same" }),
  ]), /duplicate workbook/i);
});
```

- [ ] **Step 3: Run the tests and confirm missing-module failures**

Run: `node --test tests/workbook-schema.test.mjs tests/workbook-registry.test.mjs`  
Expected: FAIL because the new modules do not exist.

- [ ] **Step 4: Implement schema helpers and four immutable registrations**

Each registration must contain:

```js
{
  key,
  client: { id, name },
  program: { id, name },
  workbook: { id, name },
  hubUrl,
  routePrefix,
  participantApiPath,
  deleteAfter,
  exportPrefix,
  exercises: [{ id, title, fields: [{ id, label }], acceptsNotes }],
}
```

Use `Object.freeze()` on the registry and registrations. Build Bsales fields with one shared helper so generated `data-prompt-field` values and server validation cannot drift.

- [ ] **Step 5: Run and commit**

Run: `node --test tests/workbook-schema.test.mjs tests/workbook-registry.test.mjs`  
Expected: PASS.

```bash
git add lib/workbook-schema.js lib/workbook-registry.js tests/workbook-schema.test.mjs tests/workbook-registry.test.mjs
git commit -m "feat: register unified client workbooks"
```

### Task 2: Generalize Validation, Retention, Formatting, and CSV

**Files:**
- Create: `lib/workbook-response-domain.js`
- Create: `tests/workbook-response-domain.test.mjs`
- Modify: `lib/blead-response-domain.js`
- Modify: `tests/blead-response-domain.test.mjs`

**Interfaces:**
- `validateParticipantId(value)`
- `normalizeWorkbookSnapshot(input, registration)`
- `retentionHasEnded(now, deleteAfter)`
- `formatDashboardResponse(row, registration)`
- `responsesToCsv(rows, registrations)`
- Keep current Blead exports as wrappers so existing imports remain valid during migration.

- [ ] **Step 1: Write failing generic normalization tests**

```js
test("uses the route-selected registration and rejects unknown fields", () => {
  const registration = getWorkbookRegistration("bracco-sales-pack-1");
  const result = normalizeWorkbookSnapshot({
    participantId,
    exerciseId: "prompt-01",
    fields: { "field-01": "Regional sales director" },
  }, registration);
  assert.equal(result.clientId, "bracco");
  assert.equal(result.workbookId, registration.workbook.id);
  assert.throws(() => normalizeWorkbookSnapshot({
    participantId,
    exerciseId: "prompt-01",
    fields: { injected: "reject" },
  }, registration), /unknown field/i);
});
```

- [ ] **Step 2: Add hostile CSV and note-only workbook tests**

Assert that dashboard/CSV formatting uses registry labels, exports McLendon note-only rows, and neutralizes formulas and multiline values.

- [ ] **Step 3: Run the tests and confirm failure**

Run: `node --test tests/workbook-response-domain.test.mjs tests/blead-response-domain.test.mjs`  
Expected: FAIL because the generic module is missing.

- [ ] **Step 4: Implement the generic domain and thin Blead compatibility exports**

```js
export function normalizeWorkbookSnapshot(input, registration) {
  const participantId = validateParticipantId(input?.participantId);
  const exercise = registration.exercises.find(({ id }) => id === input?.exerciseId);
  if (!exercise) throw new Error("An approved exercise ID is required");
  const allowed = new Set(exercise.fields.map(({ id }) => id));
  const entries = Object.entries(input?.fields ?? {});
  if (entries.some(([id]) => !allowed.has(id))) throw new Error("Unknown field for this exercise");
  // Enforce field, notes, and total request limits before returning strings only.
  return {
    clientId: registration.client.id,
    programId: registration.program.id,
    workbookId: registration.workbook.id,
    participantId,
    exerciseId: exercise.id,
    payload: { fields: normalizedFields, notes },
    deleteAfter: registration.deleteAfter,
  };
}
```

- [ ] **Step 5: Run and commit**

Run: `node --test tests/workbook-response-domain.test.mjs tests/blead-response-domain.test.mjs`  
Expected: PASS.

```bash
git add lib/workbook-response-domain.js lib/blead-response-domain.js tests/workbook-response-domain.test.mjs tests/blead-response-domain.test.mjs
git commit -m "refactor: generalize workbook response validation"
```

### Task 3: Add the Transactional Neon Migration

**Files:**
- Create: `db/migrations/2026-10-15-unified-workbook-responses.sql`
- Create: `scripts/migrate-workbook-db.mjs`
- Create: `tests/workbook-migration.test.mjs`
- Modify: `scripts/migrate-blead-db.mjs`
- Modify: `package.json`

**Interfaces:**
- SQL adds/backfills/verifies `client_id` and `program_id`, updates indexes, and preserves the primary key and payloads.
- `npm run migrate:workbooks` applies the migration then runs invariant queries.
- `npm run migrate:blead` delegates to the new runner for compatibility.

- [ ] **Step 1: Write a failing migration contract test**

```js
test("migration backfills existing Blead rows before adding non-null constraints", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /BEGIN;/u);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS client_id text/u);
  assert.match(sql, /SET client_id = 'bracco'/u);
  assert.match(sql, /SET program_id = 'leadership-accelerator'/u);
  assert.ok(sql.indexOf("SET NOT NULL") > sql.indexOf("SET client_id"));
  assert.match(sql, /COMMIT;/u);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/workbook-migration.test.mjs`  
Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Write the idempotent transaction**

The SQL order must be:

1. `BEGIN` and acquire an advisory transaction lock.
2. Add nullable columns.
3. Backfill only rows with the legacy Blead workbook ID and null identities.
4. Raise an exception if any identities remain null.
5. Set both columns `NOT NULL`.
6. Create the dashboard filter index on `(client_id, program_id, workbook_id, updated_at DESC)` and preserve the retention index.
7. `COMMIT`.

- [ ] **Step 4: Add post-migration invariants to the runner**

The runner must fail unless:

```sql
SELECT count(*) FILTER (WHERE client_id IS NULL OR program_id IS NULL) AS invalid_rows,
       count(*) FILTER (WHERE workbook_id = 'bracco-session-1') AS preserved_blead_rows
FROM blead_workbook_responses;
```

returns `invalid_rows = 0`. It prints counts only, never payloads.

- [ ] **Step 5: Run unit tests only and commit**

Run: `node --test tests/workbook-migration.test.mjs`  
Expected: PASS. Do not run this migration against Production in this task.

```bash
git add db/migrations/2026-10-15-unified-workbook-responses.sql scripts/migrate-workbook-db.mjs scripts/migrate-blead-db.mjs package.json tests/workbook-migration.test.mjs
git commit -m "feat: add safe unified response migration"
```

### Task 4: Generalize the Response Store and Dashboard Queries

**Files:**
- Create: `lib/workbook-response-store.js`
- Create: `tests/workbook-response-store.test.mjs`
- Modify: `lib/blead-response-store.js`
- Modify: `lib/blead-db.js`
- Modify: `tests/blead-response-store.test.mjs`

**Interfaces:**
- `createWorkbookResponseStore(query)` returns `upsert`, `listByParticipant`, `listDashboard`, `countDashboard`, and `deleteExpired`.
- Blead store delegates to the generic store with its registration.

- [ ] **Step 1: Write failing query-contract tests**

Test that `upsert` uses the snapshot's immutable identity/deadline, `listByParticipant` requires a registration, and dashboard filters become parameter values rather than SQL interpolation.

```js
await store.listDashboard({ clientId: "bracco", workbookId: "sales-pack-1", search: "coach" });
assert.match(calls[0].text, /client_id = \$1/u);
assert.doesNotMatch(calls[0].text, /coach/u);
assert.deepEqual(calls[0].values.slice(0, 3), ["bracco", "sales-pack-1", "%coach%"]);
```

- [ ] **Step 2: Add participant-isolation and date-filter tests**

Assert that reads include participant ID plus client/program/workbook identity and that ISO date bounds are validated before reaching SQL.

- [ ] **Step 3: Run and confirm failure**

Run: `node --test tests/workbook-response-store.test.mjs tests/blead-response-store.test.mjs`  
Expected: FAIL because the generic store does not exist.

- [ ] **Step 4: Implement parameterized queries and compatibility adapter**

Use one `WHERE` builder that returns `{ clauses, values }`. Search must cover approved JSON values and notes with `payload::text ILIKE`, while all client/program/workbook/exercise/participant/date filters remain separate parameters.

- [ ] **Step 5: Run and commit**

Run: `node --test tests/workbook-response-store.test.mjs tests/blead-response-store.test.mjs`  
Expected: PASS.

```bash
git add lib/workbook-response-store.js lib/blead-response-store.js lib/blead-db.js tests/workbook-response-store.test.mjs tests/blead-response-store.test.mjs
git commit -m "refactor: unify workbook response storage"
```

### Task 5: Add Route-Owned Participant APIs for All Workbooks

**Files:**
- Create: `lib/workbook-response-api.js`
- Create: `lib/mclendon-auth.js`
- Create: `api/workbook-responses-blead.js`
- Create: `api/workbook-responses-bsales-pack-1.js`
- Create: `api/workbook-responses-bsales-pack-2.js`
- Create: `api/workbook-responses-mclendon.js`
- Create: `tests/workbook-response-api.test.mjs`
- Modify: `api/blead-responses.js`
- Modify: `lib/blead-response-api.js`
- Modify: `middleware.js`
- Modify: `vercel.json`

**Interfaces:**
- `createParticipantResponseHandlers({ registration, authorize, store, now, logger })`
- Each physical function imports one fixed registry key; no request parameter chooses a workbook.
- McLendon receives a path-scoped, signed, non-identifying session cookie on `/McLendon/` page requests without introducing a password or copy change.

- [ ] **Step 1: Write failing isolation, auth, origin, size, and retention tests**

```js
test("a tampered body cannot move a save into another workbook", async () => {
  const handlers = createParticipantResponseHandlers({
    registration: getWorkbookRegistration("bracco-sales-pack-1"),
    authorize: async () => true,
    store,
  });
  const response = await handlers.POST(requestWithBody({
    clientId: "mclendon",
    workbookId: "mclendon-working-smarter",
    participantId,
    exerciseId: "prompt-01",
    fields: { "field-01": "value" },
  }));
  assert.equal(response.status, 200);
  assert.equal(upserts[0].workbookId, "bracco-sales-ai-brain");
});
```

Also assert `401` for wrong client session, `403` for wrong origin, `400` for unknown fields/oversize JSON, and `410` at the workbook deadline.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/workbook-response-api.test.mjs`  
Expected: FAIL because the shared handlers do not exist.

- [ ] **Step 3: Implement the injected participant handler**

The handler reads at most 64 KiB, validates JSON, authorizes before database access, and always calls `normalizeWorkbookSnapshot(input, registration)` with the closure-owned registration.

- [ ] **Step 4: Create four fixed route adapters and rewrites**

Use these participant URLs:

- `/Blead/api/responses`
- `/bsales/prompt-pack-1/api/responses`
- `/bsales/prompt-pack-2/api/responses`
- `/McLendon/api/responses`

Keep `/api/blead-responses` operational as a thin alias until production verification is complete.

- [ ] **Step 5: Add McLendon session issuance without password gating**

On a normal `/McLendon/` GET, issue an eight-hour `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/McLendon/` signed cookie when absent. The response API validates it; the page remains hidden-but-accessible exactly as it is now.

- [ ] **Step 6: Run route and middleware suites, then commit**

Run: `node --test tests/workbook-response-api.test.mjs tests/blead-response-api.test.mjs tests/blead-access.test.mjs tests/bsales.test.mjs`  
Expected: PASS.

```bash
git add lib/workbook-response-api.js lib/mclendon-auth.js api/workbook-responses-blead.js api/workbook-responses-bsales-pack-1.js api/workbook-responses-bsales-pack-2.js api/workbook-responses-mclendon.js api/blead-responses.js lib/blead-response-api.js middleware.js vercel.json tests/workbook-response-api.test.mjs
git commit -m "feat: add isolated workbook response endpoints"
```

### Task 6: Build the Shared Local-First Autosave Client

**Files:**
- Create: `assets/js/workbook-sync.js`
- Create: `tests/workbook-sync.test.mjs`
- Modify: `assets/js/blead-prompt-sync.js`
- Modify: `tests/blead-prompt-sync.test.mjs`

**Interfaces:**
- `getOrCreateParticipantId(storage, workbookId, cryptoApi)`
- `createAutosaveController({ save, delay, timers, onStatus })`
- `initializeWorkbookSync({ workbookId, endpoint, cards, collectSnapshot, hydrateSnapshot, ... })`
- Blead's old module re-exports/wraps the shared functions during compatibility.

- [ ] **Step 1: Write failing workbook-scoped UUID tests**

```js
test("participant IDs are stable within a workbook and different across workbooks", () => {
  const storage = memoryStorage();
  const first = getOrCreateParticipantId(storage, "sales-pack-1", fakeCrypto([uuidA]));
  const again = getOrCreateParticipantId(storage, "sales-pack-1", fakeCrypto([uuidB]));
  const other = getOrCreateParticipantId(storage, "sales-pack-2", fakeCrypto([uuidB]));
  assert.equal(first, again);
  assert.notEqual(first, other);
});
```

- [ ] **Step 2: Port queue-order, debounce, retry, blur, and hidden-page tests**

Add an explicit failed-save test proving the local snapshot remains present and the newest snapshot is retried after a later lifecycle flush.

- [ ] **Step 3: Run and confirm failure**

Run: `node --test tests/workbook-sync.test.mjs tests/blead-prompt-sync.test.mjs`  
Expected: FAIL because the shared client does not exist.

- [ ] **Step 4: Implement the generic sync engine**

Use storage keys shaped as:

```text
kaindly:workbook:<workbookId>:participant-id
kaindly:workbook:<workbookId>:exercise:<exerciseId>:field:<fieldId>
kaindly:workbook:<workbookId>:exercise:<exerciseId>:notes
```

Hydrate local values first. On server restore, fill only empty local controls. When local controls already contain data, queue the local snapshot to bring the server current.

- [ ] **Step 5: Run and commit**

Run: `node --test tests/workbook-sync.test.mjs tests/blead-prompt-sync.test.mjs`  
Expected: PASS.

```bash
git add assets/js/workbook-sync.js assets/js/blead-prompt-sync.js tests/workbook-sync.test.mjs tests/blead-prompt-sync.test.mjs
git commit -m "feat: share local-first workbook autosave"
```

### Task 7: Move Blead Through the Generic Path Without Visible Changes

**Files:**
- Modify: `scripts/build-blead-prompts.mjs`
- Modify: `assets/js/blead-prompts.js`
- Modify: `Blead/session-1-prompts/index.html`
- Modify: `tests/blead-prompts.test.mjs`
- Modify: `tests/blead-content.test.mjs`

- [ ] **Step 1: Add failing compatibility tests**

Assert the generated Blead page still matches its renderer, keeps existing content and downloads, supplies stable `data-prompt-id`/`data-prompt-field` values, and configures the generic sync module with `bracco-leadership-session-1` and `/Blead/api/responses`.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/blead-prompts.test.mjs tests/blead-content.test.mjs`  
Expected: FAIL on the new generic-sync assertions.

- [ ] **Step 3: Wire Blead to `initializeWorkbookSync`**

Retain its existing per-field storage values during the transition by reading legacy keys when new keys are empty and immediately copying those values to the new workbook-scoped keys.

- [ ] **Step 4: Rebuild and run focused tests**

Run: `npm run build:blead && node --test tests/blead-prompts.test.mjs tests/blead-prompt-sync.test.mjs tests/blead-response-api.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-blead-prompts.mjs assets/js/blead-prompts.js Blead/session-1-prompts/index.html tests/blead-prompts.test.mjs tests/blead-content.test.mjs
git commit -m "refactor: route Blead through unified autosave"
```

### Task 8: Connect Both Bracco Sales Prompt Packs

**Files:**
- Modify: `scripts/build-bsales.mjs`
- Modify: `assets/js/bsales.js`
- Modify: `bsales/prompt-pack-1/index.html`
- Modify: `bsales/prompt-pack-2/index.html`
- Modify: `tests/bsales.test.mjs`
- Create: `tests/bsales-response-sync.test.mjs`

- [ ] **Step 1: Write failing generated-markup and sync tests**

Assert Pack 1 and Pack 2 have distinct workbook IDs and endpoints, every setup/prompt card has a stable exercise ID, every input has a stable non-empty field ID, and edits invoke the shared autosave controller without changing prompt compilation.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/bsales.test.mjs tests/bsales-response-sync.test.mjs`  
Expected: FAIL because Bsales has no persistence wiring.

- [ ] **Step 3: Generate IDs from `lib/workbook-schema.js` and initialize sync**

Pack 1 uses `/bsales/prompt-pack-1/api/responses`; Pack 2 uses `/bsales/prompt-pack-2/api/responses`. Preserve all existing Bsales copy, links, decks, Word documents, menu behavior, and prompt preview behavior.

- [ ] **Step 4: Rebuild and prove deterministic output**

Run: `npm run build:bsales && node --test tests/bsales.test.mjs tests/bsales-response-sync.test.mjs`  
Expected: PASS and rendered files equal their renderer output.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-bsales.mjs assets/js/bsales.js bsales/prompt-pack-1/index.html bsales/prompt-pack-2/index.html tests/bsales.test.mjs tests/bsales-response-sync.test.mjs
git commit -m "feat: sync Bracco Sales workbooks"
```

### Task 9: Connect McLendon Notes With Only the Approved Copy Corrections

**Files:**
- Modify: `assets/js/mclendon.js`
- Modify: `McLendon/index.html`
- Create: `tests/mclendon-response-sync.test.mjs`
- Modify: `tests/site.test.mjs`

- [ ] **Step 1: Write failing note-only sync and copy-preservation tests**

```js
test("McLendon keeps four note exercises and makes only approved save-copy corrections", async () => {
  const html = await readFile(pageUrl, "utf8");
  assert.equal((html.match(/data-workbook-note=/gu) ?? []).length, 4);
  assert.match(html, /Your notes save automatically as you work\./u);
  assert.equal((html.match(/data-note-status>Saved\.<\/p>/gu) ?? []).length, 4);
  assert.doesNotMatch(html, /Saved privately on this device\./u);
});
```

Also test that each note becomes `{ fields: {}, notes }`, uses a McLendon-scoped UUID, and posts to `/McLendon/api/responses`.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/mclendon-response-sync.test.mjs tests/site.test.mjs`  
Expected: FAIL on generic sync and copy assertions.

- [ ] **Step 3: Keep legacy note keys readable while adding shared sync**

Load `kaindly-mclendon-workbook:<exerciseId>` first when the new workbook-scoped key is empty, then mirror it into the new key. Use the four existing `data-workbook-note` values as stable exercise IDs.

- [ ] **Step 4: Change exactly five strings in HTML/runtime copy**

Change the one introductory sentence and four initial statuses named in the approved spec. Do not alter prompt text, headings, navigation, presenter information, offer, coupon, or page structure.

- [ ] **Step 5: Run and commit**

Run: `node --test tests/mclendon-response-sync.test.mjs tests/site.test.mjs`  
Expected: PASS.

```bash
git add assets/js/mclendon.js McLendon/index.html tests/mclendon-response-sync.test.mjs tests/site.test.mjs
git commit -m "feat: sync McLendon workbook notes"
```

### Task 10: Add Clerk Magic-Link Authorization

**Files:**
- Create: `lib/dashboard-auth.js`
- Create: `api/dashboard-auth-config.js`
- Create: `assets/js/dashboard-auth-entry.js`
- Create: `tests/dashboard-auth.test.mjs`
- Modify: `middleware.js`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- `createDashboardAuthorizer({ authenticateRequest, getUser, getSession, now, allowedEmail })`
- `authorizeDashboardRequest(request)` returns an authorized identity or `null`.
- Browser access flow uses Clerk email-link sign-in and `/dashboard/verify/` callback.
- Required env: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DASHBOARD_ALLOWED_EMAIL=leanna.baker@kaindly.ai`, and comma-separated `DASHBOARD_AUTHORIZED_ORIGINS` containing only the exact Production or Preview origins for that environment.

**Primary references:**

- Clerk JavaScript quickstart: `https://clerk.com/docs/js-frontend/getting-started/quickstart`
- Clerk email-link custom flow: `https://clerk.com/docs/react/guides/development/custom-flows/authentication/email-links`
- Clerk backend request authentication: `https://clerk.com/docs/reference/backend/authenticate-request`
- Clerk invite-only access: `https://clerk.com/docs/guides/secure/restricting-access`

- [ ] **Step 1: Install auth and browser-build dependencies**

Run: `npm install @clerk/backend @clerk/clerk-js && npm install --save-dev esbuild`  
Expected: package and lockfile update without audit errors that block use.

- [ ] **Step 2: Write failing authorization tests with injected Clerk fakes**

```js
test("requires a verified exact primary email and a session no older than four hours", async () => {
  const authorize = createDashboardAuthorizer(fakeClerk({
    email: "leanna.baker@kaindly.ai",
    verificationStatus: "verified",
    sessionCreatedAt: now - (4 * 60 * 60 * 1000) + 1,
  }));
  assert.ok(await authorize(request));
  assert.equal(await createDashboardAuthorizer(fakeClerk({ email: "other@kaindly.ai" }))(request), null);
  assert.equal(await createDashboardAuthorizer(fakeClerk({ verificationStatus: "unverified" }))(request), null);
  assert.equal(await createDashboardAuthorizer(fakeClerk({ sessionCreatedAt: now - (4 * 60 * 60 * 1000) }))(request), null);
});
```

Also reject missing sessions, plus-address aliases, visually different addresses, absent primary addresses, and failed Clerk calls. Accept ordinary email case differences only after lowercasing and trimming before the exact comparison.

- [ ] **Step 3: Run and confirm failure**

Run: `node --test tests/dashboard-auth.test.mjs`  
Expected: FAIL because the authorizer does not exist.

- [ ] **Step 4: Implement server-side Clerk verification**

Use `createClerkClient({ secretKey, publishableKey }).authenticateRequest(request, { authorizedParties })`, where `authorizedParties` comes only from validated `DASHBOARD_AUTHORIZED_ORIGINS`, then fetch the authenticated user and session. Require the primary email object's `verification.status === "verified"`, canonical exact match, and `now - session.createdAt < 4 hours`. Return no user payload to logs.

- [ ] **Step 5: Add a public publishable-key endpoint and bundle the custom link flow**

`api/dashboard-auth-config.js` returns only `{ publishableKey }` with `no-store`. The browser bundle loads Clerk, submits `signIn.create({ identifier })`, starts its email-link flow with `/dashboard/verify/`, shows the same neutral confirmation after every submission, and completes verification with `Clerk.handleEmailLinkVerification({ redirectUrlComplete: "/dashboard/" })`.

- [ ] **Step 6: Protect dashboard page routes in middleware**

Allow `/dashboard/access/`, `/dashboard/verify/`, and `/dashboard/api/auth-config` publicly. Redirect unauthorized dashboard HTML to `/dashboard/access/`; do not intercept physical JSON functions, which authorize themselves.

- [ ] **Step 7: Run and commit**

Run: `node --test tests/dashboard-auth.test.mjs tests/blead-auth.test.mjs tests/bsales.test.mjs`  
Expected: PASS.

```bash
git add lib/dashboard-auth.js api/dashboard-auth-config.js assets/js/dashboard-auth-entry.js middleware.js package.json package-lock.json tests/dashboard-auth.test.mjs
git commit -m "feat: add exact-email dashboard magic links"
```

### Task 11: Build Authenticated Dashboard JSON and Filtered CSV APIs

**Files:**
- Create: `api/dashboard-responses.js`
- Create: `api/dashboard-export.js`
- Create: `tests/dashboard-api.test.mjs`
- Modify: `lib/workbook-response-api.js`
- Modify: `vercel.json`

**Interfaces:**
- `parseDashboardFilters(url)` validates client/program/workbook/exercise/participant/from/to/search.
- `createDashboardHandlers({ authorize, store, registry, now, logger })` returns `GET` and `EXPORT`.
- `/dashboard/api/responses`
- `/dashboard/api/export.csv`

- [ ] **Step 1: Write failing auth/filter/count/export tests**

Cover:

- `401` before any store call for missing, wrong-email, unverified, or expired sessions.
- Exact filter parsing and rejection of invalid dates/UUIDs/unknown registry IDs.
- Summary counts for active clients, connected workbooks, anonymous participants, and response rows.
- Directory counts/latest activity/retention for all registered workbooks, including zero-response workbooks.
- CSV rows limited to the active filters.
- Physical `/api/dashboard-*` handlers perform the same authorization.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/dashboard-api.test.mjs`  
Expected: FAIL because dashboard handlers do not exist.

- [ ] **Step 3: Implement JSON response formatting**

Return:

```js
{
  summary: { clients, workbooks, participants, responses },
  directory: [{ client, program, workbook, hubUrl, responseCount, latestActivity, deleteAfter, expired }],
  filters: { clients, programs, workbooks, exercises, participants },
  responses: [{ client, program, workbook, participantId, exercise, fields, notes, createdAt, updatedAt, deleteAfter }],
}
```

- [ ] **Step 4: Implement CSV export with the same parsed filters**

Use the generic `responsesToCsv` and a filename such as `kaindly-facilitator-responses-2026-10-15.csv`. Add `nosniff`, private/no-store, and noindex headers.

- [ ] **Step 5: Add rewrites and run tests**

Run: `node --test tests/dashboard-api.test.mjs tests/workbook-response-domain.test.mjs tests/workbook-response-store.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/dashboard-responses.js api/dashboard-export.js lib/workbook-response-api.js vercel.json tests/dashboard-api.test.mjs
git commit -m "feat: expose filtered facilitator response APIs"
```

### Task 12: Build the Client-Neutral Dashboard Interface

**Files:**
- Create: `scripts/build-dashboard.mjs`
- Create: `assets/js/dashboard.js`
- Create: `assets/css/dashboard.css`
- Create: `dashboard/index.html`
- Create: `dashboard/access/index.html`
- Create: `dashboard/verify/index.html`
- Create: `tests/dashboard-ui.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing deterministic-page and safe-render tests**

Assert one `h1` per page, noindex metadata, KAINDLY branding, all approved filters, summary labels, directory container, response container, export link, sign-out control, mobile viewport, and deterministic renderer output.

Add a hostile response fixture:

```js
const node = createResponseValue(fakeDocument, '<img src=x onerror="alert(1)">');
assert.equal(node.textContent, '<img src=x onerror="alert(1)">');
assert.equal(fakeDocument.innerHtmlWrites, 0);
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/dashboard-ui.test.mjs`  
Expected: FAIL because the dashboard UI files do not exist.

- [ ] **Step 3: Generate branded access, verification, and dashboard shells**

The dashboard page includes:

- Four summary cards.
- Client/workbook directory.
- Client, program, workbook, exercise, participant, from-date, to-date, and response-text filters.
- Clear-filters action.
- Filter-aware CSV link.
- Responses grouped by participant and ordered by latest update.
- Loading, empty, unauthorized/expired, and unavailable states.
- Sign-out action returning to `/dashboard/access/`.

- [ ] **Step 4: Implement safe dashboard rendering and filter behavior**

Build all participant-derived nodes with `createElement`, `textContent`, and `append`. Never concatenate response text into HTML. Serialize filters with `URLSearchParams` and assign the same query string to both JSON and export URLs.

- [ ] **Step 5: Bundle auth and build pages**

Add scripts:

```json
{
  "build:dashboard-auth": "esbuild assets/js/dashboard-auth-entry.js --bundle --format=esm --outfile=assets/js/dashboard-auth.js",
  "build:dashboard": "npm run build:dashboard-auth && node scripts/build-dashboard.mjs"
}
```

Run: `npm run build:dashboard && node --test tests/dashboard-ui.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-dashboard.mjs assets/js/dashboard-auth-entry.js assets/js/dashboard-auth.js assets/js/dashboard.js assets/css/dashboard.css dashboard/index.html dashboard/access/index.html dashboard/verify/index.html package.json tests/dashboard-ui.test.mjs
git commit -m "feat: build unified facilitator dashboard"
```

### Task 13: Generalize Retention and Retire the Legacy Facilitator Surface

**Files:**
- Create: `api/workbook-retention.js`
- Create: `tests/unified-retention.test.mjs`
- Modify: `api/blead-retention.js`
- Modify: `middleware.js`
- Modify: `vercel.json`
- Modify: `scripts/build-blead-facilitator.mjs`
- Modify: `Blead/facilitator/index.html`
- Modify: `Blead/facilitator/access/index.html`
- Modify: `tests/blead-facilitator.test.mjs`

- [ ] **Step 1: Write failing cross-client retention and legacy-route tests**

Assert the cron rejects a wrong secret, deletes every row whose own `delete_after <= now()`, is safe to repeat, and does not depend on one fixed workbook deadline. Assert `/Blead/facilitator/` and its access route redirect to `/dashboard/`.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/unified-retention.test.mjs tests/blead-facilitator.test.mjs`  
Expected: FAIL on generic retention and redirect assertions.

- [ ] **Step 3: Replace the cron route and retain a compatibility alias**

Point Vercel Cron to `/api/workbook-retention`. Keep `/api/blead-retention` delegating to the same generic handler until the next cleanup release.

- [ ] **Step 4: Redirect legacy facilitator pages without password fallback**

Middleware returns `308` from `/Blead/facilitator/` and `/Blead/facilitator/access/` to `/dashboard/`. The generated legacy HTML includes a noindex meta refresh and ordinary link as a static-host fallback. Do not remove facilitator password environment variables until Production magic-link verification.

- [ ] **Step 5: Run and commit**

Run: `node --test tests/unified-retention.test.mjs tests/blead-facilitator.test.mjs tests/blead-auth.test.mjs`  
Expected: PASS.

```bash
git add api/workbook-retention.js api/blead-retention.js middleware.js vercel.json scripts/build-blead-facilitator.mjs Blead/facilitator/index.html Blead/facilitator/access/index.html tests/unified-retention.test.mjs tests/blead-facilitator.test.mjs
git commit -m "feat: unify retention and dashboard routing"
```

### Task 14: Run the Full Local Verification Matrix

**Files:**
- Modify only files required by failures; never weaken a test to make a regression pass.

- [ ] **Step 1: Build every generated surface twice and verify determinism**

Run:

Run all three builds once, record SHA-256 manifests for `Blead`, `bsales`, `dashboard`, and `assets/js/dashboard-auth.js` in a temporary directory, run the same builds a second time, record a second manifest, and compare the two manifests with `diff -u`.

```bash
npm run build:blead
npm run build:bsales
npm run build:dashboard
determinism_dir=$(mktemp -d)
find Blead bsales dashboard -type f -print0 | sort -z | xargs -0 shasum -a 256 > "$determinism_dir/before.txt"
shasum -a 256 assets/js/dashboard-auth.js >> "$determinism_dir/before.txt"
npm run build:blead
npm run build:bsales
npm run build:dashboard
find Blead bsales dashboard -type f -print0 | sort -z | xargs -0 shasum -a 256 > "$determinism_dir/after.txt"
shasum -a 256 assets/js/dashboard-auth.js >> "$determinism_dir/after.txt"
diff -u "$determinism_dir/before.txt" "$determinism_dir/after.txt"
```

Expected: `diff` reports no changes. This compares generated outputs to one another rather than to the already-dirty worktree.

- [ ] **Step 2: Run all tests**

Run: `npm test`  
Expected: all tests PASS with zero skipped security, migration, autosave, or dashboard tests.

- [ ] **Step 3: Run static security and copy scans**

Run:

```bash
rg -n "innerHTML|insertAdjacentHTML|BLEAD_FACILITATOR_PASSWORD|Saved privately on this device|Your notes stay in this browser" assets/js dashboard McLendon scripts lib api
rg -n "data-workbook-id|clientId|programId|workbookId" assets/js/workbook-sync.js api/workbook-responses-*.js
```

Expected:

- No dashboard rendering path uses HTML injection.
- No new facilitator password dependency.
- The obsolete McLendon strings are absent.
- Browser requests do not choose authoritative client/program/workbook identities.

- [ ] **Step 4: Run a local server smoke test**

Start the existing prototype server or extend it to serve the new routes. Verify status codes for all client hubs, workbook pages, `/dashboard/access/`, and unauthenticated dashboard APIs. Do not use real Clerk or Production database credentials locally.

- [ ] **Step 5: Commit any narrowly scoped verification fixes**

Run `git status --short`, stage only the named application or test files changed to fix verification failures, and commit them with `git commit -m "test: complete unified hub verification"`. If no files changed, do not create an empty commit.

### Task 15: Provision and Verify an Isolated Preview

**External systems:** Neon development branch, Clerk development instance, Vercel Preview.

- [ ] **Step 1: Create or select an isolated Neon branch**

Use a branch populated with the Production schema and representative rows. Record pre-migration row counts by workbook, never response contents.

- [ ] **Step 2: Apply and verify the migration on the Neon branch**

Run with the branch `DATABASE_URL`:

```bash
npm run migrate:workbooks
```

Expected: zero null identity rows; legacy Blead row count unchanged; all required indexes present.

- [ ] **Step 3: Configure Clerk development access**

In Clerk:

1. Use Invite-only access mode.
2. Enable email-link sign-in and same-device/browser verification.
3. Create or invite only `leanna.baker@kaindly.ai`.
4. Disable user email-identifier changes.
5. Set maximum session lifetime to four hours.
6. Add the Vercel Preview origin/redirect URLs.

Set Preview-only `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DASHBOARD_ALLOWED_EMAIL`, and `DASHBOARD_AUTHORIZED_ORIGINS` containing the exact Preview origin. Do not expose the secret key to browser assets.

- [ ] **Step 4: Deploy a Vercel Preview**

Run the project's approved Preview deployment workflow. Confirm it uses the Neon branch, Clerk development keys, existing client passwords, and the generic cron disabled or pointed only at the branch.

- [ ] **Step 5: Complete end-to-end Preview verification**

Verify all eleven flows from the approved spec, including:

- Blead existing response preservation.
- Bsales Pack 1 and Pack 2 distinct participant IDs and saves.
- McLendon four note saves with only approved copy changes.
- Offline edit preservation and later retry.
- Wrong-email dashboard denial.
- Approved-email magic-link success.
- Dashboard counts, filters, search, safe hostile-text display, and filtered CSV.
- Desktop and phone layouts.
- Direct physical function URL authorization.

- [ ] **Step 6: Present the Preview for user review and stop**

Provide the Preview link, the exact tested workbook routes, dashboard access instructions, and any Clerk invitation step still awaiting the user. Do not deploy Production in this task.

### Task 16: Production Rollout After Explicit Approval

**Precondition:** The user has reviewed the Preview and explicitly approved Production rollout.

- [ ] **Step 1: Capture Production pre-migration counts and a recoverable Neon snapshot/branch**

Record schema version and counts only. Confirm the recovery branch exists before migration.

- [ ] **Step 2: Apply the verified migration to Production**

Run the exact migration artifact tested in Preview. Re-run invariant queries and compare legacy Blead counts.

- [ ] **Step 3: Configure Clerk Production**

Repeat the approved restricted settings for the Production instance, use live keys, add `https://www.kaindly.ai` origins/redirects, and invite only `leanna.baker@kaindly.ai`.

- [ ] **Step 4: Deploy the tested commit to Production**

Do not rebuild from uncommitted files. Deploy the exact verified commit.

- [ ] **Step 5: Run Production smoke tests without entering sensitive client content**

Verify:

- All three client hubs and four workbooks load behind their unchanged access behavior.
- One disposable non-sensitive test value per workbook saves and appears in the dashboard.
- Magic-link sign-in works only for the approved email.
- Filters and CSV match the test values.
- `/Blead/facilitator/` redirects to `/dashboard/`.
- Retention function authenticates and reports safely.
- No client response text appears in logs.

- [ ] **Step 6: Retire the shared facilitator password only after successful verification**

Remove `BLEAD_FACILITATOR_PASSWORD` and `BLEAD_FACILITATOR_SESSION_SECRET` from Vercel Production and Preview after the redirect, dashboard, API, and CSV checks pass. Keep participant password/session variables unchanged.

- [ ] **Step 7: Report the live URLs and recovery point**

Provide `/dashboard/`, the four connected workbook URLs, the deployment identifier, migration result, and Neon recovery branch name. Do not include credentials or response contents.

---

## Plan Self-Review Checklist

- [x] Every approved requirement in the design spec maps to at least one task and test.
- [x] All current workbook IDs, route adapters, retention dates, and exact allowed email are explicit.
- [x] No task relies on browser-provided client/program/workbook authority.
- [x] Existing Blead data has an additive migration and recovery path.
- [x] Bsales and Blead copy remain unchanged; McLendon changes are limited to the five approved strings.
- [x] Participant and dashboard authentication remain independent.
- [x] Dashboard middleware and physical APIs both enforce authorization.
- [x] CSV and HTML hostile-content tests are present.
- [x] Preview review is a hard stop before Production.
- [x] The plan contains no unresolved markers, generic file targets, or unstated implementation decisions.
