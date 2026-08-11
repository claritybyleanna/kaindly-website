# “Exclusion and Inequity” Insights Article Design

## Objective

Publish the supplied newsletter copy as a complete KAINDLY Insights article and connect the existing preview card to it. Preserve the author's argument, wording, emphasis, and closing while presenting the piece in the established KAINDLY editorial system.

## Route and Discovery

- Create the article at `/insights/exclusion-and-inequity/`.
- Change the existing “Exclusion and Inequity Has a New Face in the World of AI” preview card into a link to the new route.
- Change the card label from “Article Preview” to “Read Article.”
- Preserve the card's existing categories so current Insights filtering continues to work.

## Article Presentation

Use the KAINDLY Standards page as the structural and visual foundation:

- Shared announcement bar, header, navigation, booking CTA, footer, and newsletter popover.
- Lavender editorial header with the exact title “Exclusion and Inequity Has a New Face in the World of AI.”
- Editorial kicker: `Access & Equity`.
- Introductory deck: “It’s not bias in the algorithms. It’s gatekeeping disguised as protection.”
- Narrow, readable body column using the existing body typography and responsive spacing.
- Back link to the Insights index at the end.

The article body uses semantic section headings for the supplied transitions:

1. Inside Corporate Walls
2. Outside Corporate Walls
3. The Friction We Don’t Talk About Enough
4. This Is Why KAINDLY Exists
5. What We’re Facing Isn’t a Skill Gap. It’s an Access Gap.
6. We Design for the Least Confident Person in Any Room

## Content Treatment

- Preserve all supplied prose, paragraph order, bold emphasis, italic emphasis, and the closing “Happy MLK Day.”
- Omit only the copied platform labels `See content credentials` and `Article content`.
- Do not add claims, citations, publication dates, bylines, or external links that were not supplied.
- Convert the supplied bold section transitions into semantic headings without otherwise rewriting them.
- Style these existing statements in place as KAINDLY pull quotes:
  - “For many, it’s a safety gap.”
  - “But that’s not access. That’s abandonment dressed up as progress.”
  - “AI fluency isn’t a technical skill. It’s power.”
- Preserve the italic question “Why is the door locked?” within its paragraph.

## Metadata

- Page title: `Exclusion and Inequity Has a New Face in the World of AI | KAINDLY Insights`
- Canonical URL: `https://www.kaindly.ai/insights/exclusion-and-inequity/`
- Open Graph type: `article`
- Meta description: `How gatekeeping, safety gaps, and unequal permission to experiment are shaping who gains power from AI.`
- Use the existing KAINDLY social image and Twitter card conventions.

## Responsive and Accessible Behavior

- Maintain semantic `<article>`, `<header>`, and heading hierarchy.
- Keep body text within a readable line length on wide screens.
- Preserve visible focus states and keyboard navigation for the Insights card and article back link.
- Ensure headings, pull quotes, and paragraphs wrap without horizontal overflow on phones.
- Initialize the global newsletter popover exactly once and load the Typeform script exactly once.

## Verification

Automated checks will confirm:

- The new article file and route exist.
- The existing preview card links to the new article and reads “Read Article.”
- All supplied sections, key paragraphs, emphasized question, and closing are present.
- The two copied platform labels are absent.
- Metadata, canonical URL, navigation landmarks, newsletter embed, and local links are complete.

Browser checks will confirm the article renders cleanly at desktop and phone widths, the preview-card link opens the article, the pull quotes remain readable, and neither page has horizontal overflow or browser errors. After local verification, publish to `main`, wait for GitHub Pages, and verify the public Insights index and article route.
