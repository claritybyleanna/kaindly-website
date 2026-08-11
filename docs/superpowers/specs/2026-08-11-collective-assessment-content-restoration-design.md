# KAINDLY Collective, Assessment, and Standards Restoration Design

## Objective

Restore the complete approved KAINDLY Collective experience, add the supplied Circle checkout and Typeform experiences, and publish the corrected KAINDLY Standards article without disrupting the working static site, its brand system, or its accessibility.

## Scope and Source of Truth

The current production-ready static site remains the technical shell. The supplied `Kaindly website redesign/site/collective.jsx` file is the content and section-order source of truth for the Collective page. Nothing from that Collective source is to be shortened or removed merely to fit the newer shell.

The corrected article beginning with “How We Show Up” is the source of truth for the KAINDLY Standards article. It replaces the earlier “Lead AI. Don’t Chase It.” article draft for this route.

## Routes and Navigation

- `/collective/` remains the Collective landing page and is fully restored.
- `/assessment/` is a new dedicated AI Readiness Assessment page.
- `/insights/kaindly-standards/` is a new editorial article page titled “How We Show Up.”
- The primary five-item navigation remains unchanged to avoid crowding the header. Assessment access is provided through relevant calls to action, and the Standards article is linked from Insights.
- All internal routes use same-tab navigation. External Circle, Typeform fallback, and Acuity destinations open in a new tab with safe link attributes.

## Collective Restoration

Preserve the original Collective page’s order and full message:

1. “Enrollment Now Open” hero
2. Main Collective positioning and `$97/month · Cancel anytime`
3. Founder quotation
4. Six audience cards
5. “Today” versus “90 Days From Now” transformation
6. Five membership benefits
7. Five learning pathways
8. Full value comparison:
   - Industry Conference — `$2,000+`
   - Executive Coaching — `$500+`
   - Online Course Bundle — `$300+`
   - The KAINDLY Collective — `$97/month`
9. AI readiness assessment banner
10. Final membership invitation

All membership-oriented calls to action, including “Join The Collective” and equivalent membership actions, link directly to `https://kaindly.circle.so/checkout/founding-member`. The price and enrollment status remain visible exactly as supplied. Assessment-oriented calls to action link to `/assessment/`.

The current semantic HTML, responsive shell, keyboard focus styles, reduced-motion support, logo treatment, and shared header/footer remain in place. Original JSX is translated into static HTML rather than executed in the browser.

## AI Readiness Assessment Page

Create a branded page with a concise introduction, expectations-setting copy, and the supplied live Typeform:

- Embed ID: `01KJ3TB8AV4EBVV6P51RE768EB`
- Script: `https://embed.typeform.com/next/embed.js`

The embed receives enough vertical space to be usable on desktop and mobile without layout collapse. A visible fallback link points to `https://form.typeform.com/to/01KJ3TB8AV4EBVV6P51RE768EB` if the external script is blocked. The script is loaded only once on the page and does not block the rest of the site.

## Home Page Typeform

Add a dedicated, branded assessment section immediately after the Home hero so it is discoverable without displacing the existing KAINDLY system content. Use the supplied live Typeform:

- Embed ID: `01KJ3V41DCC0V9P0VT0T97XK4E`
- Script: `https://embed.typeform.com/next/embed.js`

The section includes a short heading and explanation consistent with the existing brand voice. A visible fallback link points to `https://form.typeform.com/to/01KJ3V41DCC0V9P0VT0T97XK4E`. Existing Home sections and calls to action remain intact.

## KAINDLY Standards Article

On the Insights page, convert the KAINDLY Standards preview into a real article link targeting `/insights/kaindly-standards/`. Preserve the other existing insight previews and filters.

The article page uses a restrained editorial layout with the shared site header and footer, a readable line length, the KAINDLY palette, and clear typographic hierarchy. Its title is “How We Show Up,” with “KAINDLY Standards” used as the category or eyebrow. Publish the supplied article text verbatim:

> These standards govern how we work—with clients, with each other, and in every decision we make. They are not aspirations. They are commitments. They reflect what it means to be human-centered and outcomes-focused in practice.
>
> **We do not shame uncertainty.** Hesitation is not weakness. Questions are not failure. We create space for people to learn without fear of judgment—because learning is the path to outcomes.
>
> **We design for the least confident person in the room.** If our work leaves anyone behind, it is not finished. Accessibility is not a concession; it is a standard—and it expands capability across the entire organization. We believe that this is not about just filling a skill gap, but creating an equitable access opportunity.
>
> **We choose clarity over cleverness.** If people are confused, the problem is ours. We translate complexity into language that can be understood, tested, and applied—because confusion delays outcomes.
>
> **We build confidence through practice, not proclamation.** Real confidence grows from experience. We create opportunities to try, fail safely, and try again—because confidence is the bridge to competence.
>
> **We challenge without diminishing.** High standards and human dignity are not in tension. We hold people accountable while preserving their sense of worth—because accountability without dignity produces compliance, not capability.
>
> **We resist the pressure to move before direction is clear.** Speed without clarity is not leadership. We do not confuse motion with progress or urgency with importance—because misdirected speed delays outcomes.
>
> **We measure by capability and outcomes, not adoption.** Success is not how many people have access to tools. It is how many can use them well—and what they produce as a result.
>
> *These standards are not negotiable.*
>
> *They are how KAINDLY earns the right to guide*

No paragraphs from the earlier article draft are added to this article.

## Metadata and Sharing

The two new pages receive unique titles, descriptions, canonical paths, favicon links, and Open Graph metadata consistent with existing pages. The article metadata uses “How We Show Up | KAINDLY Standards.” The assessment metadata describes the AI Readiness Assessment without making unsupported scoring or outcome claims.

## Accessibility and Resilience

- Typeform areas have descriptive headings and fallback links.
- External scripts use HTTPS and load asynchronously.
- Core content, navigation, Circle checkout links, and fallback Typeform links work without site JavaScript.
- The article uses semantic article structure and avoids presenting decorative quotations as inaccessible text images.
- Existing mobile navigation, focus treatments, contrast, and reduced-motion behavior are preserved.

## Verification

Automated checks will confirm:

- All seven routes and their local assets resolve.
- Each Typeform ID appears on the correct page and its script appears exactly once there.
- Each Typeform has the correct direct fallback URL.
- All Collective membership actions use the supplied Circle checkout URL.
- The complete Collective sections, `$97/month` price, enrollment label, six audience cards, five benefits, five pathways, and all four comparison prices are present.
- The Standards preview links to the article route.
- The article contains every supplied standard and does not contain the replaced article draft.
- Existing Acuity booking behavior and all previously working pages remain intact.

After local verification, commit and push the implementation to `main`, wait for GitHub Pages to publish it, and verify all new public routes and embedded-script markers from the deployed site.

## Out of Scope

- Changing the Circle offer, checkout settings, or membership price
- Editing Typeform questions, logic, branding, or response handling
- Adding a CMS or article authoring system
- Rewriting the supplied Collective or Standards copy
- Removing or redesigning existing Home sections
