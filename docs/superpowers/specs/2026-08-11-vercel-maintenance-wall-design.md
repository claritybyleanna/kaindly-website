# KAINDLY Vercel Maintenance Wall Design

## Objective

Place a temporary branded maintenance wall in front of every non-asset Vercel request while preserving the completed website behind it. GitHub Pages must continue serving the complete site unchanged.

## Architecture

Root `middleware.js` is the single canonical maintenance-wall implementation. Vercel Routing Middleware invokes its default export before application routing for paths selected by its statically analyzable matcher. The middleware returns a direct `Response`; it does not rewrite, redirect, or depend on a destination document.

The matcher excludes `/assets/` so existing brand assets load normally. Every other application path returns the same HTML and these exact response properties:

- Status: `503`
- `Cache-Control: no-store, max-age=0`
- `Content-Type: text/html; charset=utf-8`
- `Retry-After: 3600`
- `X-Robots-Tag: noindex, nofollow`

Direct middleware avoids a self-rewrite loop and guarantees `503` semantics for `/`, `/about/`, unknown paths, `/maintenance.html`, and `/MAINTENANCE.HTML`. GitHub Pages does not execute Vercel Routing Middleware, so it remains unaffected.

## Visitor Experience

Every selected Vercel URL keeps its requested URL while receiving the same maintenance HTML. The response contains:

- KAINDLY logo from `/assets/brand/logo-secondary-violet.svg`
- Eyebrow: `A Thoughtful Update Is Underway`
- Heading: `Our site is being updated.`
- Message: `Thank you for your patience while we make thoughtful improvements to the KAINDLY experience. We’ll be back soon.`
- Contact line with the sole interactive destination, `mailto:hello@kaindly.ai`
- Closing tagline: `Lead AI. Don’t Chase It.`

The document includes the no-index meta tag, semantic `<main>`, one `<h1>`, descriptive logo alt text, and a visible focus treatment for the email link. It contains no navigation, booking link, Typeform, newsletter control, internal route, button, form, input, select, textarea, or iframe.

## Visual Design

- Full-viewport lavender background and centered white card.
- Violet logo and heading, periwinkle accent, charcoal body copy, and honeydew contact accent.
- Existing KAINDLY font choices with robust system fallbacks.
- Desktop composition remains centered; at phone widths the contact label and email stack cleanly.
- The response is usable without JavaScript, animation, or horizontal overflow.

## Isolation and Removal

- Preserve all completed route documents, shared CSS, shared JavaScript, integrations, and GitHub Pages configuration.
- Reuse the existing violet logo and icon paths; the matcher permits those asset requests.
- To disable the wall, delete or otherwise disable root `middleware.js`, redeploy Vercel, and verify `/`, `/about/`, and an unknown application path return the completed site rather than a `503` maintenance response.

## Verification

Automated checks import and invoke the middleware directly. They verify the matcher bypasses a brand asset and that `/`, `/about/`, an unknown path, `/maintenance.html`, and `/MAINTENANCE.HTML` each receive the same `503` response with the exact headers and approved HTML. They also enforce the single email anchor and absence of prohibited controls and integrations.

For a local preview, run a small server that invokes the middleware for non-asset paths and serves `/assets/` statically; inspect the middleware response at desktop and phone widths. Confirm visible logo and copy, the lone mailto link, no horizontal overflow or console errors, and the stacked phone contact treatment. Before Vercel production use, verify the same routes and headers on a Vercel preview deployment.
