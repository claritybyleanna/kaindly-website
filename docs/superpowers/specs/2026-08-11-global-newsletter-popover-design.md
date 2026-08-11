# KAINDLY Global Newsletter Popover Design

## Objective

Add the supplied KAINDLY newsletter Typeform popover to every published website route without changing the existing inline assessment, contact-message, or scheduling experiences.

## Supplied Integration

- Live embed ID: `01KZS2YNAZC5SMZR13X20CRVKZ`
- Script: `https://embed.typeform.com/next/embed.js`
- Typeform configuration: fixed popover titled “Newsletter Sign up kaindly,” using the configured KAINDLY icon and honeydew trigger color

## Pages

Add the popover to all seven HTML routes:

- `/`
- `/collective/`
- `/assessment/`
- `/insights/`
- `/insights/kaindly-standards/`
- `/about/`
- `/contact/`

## Integration Rules

Place `<div data-tf-live="01KZS2YNAZC5SMZR13X20CRVKZ"></div>` near the end of each page body, outside `<main>`, so the configured Typeform popover can attach globally without affecting document layout or semantics.

Each page loads `https://embed.typeform.com/next/embed.js` exactly once and over HTTPS:

- Home, Assessment, and Contact already load the script for other Typeforms, so they receive only the new popover container.
- Collective, Insights, the Standards article, and About receive both the popover container and the shared Typeform script.

The existing Home readiness experience, dedicated Assessment form, Contact message form, Acuity scheduler, and all fallback links remain unchanged.

## Accessibility and Resilience

The popover’s label, button, icon, focus management, open/close behavior, and form title remain controlled by the approved Typeform configuration. The underlying website remains fully usable if Typeform is blocked or JavaScript is unavailable. No site content or navigation depends on the newsletter popover.

## Verification

Automated checks confirm that every page contains:

- Exactly one newsletter live embed ID
- Exactly one Typeform loader script
- No duplicate page-specific Typeform IDs

Browser verification confirms that the popover button initializes on representative desktop and mobile pages, does not create horizontal overflow, and leaves the existing inline Typeforms available. After local checks pass, push to `main`, wait for GitHub Pages to publish, and confirm the newsletter embed marker on all seven public routes.
