# KAINDLY Leadership Learning Hub Prototype Design

## Objective

Create an unpublished, clickable local prototype for a future KAINDLY Leadership Learning Hub at the exact case-sensitive route `/Blead/`. The prototype must help busy leaders understand the program, find the weekly plan, recognize content availability, and locate help without exposing client-specific, personal, private, or unapproved information.

The prototype is a review artifact. It will not be pushed, deployed, linked from the public site, or represented as an active program.

## Success Criteria

- The first screen explains the hub and makes the program plan the obvious next action.
- The prototype works at approximately 1440px, 390px, and 320px viewport widths without horizontal overflow.
- The plan demonstrates reusable week cards in Available, Overview available, and Coming soon states.
- One sample week is expanded by default for design review.
- Optional resource states appear only in a clearly labeled prototype-review area.
- Header navigation, accordions, FAQ controls, and sample local filters work with pointer and keyboard input.
- Sample content is clearly marked and cannot be mistaken for an approved curriculum, schedule, or resource.
- The page contains no client identity, participant data, dates, private links, live forms, analytics, marketing capture, or unsupported promises.
- Existing KAINDLY pages, navigation, and Production behavior remain unchanged.

## Delivery Boundary

The deliverable is a local prototype on branch `codex/blead-prototype`. It is served through a dedicated `npm run prototype:blead` command and viewed at `http://127.0.0.1:4173/Blead/`. The dedicated server is necessary because a plain static file server cannot enforce authentication.

This phase does not authorize:

- GitHub pushes or pull requests
- Vercel Preview or Production deployments
- Main-site navigation changes
- Account, authentication, CMS, analytics, form, email, calendar, or collaboration-platform integrations
- Publication of real curriculum, schedules, assessment information, recordings, or participant resources

## Architecture

Add one protected static route, isolated presentation assets, and a small authentication boundary:

- `Blead/index.html` — semantic page structure and progressively enhanced content
- `Blead/access/index.html` — branded password screen with generic error messaging
- `Blead/content.js` — an exported public-safe content object protected by the same route matcher
- `assets/css/blead.css` — route-specific layout and component styles
- `assets/js/blead.js` — local accordion, deep-link, and filter behavior
- `assets/js/blead-access.js` — access-form enhancement without password or session logic
- `lib/blead-auth.js` — shared password and signed-session helpers
- `scripts/blead-prototype-server.mjs` — local review server that applies the same access contract
- `middleware.js` — route-specific password verification, session enforcement, and logout while preserving the existing maintenance behavior

The page reuses `assets/css/site.css`, `assets/js/site.js`, and official assets in `assets/brand/`. Route-specific names avoid changing the existing site. The content module lives below `/Blead/` so it cannot be fetched without the same session check. It contains only fields that are safe for the intended audience; editorial notes and private fields do not exist in the delivered object.

JavaScript enhances the experience but does not own the primary content. The rendered HTML remains understandable if JavaScript fails. The content module is used to validate and demonstrate the future editable model without adding a backend.

## Access Control

Use a branded KAINDLY password screen rather than the browser's native authentication prompt. The owner-supplied shared program password is supplied through the private `BLEAD_PASSWORD` environment variable and never committed to source or documentation. A separate `BLEAD_SESSION_SECRET` signs session cookies.

Unauthenticated requests for `/Blead/` or any file below it redirect to `/Blead/access/`. The access page submits the password by `POST` to the same access route. Vercel middleware compares the submitted value server-side and, when accepted, returns a signed session cookie with these properties:

- `HttpOnly`
- `Secure` outside local development
- `SameSite=Lax`
- `Path=/Blead/`
- Eight-hour maximum lifetime

The cookie contains no password or participant data. Middleware verifies its signature and expiration before returning protected content. Invalid or expired sessions return to the access page. A small “End this session” form posts to `/Blead/logout/`, where middleware clears the cookie and returns to the access screen.

Failed access attempts receive a generic inline error and preserve focus at the password field. The page does not disclose whether an environment variable, cookie, or account exists. The endpoint accepts only same-origin form posts, uses `Cache-Control: no-store`, and applies a small fixed failure delay. A future public deployment should add platform-level rate limiting before using this shared password for anything beyond low-sensitivity program materials.

The local prototype server reads the same variables from an ignored `.env.local` file and mirrors the production redirect/cookie contract. The ignored local file may contain the owner-supplied review password but must never be committed. Publication still requires separately configuring both variables in the approved hosting environment.

This shared password is a low-friction access boundary, not user identity or permission management. The page must not contain participant data, assessment results, sensitive client facts, or any content requiring individualized authorization.

## Page Structure

### Header

Use the official horizontal KAINDLY logo and a compact hub-specific anchor navigation:

- Overview
- Program plan
- Updates
- Help

Do not reproduce the main marketing-site navigation or newsletter control. Desktop navigation remains horizontal and includes a subdued “End session” action. Mobile navigation uses the existing accessible menu pattern with a visible “Menu” label, Escape handling, focus return, and large touch targets.

The header may become sticky, with scroll offsets applied to every target so focused controls and section headings remain visible.

### Hero and Next Step

Use a compact two-column desktop layout and single-column mobile layout.

Participant-facing content:

- Eyebrow: `AI Leadership Program`
- H1: `Leadership Learning Hub`
- Body: `Your starting point for the program. Explore the learning plan, find available materials, and see what comes next.`
- Primary action: `View the program plan`
- Secondary action: `How to use this hub`
- Supporting line: `Program information will be updated here as materials become available.`

The right column contains a “Start here” card directing visitors to the plan. It does not infer a current week, date, deadline, or countdown.

### Program Overview

Provide a short neutral introduction followed by three blocks:

- Learn — Build a shared understanding of AI concepts and possibilities
- Reflect — Consider the questions leaders need to ask
- Apply — Turn learning into thoughtful next steps

Add the four-step “How to use this hub” list from the source brief. All language remains generic and avoids promises of proficiency, certification, business impact, or individual completion.

### Program Plan

Use a vertically ordered set of independent week accordions. Multiple weeks may remain open. The prototype uses the three fictional examples from the brief and places a persistent “Sample content for design review” notice immediately above them.

Each collapsed row includes:

- Week label
- Sample public title
- One-sentence summary
- Text availability badge
- Explicit expand/collapse button

The first sample week opens by default. Available and overview states reveal only populated subsections. Coming soon reveals no invented details. Empty headings are omitted.

Deep links such as `/Blead/#week-01` open the matching week and move its heading into view. Expansion motion is modest and disabled when reduced motion is requested.

### Optional Materials Prototype

Show this only inside a clearly labeled “Prototype component examples” section, visually separated from the participant template. It demonstrates:

- Available public material with a nonfunctional review label rather than a fake link
- Upcoming material without an action
- Temporarily unavailable material with a plain explanation
- External authorized resource with an explicit access note and a disabled demonstration action

A local-only filter demonstration may filter these fictional cards by type or week. It never calls a service or sends search terms anywhere. The default future participant template keeps the module disabled until approved resources and destinations exist.

### Updates

Include one clearly labeled fictional update example and a documented empty state. Do not print automatic timestamps or claim that anything was updated recently. The section can be removed entirely when no approved update exists.

### Help and FAQ

Use accessible FAQ accordions with the five neutral questions from the brief. The support answer points participants to their approved program channel; it does not invent a public email, response time, or contact form.

### Footer

Include the official KAINDLY brand identifier, `Leadership Learning Hub`, verified links to the existing Privacy Policy and Terms of Service, and a Back to top link. Do not include the marketing newsletter, booking CTA, client information, private contacts, or source brief.

## Visual Direction

The prototype is light-first and violet-led:

- Violet `#634CC8` anchors actions, active states, and focus treatment.
- Pale periwinkle tints support cards and section surfaces.
- Honeydew provides one restrained informational highlight.
- Charcoal `#242424` remains the primary text color.
- Orange is omitted so it does not compete with the plan action.

Reuse the current site’s approved Jost/Causten fallback, Archivo, and Urbanist setup. Use fluid headings, readable multi-line line heights, 16–18px body text, restrained 5px rounding, light borders, and little or no shadow. Keep prose lines near 60–75 characters.

The hero may use a subtle official gradient accent, but useful content—not decoration—creates the hierarchy. Do not use stock photography, robot imagery, glass effects, animated particles, fabricated charts, or dashboard clutter.

## Public-Safe Content Model

The local sample content object contains:

### Site

- Public title and descriptor
- Hero copy
- Enabled module switches
- Section destinations
- Generic next step
- Verified policy links

### Week

- Stable generic ID and order
- Label, public title, summary, and state
- Optional focus, objectives, preparation, session overview, reflection, and next-week ID
- Related sample resource IDs
- `sample: true`

### Resource

- Stable generic ID
- Type, neutral title, description, sample week ID, availability, and access mode
- Null URL by default
- `sample: true`

### Update and FAQ

- Stable generic ID
- Public-safe title/body or question/answer
- Order and enabled state
- `sample: true` where applicable

The data object intentionally excludes owner identities, review notes, approval metadata, participant information, private URLs, schedules, assessment data, and source-document content. Draft records are absent rather than hidden.

## Interaction and Resilience

- Buttons expose `aria-expanded` and reference the controlled panel.
- All controls work with keyboard activation and have visible focus styles.
- Opening one week does not close another.
- Mobile navigation closes after selection and on Escape, returning focus appropriately.
- Unavailable resources never receive fake `href="#"` destinations.
- Optional filter controls update an `aria-live` result count and provide a clear-filter action.
- Without JavaScript, sample weeks remain readable and resource availability remains explicit.
- If an optional asset fails, the layout retains its dimensions and uses a brand-color fallback.
- No interface displays a success state for an action that was not completed.

## Accessibility and Responsive Behavior

Target WCAG 2.2 AA through semantic landmarks, one H1, logical headings, skip navigation, visible focus, contrast-checked text and controls, 44px practical touch targets, reduced-motion support, and meaningful status text.

The layout must reflow at 320px without horizontal page scrolling. Week titles and state labels wrap independently. The next-step card stacks immediately after the hero introduction. At 200% text zoom, controls remain reachable and content stays ordered.

## Metadata and Privacy

Use generic prototype metadata:

- Title: `Leadership Learning Hub Prototype | KAINDLY`
- Description: a neutral design-review description with no client, curriculum, or schedule details
- Canonical omitted during local review
- Robots: `noindex, nofollow`

Do not embed the source brief, private fields, review notes, hidden client identifiers, real destinations, analytics events, or restricted previews in HTML, comments, JavaScript, filenames, metadata, or image alt text.

`noindex` is only a discoverability preference. The prototype contains public-safe information regardless.

## Testing and Review

Add automated checks that verify:

- The exact `Blead/index.html` route and capitalization
- Generic title, descriptor, and metadata
- No link from existing public pages to `/Blead/`
- Unauthenticated `/Blead/` and protected-content requests redirect to the access screen
- Correct passwords create a valid scoped session; incorrect passwords never do
- Passwords and session secrets are absent from committed HTML, JavaScript, logs, URLs, and browser storage
- Tampered and expired cookies are rejected
- Logout clears the scoped session
- Sample-content labeling and all three week states
- No fake links, forms, analytics, embeds, client names, dates, or participant information
- Correct ARIA relationships for menus, week controls, FAQs, and filters
- Every local asset and internal link resolves

Browser verification covers:

- Desktop at approximately 1440px
- Mobile at approximately 390px
- Narrow reflow at 320px
- Keyboard navigation, focus visibility, Escape behavior, and multiple open weeks
- Deep-link opening for `#week-01`
- Filter and clear-filter behavior
- Branded access, failed-password, successful-login, expired-session, and logout flows
- Reduced-motion behavior
- No horizontal overflow or browser console errors

## Review Handoff

After local verification, open the prototype in the in-app browser for reaction. Keep the feature branch local. Changes are revised locally until the owner separately authorizes a Preview deployment or publication.
