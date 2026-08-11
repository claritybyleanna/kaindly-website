# KAINDLY Home Responsive Layout Design

## Objective

Correct the Home assessment CTA and KAINDLY System layouts so they match the approved visual direction across desktop, tablet, and phone widths. Preserve all existing links and product descriptions while using the supplied five-card reference for structure and KAINDLY's established light color palette for presentation.

## Assessment CTA

Replace the former Typeform-oriented grid behavior with a dedicated compact CTA layout.

- Desktop and tablet: retain two columns, with the existing heading and paragraph on the left and the existing “Take the Assessment” button on the right.
- Vertically center the button against the copy and reduce the section's vertical padding so neither column appears stranded in empty space.
- Phone: collapse to one column and position the button immediately beneath the paragraph, left-aligned with the copy.
- Preserve the current lavender background, orange CTA treatment, wording, and `assessment/` destination.

## FAAI Stage Line

- Desktop and tablet: retain one horizontal four-segment line in the order Fluency, Adoption, Acceleration, and Impact.
- Phone: stack all four stage segments vertically in the same order.
- Continue using KAINDLY's periwinkle-to-violet progression rather than the dark reference palette.

## Five Product Cards

Use the supplied reference as the structural model:

- Desktop: display all five equal-width cards in one horizontal row directly beneath the stage line.
- Tablet: use two readable columns; the fifth card may span the final row so it does not become unusually narrow.
- Phone: display all five cards in a single vertical column.
- Keep cards equal-height within each row and align their internal content consistently.
- Use white surfaces, soft periwinkle borders, lavender numerals, violet headings, muted body copy, and subtle KAINDLY shadows.
- Each card contains, in order: the existing number, a short violet accent rule, the existing title, the supplied category line, the existing description, and the supplied audience badges anchored at the bottom.

The supplied card metadata is:

1. AI Readiness Spectrum™ — `Assessment · Diagnostic`; `Enterprise`; `Individual`
2. Skills Audit & Opportunity Scan — `Discovery · Workflow Mapping`; `Enterprise`; `Individual`
3. Custom Curriculum Design — `Enterprise · Bespoke Programs`; `Enterprise Only`
4. AI Academy — `Training · Cohort-Based`; `Enterprise Cohorts`; `Open Enrollment`
5. The KAINDLY Collective — `Community · Sustained Fluency`; `Organizational Access`; `Individual Membership`

Primary audience badges use a honeydew surface with violet text. Secondary badges use a transparent surface with a periwinkle border. All badges remain descriptive text rather than interactive controls.

## Responsive Breakpoints

- Large desktop (`min-width: 1180px`): five product columns and compact two-column CTA.
- Tablet (`681px` through `1179px`): two product columns, horizontal stage line, and two-column CTA while space permits.
- Phone (`max-width: 680px`): one product column, vertical stage line, and one-column CTA.

The layout must not introduce horizontal scrolling at any supported width.

## Accessibility and Content Integrity

- Preserve semantic `<article>` elements for the product cards.
- Keep the stage labels grouped under their existing accessible label.
- Keep the assessment destination keyboard accessible as a normal link.
- Preserve the existing product order, titles, descriptions, trademark marks, and all unrelated Home content.
- Decorative rules are CSS-generated and require no additional screen-reader text.

## Verification

Automated checks will assert the required card metadata and responsive layout hooks. Browser checks will verify:

- Five cards in one row at a large desktop width.
- Two readable card columns at tablet width.
- One vertical stage line and one vertical card column at phone width.
- A compact two-column CTA on desktop and a one-column CTA on phone.
- No horizontal overflow, missing text, duplicate cards, or broken assessment link.

After local tests and visual checks pass, publish the change to `main`, wait for GitHub Pages, and verify the public Home page at desktop and phone widths.
