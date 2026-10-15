# Unified KAINDLY Facilitator Hub Design

**Date:** October 15, 2026
**Status:** Approved for planning
**Site:** KAINDLY client learning hubs and private facilitator dashboard

## Purpose

Create one private, client-neutral KAINDLY Facilitator Hub at `/dashboard/` that receives anonymous typed workbook responses from all current and future KAINDLY client hubs. The dashboard will let the authorized facilitator review, filter, search, and export responses without mixing client or program contexts.

The first connected experiences are:

- Bracco AI Leadership Accelerator (`/Blead/`)
- Bracco Sales Team AI Working Session (`/bsales/`)
- The McLendon Foundation Working Smarter From Day One workbook (`/McLendon/`)

Future client hubs must connect through the same workbook-registration contract instead of creating client-specific facilitator dashboards or response APIs.

## Approved Product Decisions

- The Facilitator Hub lives at `/dashboard/`.
- The existing `/Blead/facilitator/` route redirects to `/dashboard/` so old bookmarks continue working.
- All typed workbook responses from current and future client hubs are eligible for centralized autosave.
- Only typed responses are collected. Page visits, clicks, completion analytics, IP-derived identity, browser fingerprinting, names, and participant email addresses are not collected.
- Responses remain anonymous and use a generated participant UUID scoped to one workbook in one browser profile.
- A participant identifier from one workbook is not reused to correlate activity in another workbook.
- The dashboard is accessible only through a magic-link sign-in for `leanna.baker@kaindly.ai`.
- The shared facilitator password is retired after the magic-link flow is verified in production. Client-page passwords remain unchanged.
- Existing Bracco Leadership responses are preserved.
- The dashboard supports client, program, workbook, exercise, participant, date, and response-text filtering.
- CSV export reflects the active dashboard filters.
- Each workbook has an explicit retention deadline. Current 2026 workbooks retain responses through February 28, 2027 and delete expired responses beginning March 1, 2027. Every future workbook registration must declare its own deadline; server writes fail closed if it is absent or invalid.
- Client-page copy remains unchanged except for the approved McLendon accuracy corrections listed below.

## Architecture

Use the existing Vercel-hosted static site, Vercel Functions, and connected Neon Postgres database. Generalize the existing Bracco Leadership response system rather than creating a second backend.

The flow is:

```text
Protected client workbook
  -> browser-local snapshot
  -> client-scoped response endpoint
  -> server-selected workbook definition
  -> validated anonymous response row in Neon
  -> authenticated unified dashboard API
  -> /dashboard/ review and filtered CSV export
```

The browser never supplies an authoritative client, program, or workbook identity. The protected route and its server-side registration select those values. This prevents a participant from changing a request body to write into another client's workbook.

### Alternatives Considered

1. **Shared workbook system — selected.** One registry, response contract, database table, facilitator API, and dashboard serve every client while preserving client and workbook identifiers.
2. **Separate backend per client.** Strong isolation but repeats authentication, storage, retention, export, and dashboard code for every engagement.
3. **Separate stores with an analytics overlay.** Flexible at enterprise scale but adds unnecessary synchronization, credentials, failure modes, and cost for the current site.

## Workbook Registry

A server-owned registry defines every connected workbook. Each entry contains:

- `clientId` and client display name
- `programId` and program display name
- `workbookId` and workbook display name
- Protected participant route and client hub URL
- Ordered exercises and their approved field identifiers and labels
- Response mode (`connected`)
- Retention deadline
- Export filename prefix

Initial registrations are:

| Client | Program | Workbook | Source fields |
|---|---|---|---|
| Bracco | AI Leadership Accelerator | Session 1 workbook | Authored Session 1 prompt fields and notes |
| Bracco | Sales Team AI Working Session | Demystifying AI and Your AI Brain | Prompt personalization fields |
| Bracco | Sales Team AI Working Session | Your AI Chief of Staff | Setup and prompt personalization fields |
| McLendon Foundation | Working Smarter From Day One | Workshop workbook | Four exercise note fields |

Future client hubs are not considered response-connected until their registry entry declares all required identity, field, route, and retention values. Unknown workbooks, exercises, and fields are rejected server-side.

## Participant Experience and Autosave

Each connected workbook uses the same local-first synchronization behavior:

1. Generate or retrieve a workbook-scoped anonymous participant UUID from browser storage.
2. Save the latest authored values locally on every edit.
3. Debounce server synchronization by approximately 750 milliseconds.
4. Flush the newest snapshot on blur and when the page becomes hidden.
5. Queue the newest snapshot while a request is in flight rather than issuing overlapping writes.
6. Preserve the browser copy after network or server errors and retry after a later edit or lifecycle event.
7. On reload, hydrate local values first and reconcile only empty local fields from the participant's server copy.

The participant can read only responses associated with the current anonymous participant UUID and current workbook. Participant endpoints do not expose dashboard-wide data.

### Approved McLendon Copy Corrections

No client-facing copy changes except these accuracy corrections:

- Replace `Your notes stay in this browser on this device.` with `Your notes save automatically as you work.`
- Replace each of the four repeated `Saved privately on this device.` note statuses with `Saved.`

All other McLendon, Bracco Leadership, and Bracco Sales copy remains unchanged.

## Data Model and Migration

Extend the existing response table in place to avoid a destructive rename or data copy:

```text
blead_workbook_responses
  client_id       text
  program_id      text
  participant_id  uuid
  workbook_id     text
  exercise_id     text
  payload          jsonb
  created_at       timestamptz
  updated_at       timestamptz
  delete_after     timestamptz
  primary key (participant_id, workbook_id, exercise_id)
```

Migration behavior:

1. Add nullable `client_id` and `program_id` columns.
2. Backfill every existing Bracco Leadership row with `client_id = 'bracco'` and `program_id = 'leadership-accelerator'`.
3. Verify that no rows remain without either identifier.
4. Make both columns `NOT NULL`.
5. Replace the workbook-only updated-time index with an index beginning with `client_id`, `program_id`, and `workbook_id`.
6. Preserve the existing primary key and response payloads.

The migration runs first against an isolated Neon development branch populated with production-like schema and representative rows. Production migration occurs only after the backfill, constraints, and dashboard queries pass on that branch.

The internal table name remains unchanged for compatibility; client-neutral domain and store modules hide that legacy name from new application code.

## Participant APIs

Each client keeps a same-origin, client-scoped browser endpoint so its existing path-scoped participant session remains authoritative:

- Bracco Leadership: `/Blead/api/responses`
- Bracco Sales: `/bsales/api/responses`
- McLendon: `/McLendon/api/responses`

Vercel rewrites map these paths to shared serverless handlers with server-selected workbook registrations. Bracco Sales uses distinct route mappings for its two workbooks so Pack 1 and Pack 2 cannot substitute workbook identities.

Participant `POST` requests require:

- A valid session for the current protected client hub
- The exact same-origin `Origin` header
- A valid anonymous UUID
- A registered exercise and approved field set
- Request and per-field size limits
- A workbook whose retention deadline has not passed

Participant `GET` requests return only the current participant UUID's rows for the server-selected workbook.

## Unified Facilitator Dashboard

The dashboard at `/dashboard/` uses a client-neutral KAINDLY layout.

### Overview

The top summary shows:

- Active clients
- Connected workbooks
- Anonymous participants
- Responses received

### Directory and Filters

The dashboard exposes:

- Client
- Program
- Workbook
- Exercise
- Anonymous participant ID
- Updated-date range
- Full response-text search

The client and workbook directory shows each registered hub, response count, latest activity, retention deadline, and a link to open the associated client hub.

### Response Review

Responses are grouped by anonymous participant and ordered by most recent update. Each response displays client, program, workbook, exercise, approved field labels and values, notes, last-saved time, and retention date.

The browser renders participant content only through text nodes. Stored response text is never interpreted as HTML.

### Export

`GET /dashboard/api/export.csv` exports the current filter state. Columns include client, program, workbook, participant ID, exercise, field, response, notes, updated time, and deletion date. CSV cells are escaped, and leading spreadsheet formula characters are neutralized.

## Magic-Link Authentication and Authorization

Use Clerk's managed email-link authentication for `/dashboard/`. Clerk handles link delivery, expiration, verification, and session primitives; KAINDLY remains responsible for authorization.

### Access Flow

1. `/dashboard/access/` presents a branded email form.
2. Submissions receive the same neutral confirmation regardless of the entered address.
3. Clerk sends a magic link only through the configured sign-in flow.
4. Email links expire after ten minutes and require the same device and browser that initiated sign-in.
5. A verified sign-in returns to `/dashboard/`.
6. The dashboard session has a four-hour maximum lifetime.
7. Signing out returns to `/dashboard/access/`.

### Exact Email Allowlist

Every dashboard page, dashboard API, and CSV export must verify all of the following server-side:

- A valid Clerk session
- A verified primary email address
- A canonical lowercase email exactly equal to `leanna.baker@kaindly.ai`

Clerk is configured in restricted/invite-only mode with only the approved address invited. The server-side exact-email check remains authoritative even if provider configuration changes. There is no facilitator password fallback.

The dashboard and APIs use `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow`.

Participant passwords and participant sessions remain separate from dashboard authentication and cannot authorize dashboard access.

## Retention

Every response row carries its immutable `delete_after` value from the registered workbook at write time.

- Current 2026 workbooks retain responses through February 28, 2027.
- A daily authenticated retention function deletes all rows with `delete_after <= now()` across every client and workbook.
- Participant writes return `410 Gone` after a workbook's deadline.
- The dashboard continues listing the workbook after expiration but shows its response state and retention status.
- Future workbook registration fails validation when its retention deadline is missing, malformed, or already expired.

## Failure Handling

- Local browser storage remains the immediate participant fallback.
- Failed network saves do not clear or overwrite local work.
- Only the newest queued snapshot is retried.
- Database failures return generic messages and log only a request ID and failure category, never response contents.
- The dashboard distinguishes loading, empty, unauthorized, expired-session, and unavailable states.
- Unauthorized dashboard requests redirect to `/dashboard/access/`; API and export requests return `401` without HTML.
- Unknown registry identities and fields return validation errors without database writes.
- CSV export fails closed when authentication, filtering, formatting, or database access fails.
- Retention cleanup is idempotent and safe to repeat.

## Security and Privacy Controls

- Client, program, and workbook identities are selected server-side.
- Participant cookies remain path-scoped to their client hubs.
- Dashboard authentication uses provider-managed magic links and an application-level exact-email allowlist.
- No participant session can access dashboard pages, APIs, or exports.
- No dashboard session can be substituted for a participant session.
- All state-changing requests require expected same-origin behavior.
- Request size, field size, and authored-schema validation limit stored data.
- Participant content is excluded from application logs.
- HTML, JSON, and CSV containing client data are never publicly cached.
- Direct function URLs repeat authorization rather than relying only on middleware or rewrites.
- Dashboard routes and client workbooks remain excluded from search indexing.

## Verification Strategy

Implementation follows test-driven development. Automated coverage includes:

- Workbook-registry validation and duplicate-ID rejection
- Existing Bracco Leadership row backfill and non-null constraints
- Existing response preservation across migration
- Workbook-scoped anonymous UUID generation
- Client and workbook isolation for participant reads and writes
- Autosave debounce, in-flight queueing, lifecycle flush, local fallback, and retry
- Rejection of unknown workbooks, exercises, and fields
- Size, same-origin, authentication, and retention enforcement
- Dashboard aggregation, counts, grouping, filters, and search
- Safe hostile-content rendering
- Filtered CSV output, escaping, and formula neutralization
- Magic-link callback and valid Clerk session handling
- Exact-email allowlist enforcement on pages, APIs, and export
- Rejection of missing, expired, unverified, or wrong-email sessions
- Removal of the facilitator password path and participant/dashboard session substitution
- Retention cleanup across multiple clients and safe repeated execution
- Deterministic generated pages and approved McLendon-only copy changes

End-to-end Preview verification covers:

1. Each current client workbook retains its existing participant access behavior.
2. A typed field or note saves locally and reaches the registered workbook in Neon.
3. Reloading the same workbook and browser restores the same anonymous participant work.
4. Another workbook receives a different anonymous participant ID.
5. A wrong email cannot obtain or use dashboard access.
6. The approved email completes magic-link sign-in and opens `/dashboard/`.
7. The dashboard shows all three current client experiences with correct counts and labels.
8. Filters and response-text search narrow the visible results correctly.
9. The exported CSV matches the active filters and opens safely.
10. Desktop and phone layouts remain usable.
11. A simulated network failure preserves the newest participant browser copy and later retries it.

## Rollout

1. Create an isolated Neon branch and test the schema migration and backfill.
2. Add the shared workbook registry and generalized domain, store, and API layers behind tests.
3. Connect Bracco Leadership through the generalized layer without changing its participant behavior.
4. Connect Bracco Sales Pack 1 and Pack 2 autosave.
5. Connect the four McLendon note fields and make only the approved accuracy corrections.
6. Build the client-neutral dashboard and filtered export.
7. Provision Clerk for Preview, invite only the approved email, and configure exact server-side allowlisting.
8. Deploy a private Vercel Preview and complete automated and browser verification.
9. Review the Preview with KAINDLY before any production release.
10. Apply the verified production migration, configure Production Clerk credentials and dashboard settings, and deploy the tested build.
11. Verify all client save paths, dashboard magic-link access, filters, export, retention scheduling, and production error logs.
12. Retire the facilitator shared-password configuration only after successful production magic-link verification.

## Success Criteria

- One client-neutral Facilitator Hub displays anonymous typed responses from every connected current and future client workbook.
- Existing Bracco Leadership responses remain intact.
- Client, program, workbook, exercise, and participant boundaries are enforced server-side.
- Only `leanna.baker@kaindly.ai` can access dashboard pages, data, and exports.
- Participant work survives ordinary network failures through local-first synchronization.
- Client-facing copy is unchanged except for the explicitly approved McLendon accuracy corrections.
- New client hubs connect by adding a validated workbook registration rather than creating a new response backend or facilitator dashboard.
