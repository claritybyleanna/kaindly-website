# Session Capture Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Require a saved name and email before native KAINDLY session content is served and make contacts available to the authenticated facilitator dashboard.

**Architecture:** Keep the existing password/session handlers. A shared server-side capture gate runs after workshop authorization and before content; it also handles same-origin registration submissions. Register one contact workbook per session in the existing response table. Existing response records and passwords stay intact.

**Tech Stack:** Node 24, Vercel middleware, existing Neon workbook table and JavaScript dashboard.

**Spec:** User October 26 request supplied in this task: all KAINDLY session pages require name/email capture connected to the facilitator dashboard; implement live starting with Barbara's Executive Alpha.

## Global Constraints
- Do not read credentials, alter passwords, subscribe anyone, or delete records.
- Use existing runtime session secrets with domain-separated signatures; no new credentials or schema migration.
- Native session families: /owref2026, /OWR, /Blead, /bsales, /McLendon. Public marketing pages and owner access routes are excluded.
- Show collection purpose and optional unchecked marketing preference. Store names, email, session source, timestamp, preference, and synthetic-test flag only.
- Existing contact/workbook populations remain unchanged. Contact captures use new registered workbook IDs.
- Password authentication precedes capture. McLendon has no existing password requirement; preserve that.
- Explicit synthetic QA identities use a TEST name and reserved example domain and are excluded from ordinary dashboard counts/exports; owner may opt to include test records.

## Review Focus
- Direct/nested/index/encoded entry paths must not bypass capture.
- Failed persistence, forged/expired cookies, bad email, cross-origin requests must not unlock content.
- Repeated same-email submission must not create duplicate session contacts or alter existing workbook rows.
- Each session remains separately attributed; existing session password and owner protections remain effective.
- Form must remain usable on a narrow mobile screen and without JavaScript.

### Task 1: Shared capture contract
Files: lib/session-capture.js, lib/session-capture-registry.js, tests/session-capture.test.mjs.
- [ ] Add failing behavior tests for route classification, authorization, form validation, persistence failure, return visits, deduplication, consent and marked tests.
- [ ] Implement registry and gate with injectable storage/auth/time dependencies; default storage uses getWorkbookQuery.
- [ ] Run node --test tests/session-capture.test.mjs; expect all pass.

### Task 2: Native middleware and dashboard integration
Files: middleware.js, lib/owref2026.js, lib/workbook-registry.js, lib/workbook-response-api.js, lib/workbook-response-store.js, assets/js/dashboard.js, scripts/build-dashboard.mjs, dashboard/index.html.
- [ ] Add failing integration tests for all session paths, existing auth, owner dashboard visibility and CSV export, test exclusion.
- [ ] Wrap existing middleware with capture only for session content; explicitly preserve access/logout/API and facilitator routes. Extend McLendon index handling to its static index alias.
- [ ] Register capture workbooks and display their contacts. Add explicit owner include-tests filter defaulting off.
- [ ] Run focused and full test suites; document baseline/environment failures separately.

### Task 3: Review and live verification
- [ ] Review diff independently, address important issues, and commit.
- [ ] Stage production deployment using existing project/credentials; do not retrieve secrets or run database migrations.
- [ ] Verify gate behavior, synthetic submission persistence and owner export, content/return visits, and mobile layout; promote only tested build.
- [ ] Verify custom-domain live behavior; report exact coverage and remaining handoff blockers.
