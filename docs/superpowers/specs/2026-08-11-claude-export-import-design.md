# KAINDLY Claude Export Import Design

**Date:** 2026-08-11  
**Status:** Approved design; awaiting written-spec review  
**Source:** `/Users/leanna/Downloads/export 4/kaindly-site`

## Goal

Adopt the complete Claude-edited export as the new source of truth for KAINDLY's public website while preserving the existing Vercel Preview workflow, Production maintenance wall, repository history, and deployment safeguards.

## Approved Approach

Use a controlled full replacement of the public-site surface. Copy the export's pages, shared styling, shared JavaScript, images, icons, logos, and brand assets into the permanent `preview` branch. Preserve repository and deployment files that are not part of the public design.

This avoids mixing the old and new design systems while preventing a wholesale folder copy from overwriting deployment infrastructure.

## Import Scope

The export becomes authoritative for:

- Home
- About
- AI Readiness Assessment
- KAINDLY Collective
- Contact
- Insights
- KAINDLY Standards article
- Exclusion and Inequity article
- Privacy Policy
- Terms of Service
- Shared CSS and JavaScript
- Exported founder photos, site imagery, icons, logos, and brand assets

Files present in the current site but absent from the export are not retained in the public surface unless they are required infrastructure or an explicitly preserved integration.

## Preserved Infrastructure

The import must not replace or weaken:

- `middleware.js` and its environment-aware routing
- Production's HTTP `503` maintenance response and approved maintenance copy
- Preview and Development pass-through behavior
- The permanent `preview` branch and `main` Production branch separation
- `package.json`, `package-lock.json`, and the exact `@vercel/functions` dependency
- Automated test infrastructure
- Git history and repository configuration
- Vercel project, domain, and deployment settings

No Preview deployment is promoted to Production. The custom domains remain behind the maintenance wall.

## Preserved Integrations and Destinations

The imported site must retain and verify:

- Acuity booking owner `38041134`, including direct booking links and the Contact scheduler embed
- AI Readiness Assessment Typeform `01KJ3TB8AV4EBVV6P51RE768EB`
- Contact message Typeform `01KZS1XDVQMV2J1AP4SMMSTQZ6`
- Sitewide newsletter trigger and Typeform `01KZS2YNAZC5SMZR13X20CRVKZ`
- KAINDLY Collective checkout at `https://kaindly.circle.so/checkout/founding-member`
- Contact email `hello@kaindly.ai`
- Internal navigation between all imported pages and articles

The exported destinations are accepted as authoritative where they provide direct fallback URLs for embedded services.

## Asset Rules

Claude-exported assets replace matching public assets and add new assets. The import must preserve `assets/brand/og.png` because the export does not contain a replacement social image. Infrastructure-only files such as `.nojekyll`, `.gitignore`, and `README.md` remain unchanged.

Every imported local image, stylesheet, script, logo, and page link must resolve from its deployed route. Duplicate asset families included in the export may remain when referenced by the exported pages; unused legacy public assets may be removed only when the link validator proves they are unreferenced.

## Responsive and Accessibility Behavior

The imported design must work at desktop and phone widths. Desktop layouts may use horizontal grids and paired content; phone layouts must stack vertically without clipped text, horizontal overflow, inaccessible controls, or overlapping embeds.

The final site must retain:

- One clear page heading and accessible landmarks per page
- Keyboard-usable navigation and controls
- Meaningful alternative text for content images
- Visible focus behavior
- Proper labels or titles for embedded forms and scheduling
- Unique page titles and descriptions

## Validation

Automated checks will be updated to reflect the new source of truth rather than forcing obsolete page copy or layout contracts. They will verify:

- Every exported page exists and has unique metadata and landmarks
- Every local page link and referenced asset resolves
- Each required Typeform, Acuity, Circle, and email destination is present in the correct location
- Newsletter initialization appears exactly once on every page
- The new article and legal pages are reachable from the intended index/footer links
- Responsive CSS includes the exported desktop and phone behavior
- Environment-aware middleware still gives Preview the full site and Production the unchanged maintenance wall

After local checks pass, the site will be reviewed in a browser at representative desktop and phone sizes. The `preview` branch will then be pushed, and the stable Vercel Preview URL will be checked for HTTP `200`, full-site content, and `X-Robots-Tag: noindex`. Production domains will be rechecked for the HTTP `503` maintenance wall.

## Rollout and Recovery

All changes land only on `preview`. The stable team Preview URL updates after the branch push. Production is not promoted or changed.

If the import fails validation or the deployed Preview is incorrect, the prior known-good Preview commit `1338290e30aee99a773ab166d017cfed012100be` remains available in Git history for recovery. Recovery must not involve rewriting `main` or altering Production domains.

## Acceptance Criteria

The import is complete when:

1. Claude's exported design and content are visible across all included pages.
2. All required embeds, buttons, destinations, and internal links work.
3. Desktop and phone layouts pass visual review.
4. Automated tests and link validation pass.
5. The stable Vercel Preview is public, returns the full site with `noindex`, and requires no login.
6. `kaindly.ai`, `www.kaindly.ai`, and the Production Vercel alias still return the maintenance wall.
7. GitHub Pages remains unpublished.

