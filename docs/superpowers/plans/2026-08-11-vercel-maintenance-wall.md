# KAINDLY Vercel Maintenance Wall Implementation Plan

**Goal:** Use root Vercel Routing Middleware to serve the branded maintenance experience with a direct `503` response for every non-asset Vercel request, while leaving the completed GitHub Pages site untouched.

**Architecture:** `middleware.js` is the single canonical implementation. Its default export returns the complete HTML response directly, avoiding rewrites and destination loops. Its statically analyzable matcher excludes `/assets/`, allowing the existing logo and icon to load. GitHub Pages does not execute Vercel Routing Middleware.

**Tech stack:** JavaScript, Vercel Routing Middleware, HTML/CSS in the middleware response, Node.js built-in test runner, local browser or renderer verification.

## Constraints

- Do not change completed route documents, shared CSS, shared JavaScript, integrations, or GitHub Pages configuration.
- For `/`, `/about/`, arbitrary unknown paths, `/maintenance.html`, and `/MAINTENANCE.HTML`, return the same maintenance HTML with status `503`.
- Send exactly these headers: `Cache-Control: no-store, max-age=0`, `Content-Type: text/html; charset=utf-8`, `Retry-After: 3600`, and `X-Robots-Tag: noindex, nofollow`.
- Exclude `/assets/` through the middleware matcher so brand files load normally.
- Keep `hello@kaindly.ai` as the sole interactive destination using `mailto:hello@kaindly.ai`.
- Include no navigation, booking, Typeform, newsletter control, internal link, button, form, input, select, textarea, or iframe.

## Files

- `middleware.js` — canonical direct-response maintenance implementation and matcher.
- `tests/site.test.mjs` — behavioral middleware contract.
- `docs/superpowers/specs/2026-08-11-vercel-maintenance-wall-design.md` — maintenance-wall design and removal procedure.

## Task 1: Implement the middleware wall

1. Add a failing test that imports and invokes root `middleware.js`.
   - Assert the matcher accepts `/`, `/about/`, an unknown path, `/maintenance.html`, and `/MAINTENANCE.HTML`.
   - Assert the matcher excludes `/assets/brand/logo-secondary-violet.svg`.
   - For every selected path, assert a direct `503` response, exact required headers, and identical HTML body.
   - Assert approved copy, the no-index meta tag, one anchor with `mailto:hello@kaindly.ai`, and no prohibited integrations or controls.
2. Run the focused test and confirm it fails for the missing or incorrect middleware behavior.
3. Implement `middleware.js` with:
   - A statically analyzable matcher excluding `/assets/`.
   - A default export returning `new Response(maintenanceDocument, { status: 503, headers })`.
   - The full branded HTML and responsive inline CSS as the response body.
   - No filesystem reads, rewrites, redirects, or destination routes.
4. Run the focused test and then `npm test`.

## Task 2: Verify the maintenance response

1. Start a safe local preview that calls the middleware for every non-asset request and serves `/assets/` statically.
2. At `1440x1000` and `390x844`, inspect middleware-rendered `/` and `/about/`.
   - Confirm the logo, eyebrow, heading, message, email, and tagline are visible.
   - Confirm the email is the only interactive element and resolves to `mailto:hello@kaindly.ai`.
   - Confirm there is no blank state, error overlay, console error, or horizontal overflow.
   - Confirm the phone contact label and email stack cleanly.
3. Confirm an asset request returns normally rather than the maintenance response.
4. Run `git diff --name-only HEAD -- index.html about/index.html collective/index.html assessment/index.html insights/index.html insights/kaindly-standards/index.html contact/index.html assets/css/site.css assets/js/site.js`; expect no output.
5. Run `git diff --check`; expect no output and exit code `0`.

## Task 3: Vercel preview and removal

1. After the repository is connected to Vercel, verify a preview deployment at `/`, `/about/`, an unknown path, `/maintenance.html`, and `/MAINTENANCE.HTML`.
   - Each must return the same maintenance HTML with `503` and all four required headers.
   - Confirm `/assets/brand/logo-secondary-violet.svg` remains available.
2. To restore the completed Vercel site, delete or disable root `middleware.js` and redeploy Vercel.
3. Verify `/`, `/about/`, and an unknown application path now return the completed site instead of the maintenance response before production promotion.

## Commit checklist

- Run `npm test`.
- Run `git diff --check`.
- Self-review the middleware, matcher behavior, response headers, and documentation for contradictory routing instructions.
- Commit only the intended implementation, test, and documentation changes. Do not push or merge as part of this plan.
