# KAINDLY Vercel Maintenance Wall Design

## Objective

Place a temporary, branded maintenance wall in front of every user-facing Vercel route while preserving the completed website files behind it. GitHub Pages must continue serving the full website unchanged.

## Implementation Correction

The original self-rewriting `vercel.json` route design is superseded by root Vercel Routing Middleware. `middleware.js` directly returns the maintenance HTML with the required `503` and response headers for every non-asset path, including `/maintenance.html` and case variants. This guarantees all-path `503` semantics without a rewrite destination or loop; the statically analyzable matcher excludes `/assets/` so brand files continue to load. GitHub Pages does not execute Vercel middleware.

## Visitor Experience

Every user-facing Vercel URL returns the same standalone maintenance page without changing the requested URL in the browser. The page contains:

- KAINDLY logo
- Eyebrow: `A Thoughtful Update Is Underway`
- Heading: `Our site is being updated.`
- Message: `Thank you for your patience while we make thoughtful improvements to the KAINDLY experience. We’ll be back soon.`
- Contact line: `Need to reach us? hello@kaindly.ai`
- A `mailto:hello@kaindly.ai` link as the page's only interactive destination
- Closing tagline: `Lead AI. Don’t Chase It.`

The page contains no site navigation, booking link, Typeform, newsletter button, or route that reveals the completed site.

## Visual Design

- Full-viewport lavender background using KAINDLY's existing color tokens.
- Centered white content panel with the violet KAINDLY logo, restrained periwinkle detail, and subtle brand shadow.
- Violet heading, charcoal body copy, honeydew contact accent, and the existing KAINDLY typography with robust system fallbacks.
- Calm, generous spacing on desktop and a compact single-column composition on phones.
- Respect `prefers-reduced-motion`; no animation is required for the maintenance experience.

## Files and Isolation

- Add `maintenance.html` at the project root as a self-contained static document with inline page-specific CSS.
- Reuse `/assets/brand/logo-secondary-violet.svg` and `/assets/brand/icon-violet.svg`.
- Add `vercel.json` at the project root to enable the Vercel-only wall.
- Do not modify `index.html`, any completed website route, shared CSS, shared JavaScript, or GitHub Pages configuration.

Because GitHub Pages ignores `vercel.json`, the current public GitHub Pages site remains unchanged. The full website stays versioned in the same repository and becomes visible on Vercel again when the maintenance catch-all is removed.

## Vercel Routing

Use ordered Vercel `routes`:

1. Allow `/assets/(.*)` to resolve to the corresponding static asset so the logo and favicon load.
2. Send every other user-facing path to `/maintenance.html` with status `503`.

Apply these response headers to the catch-all:

- `Cache-Control: no-store, max-age=0`
- `Retry-After: 3600`
- `X-Robots-Tag: noindex, nofollow`

Include Vercel's current JSON schema URL in `vercel.json`. Vercel's reserved `/.well-known` path is outside application rewrite control and is the only platform-defined exception to the catch-all.

## Search and Accessibility

- Add `<meta name="robots" content="noindex, nofollow">` to the maintenance document in addition to the response header.
- Use semantic `<main>`, one `<h1>`, descriptive logo alt text, and visible keyboard focus for the email link.
- Maintain WCAG-conscious contrast and readable line length.
- Prevent horizontal overflow at all viewport sizes.

## Verification

Automated checks confirm:

- `maintenance.html` and `vercel.json` exist.
- The approved copy and `mailto:hello@kaindly.ai` link are present exactly once.
- The maintenance page has no internal navigation, booking, Typeform, or newsletter integration.
- `vercel.json` allowlists brand assets before the catch-all.
- The catch-all targets `/maintenance.html`, returns `503`, and includes all three temporary-response headers.
- The existing Home and other site files remain unchanged.

Browser checks render `maintenance.html` directly at desktop and phone widths to verify the logo, copy, email link, focus state, and absence of horizontal overflow. The Vercel routing configuration is validated structurally before commit. Once the repository is connected to Vercel, a preview deployment should be checked at `/`, `/about/`, and an unknown path before assigning the production domain.

## Removal

To reveal the completed Vercel site later, remove the maintenance catch-all from `vercel.json` (or remove the configuration file if no other Vercel settings have been added), redeploy, and verify the real routes before production promotion.
