# Bracco Workbook Autosave and Facilitator Dashboard Design

**Date:** October 7, 2026  
**Status:** Approved for planning  
**Site:** KAINDLY Bracco AI Leadership Accelerator (`/Blead/`)

## Purpose

Extend the protected Session 1 workbook so participant entries are automatically saved to a private KAINDLY facilitator dashboard while participants type. Responses remain anonymous, are exportable as CSV, and are retained through February 28, 2027. Automatic deletion begins March 1, 2027.

The existing interactive workbook, participant password, local browser backup, and protected Session 1 PDF remain in place.

## Approved Product Decisions

- Participants remain anonymous.
- Each browser profile receives a random participant UUID generated with `crypto.randomUUID()` and stored locally.
- No names, email addresses, IP-derived identity, or browser fingerprinting are collected.
- The same browser profile reuses the same participant UUID. A different browser, device, or cleared browser storage creates a new anonymous ID.
- Workbook fields and private notes autosave to the KAINDLY backend while the participant types.
- Participant responses are visible only in a facilitator dashboard.
- The facilitator dashboard uses a separate shared password from the participant hub.
- The facilitator password is stored only in Vercel environment configuration and is never committed to source control or rendered into HTML.
- Facilitators can export all retained responses as CSV.
- Responses are retained through February 28, 2027 and automatically deleted beginning March 1, 2027.

## Recommended Architecture

Use Vercel Functions with a Vercel-managed Neon Postgres database.

This is the best fit because the workbook creates small, frequent writes; the dashboard needs structured grouping and filtering; and CSV export and scheduled deletion are straightforward SQL operations. The existing website can remain a static, generated site with serverless endpoints added only for the Bracco workbook.

### Alternatives Considered

1. **Vercel Blob JSON files:** suitable for large documents, but awkward for frequent concurrent autosaves, filtering, exports, and retention cleanup.
2. **Supabase with managed user accounts:** capable, but introduces more authentication and application infrastructure than a single facilitator-only dashboard requires.
3. **Browser-only storage:** already provides local persistence but cannot support facilitator visibility or centralized CSV export.

## User Experience

### Participant Workbook

The Session 1 workbook continues to load at `/Blead/session-1-prompts/` after participant authentication.

On first use:

1. The browser creates or retrieves an anonymous participant UUID.
2. A short notice explains that entries are automatically saved to KAINDLY's private facilitator dashboard under an anonymous ID.
3. The notice asks participants not to enter personal, patient, regulated, or otherwise restricted information.

As participants type:

- Inputs continue to save immediately to local browser storage.
- Server synchronization is debounced by approximately 750 milliseconds to avoid a request for every keystroke.
- Blur and page visibility changes trigger a final save attempt.
- A compact status indicator shows `Saving`, `Saved`, `Offline — saved on this device`, or `Could not sync`.
- A successful server save records the last-synced timestamp.
- Reloading the same browser restores local work immediately and can reconcile it with the server copy using the most recent update timestamp.

The participant never sees other participants' responses.

### Facilitator Dashboard

The dashboard lives at `/Blead/facilitator/` with a dedicated access page at `/Blead/facilitator/access/`.

The separate facilitator session is not granted by the participant password. A facilitator session uses its own signed, HTTP-only cookie scoped to `/Blead/facilitator/`.

The dashboard provides:

- Anonymous participant IDs rather than names.
- Last updated time for each participant.
- Exercise completion and response counts.
- Expandable views of each exercise, field, and note.
- A search/filter control for participant ID and exercise.
- A one-click CSV export of all currently retained responses.
- A visible retention notice stating that automatic deletion begins March 1, 2027.

The dashboard and its API responses use `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow`.

## Authentication and Authorization

### Participant Access

The existing participant session remains authoritative for the workbook and participant response endpoints.

Participant endpoints are requested under `/Blead/api/` so the existing participant cookie remains path-scoped. Vercel rewrites map those browser-facing URLs to serverless functions. Every function independently verifies the signed participant session; middleware is defense in depth, not the sole authorization check.

### Facilitator Access

Facilitator authentication uses:

- `BLEAD_FACILITATOR_PASSWORD` for the separately shared password.
- `BLEAD_FACILITATOR_SESSION_SECRET` for a distinct signing context.
- A separate cookie name so participant tokens cannot be substituted for facilitator tokens.
- `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/Blead/facilitator/` cookie attributes.
- A limited session lifetime of four hours.
- Exact constant-time password comparison and the same failure delay used by the participant login.

The configured password value must never appear in tests, source files, logs, commits, or client JavaScript.

## Data Model

Use one row per participant and exercise snapshot:

```text
blead_workbook_responses
  participant_id  uuid
  workbook_id     text
  exercise_id     text
  payload          jsonb
  created_at       timestamptz
  updated_at       timestamptz
  delete_after     timestamptz
  primary key (participant_id, workbook_id, exercise_id)
```

`payload` contains only approved field keys for the selected exercise plus the participant's note. The server derives `workbook_id`, validates `exercise_id`, rejects unknown fields, enforces per-field length limits, and sets the fixed retention deadline.

No IP address, user agent, participant name, or email address is stored with a response.

## API Design

### Participant Endpoints

- `POST /Blead/api/responses` — validate and upsert one exercise snapshot.
- `GET /Blead/api/responses?participantId=<uuid>` — retrieve that anonymous browser ID's retained snapshots for reconciliation.

Participant requests require:

- A valid participant session cookie.
- Same-origin requests.
- A syntactically valid UUID.
- An approved exercise ID and field set.
- JSON content and request size limits.

### Facilitator Endpoints

- `GET /Blead/facilitator/api/responses` — return dashboard data to an authenticated facilitator.
- `GET /Blead/facilitator/api/export.csv` — stream a CSV export to an authenticated facilitator.

The CSV uses one row per response field with columns for anonymous participant ID, exercise order, exercise title, field label, response, note, updated time, and retention deadline. CSV cells are correctly escaped, and values beginning with spreadsheet formula characters are neutralized to prevent CSV formula injection.

### Retention Endpoint

- `GET /api/blead-retention` — invoked daily by Vercel Cron and authorized with `CRON_SECRET`.

Before March 1, 2027 the job performs a no-op. Beginning March 1, 2027 it deletes rows whose `delete_after` deadline has passed. Participant write endpoints return `410 Gone` after the retention deadline so data cannot be recreated after cleanup begins.

## Security and Privacy Controls

- Secrets remain server-side Vercel environment variables.
- Participant and facilitator tokens use distinct names and signing contexts.
- All state-changing requests require the expected same-origin `Origin` header.
- Server endpoints validate against the authored prompt schema rather than trusting arbitrary client keys.
- Field and request-size limits prevent unbounded storage.
- Database errors return generic messages and are not rendered with raw error details.
- Response data is excluded from application logs.
- Dashboard HTML, JSON, and CSV responses are never cached publicly.
- Direct physical API function URLs perform their own authentication checks, preventing rewrite bypass.
- CSV export neutralizes formula injection.
- The participant notice explicitly describes anonymous facilitator access and the retention deadline.

## Failure Handling

- Local browser storage remains the immediate fallback if the server is unavailable.
- Failed autosaves do not erase local work.
- The client retries after a later edit or explicit page event using bounded retry behavior.
- Conflicts resolve by `updated_at`; the newest complete exercise snapshot wins.
- The dashboard shows a clear unavailable state if the database cannot be reached, without exposing infrastructure details.
- CSV export fails closed if facilitator authorization or database access is unavailable.

## Verification Strategy

Automated tests will cover:

- Participant and facilitator session isolation.
- Safe nested return destinations for facilitator access.
- Rejection of missing, expired, or substituted sessions.
- Anonymous UUID generation and stable browser reuse.
- Autosave debounce, local fallback, retry, and status states.
- Exercise and field validation, length limits, and same-origin checks.
- Upsert behavior without duplicate participant/exercise rows.
- Dashboard response grouping.
- CSV escaping and formula-injection protection.
- Retention no-op before March 1, 2027 and deletion on or after that date.
- Refusal of participant saves after the retention deadline.

End-to-end verification will confirm:

1. A participant can authenticate and enter workbook responses.
2. The same browser retains its anonymous ID across reloads.
3. A facilitator can authenticate separately and see the anonymous response.
4. A participant session cannot access the facilitator dashboard or export.
5. The CSV downloads and opens with expected columns and escaped values.
6. Production pages, workbook, and Session 1 PDF remain protected and functional.

## Rollout

1. Provision Neon through the Vercel Marketplace and apply the response table migration.
2. Configure facilitator password, facilitator session secret, database URL, retention deadline, and cron secret for Preview only.
3. Implement and verify the participant autosave and facilitator dashboard in a Vercel Preview deployment.
4. Review the participant notice, dashboard, and CSV with KAINDLY.
5. Configure equivalent Production secrets and promote the verified deployment.
6. Confirm the daily retention job is scheduled and document the March 1, 2027 deletion behavior.

