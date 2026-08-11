# KAINDLY Global Newsletter Popover Design

## Objective

Add the supplied KAINDLY newsletter Typeform popover to every published website route while preserving the dedicated assessment, contact-message, and scheduling experiences.

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

- Assessment and Contact already load the script for other Typeforms, so they receive only the new popover container.
- Home loads the script for the newsletter popover only.
- Collective, Insights, the Standards article, and About receive both the popover container and the shared Typeform script.

Following visual review, the Home readiness embed is replaced with one branded “Take the Assessment” button linking to `/assessment/`. The dedicated Assessment form, Contact message form, Acuity scheduler, and their fallback links remain unchanged.

## Accessibility and Resilience

The popover’s label, button, icon, focus management, open/close behavior, and form title remain controlled by the approved Typeform configuration. The underlying website remains fully usable if Typeform is blocked or JavaScript is unavailable. No site content or navigation depends on the newsletter popover.

## Verification

Automated checks confirm that every page contains:

- Exactly one newsletter live embed ID
- Exactly one Typeform loader script
- No duplicate page-specific Typeform IDs
- A Home assessment button with no Home readiness-form embed

Browser verification confirms that the popover button initializes on representative desktop and mobile pages, does not create horizontal overflow, and leaves the dedicated inline Typeforms available. It also confirms that Home presents the assessment button without the former blank embed panel. After local checks pass, push to `main`, wait for GitHub Pages to publish, and confirm the newsletter embed marker on all seven public routes.
