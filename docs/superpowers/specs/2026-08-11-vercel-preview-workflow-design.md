# KAINDLY Vercel Preview Workflow Design

**Date:** 2026-08-11

## Objective

Keep the public KAINDLY domains behind the approved maintenance wall while giving the team one stable, publicly shareable Vercel Preview URL for the complete website. Remove the separate public copy currently served by GitHub Pages only after the Vercel Preview has been verified.

## Environment Contract

- `main` remains Vercel's Production Branch.
- `preview` is the permanent team-review branch.
- Vercel Production, including `kaindly.ai`, `www.kaindly.ai`, and the production `vercel.app` alias, returns the existing maintenance document with HTTP `503`.
- Vercel Preview and local Vercel Development continue to the underlying static website.
- Missing or unrecognized environment state returns the maintenance document. The system fails closed rather than accidentally exposing the site.
- `/assets/` continues to bypass middleware in every environment so brand assets remain available.

## Middleware Design

The root `middleware.js` remains the only production-wall implementation. It reads Vercel's runtime `VERCEL_ENV`, whose supported values are `production`, `preview`, and `development`.

For `preview` and `development`, middleware uses the framework-independent `next()` helper from `@vercel/functions` to continue to the requested static file. For every other value, it returns the existing branded maintenance HTML with the existing `503`, `Cache-Control`, `Content-Type`, `Retry-After`, and `X-Robots-Tag` headers.

The project will add `@vercel/functions` as a production dependency. No build framework or site conversion is introduced.

## Team Review Workflow

1. Site changes are committed to or merged into `preview`, not `main`.
2. Vercel automatically creates or updates the Preview deployment for the branch.
3. The branch-specific Preview URL remains stable across pushes and is the link shared with the team.
4. Preview Deployment Protection remains disabled so anyone with the URL can view the site without a Vercel account.
5. The Preview uses its standard `vercel.app` hostname. Vercel adds `X-Robots-Tag: noindex` to standard Preview deployments by default, preventing search indexing.
6. No custom domain is assigned to `preview`.

## GitHub Pages Transition

GitHub Pages currently exposes the complete website at a public `github.io` URL. It will be disabled in repository settings only after all Vercel Preview checks pass. Disabling Pages must not delete or modify website files, branches, or Git history.

If Preview verification fails, GitHub Pages stays enabled while the issue is corrected. This avoids removing the only verified full-site review surface prematurely.

## Verification

Automated tests will exercise middleware under isolated environment values:

- `VERCEL_ENV=production` returns the approved maintenance HTML, HTTP `503`, and exact temporary-response headers.
- `VERCEL_ENV=preview` continues to the static website.
- `VERCEL_ENV=development` continues to the static website.
- Missing or unexpected `VERCEL_ENV` returns the maintenance response.
- The matcher continues to exclude brand assets.

Live verification will confirm:

- The stable `preview` branch URL returns the full Home page with HTTP `200`.
- The Preview URL is accessible in a signed-out browser and returns `X-Robots-Tag: noindex`.
- `https://kaindly.ai/`, `https://www.kaindly.ai/`, and the production Vercel alias continue to return the maintenance wall with HTTP `503`.
- After those checks pass, GitHub Pages is disabled and the former `github.io` URL no longer serves the complete website.

## Launch and Rollback

Future launch work will remove or disable the maintenance branch in `middleware.js`, merge the reviewed site into `main`, deploy Production, and verify both custom domains before announcing the site.

If the Preview workflow causes a regression, revert the environment-aware middleware commit. Production remains protected because any missing or unexpected environment value returns the maintenance wall. GitHub Pages can remain disabled once the Vercel Preview is healthy; it can be re-enabled independently if an emergency review surface is needed.

## Non-Goals

- Publishing the complete website to Production.
- Assigning a custom domain to Preview.
- Adding authentication, a CMS, or a new framework.
- Removing the maintenance wall from `main`.
