# Kaindly Website Rebuild Design

## Objective

Rebuild Kaindly as a polished, dependable five-page website that can be connected to GitHub and deployed quickly. Preserve the existing brand system, strongest prepared copy, and approved page structure while replacing the current browser-compiled prototype with production-ready static files.

## Success Criteria

- The site includes Home, The Kaindly Collective, Insights, About, and Contact.
- It works on modern desktop and mobile browsers without browser-side compilation.
- Every primary booking action opens Kaindly's Acuity scheduler.
- Contact provides the general Acuity scheduling experience plus a direct-booking fallback.
- Navigation, typography, contrast, focus states, and semantic structure are accessible.
- All internal links and essential assets work when hosted from GitHub or another static host.
- The site has page-specific titles, descriptions, social metadata, and a favicon.
- The final project has a simple local preview and build/check workflow documented for handoff.

## Architecture

Use a portable, multi-page static architecture with one HTML entry point per page and shared CSS and JavaScript. Home lives at the project root; the other pages use directory-based routes so URLs remain readable. Shared assets live in a single assets directory.

The site will not require a database, authentication, framework runtime, or content-management system. Acuity remains responsible for availability, appointment selection, confirmations, and reminders. Insights will launch as a curated editorial page rather than a dynamic publishing platform.

## Visual Direction

Follow the official 14-page Kaindly 2026 Brand Guidelines and supplied logo kit:

- Build the site on light backgrounds. Violet `#634CC8` is the primary anchor, with periwinkle `#8C6EFC` and its stepped tints (`#C6B6FD` and `#E2DBFE`) supporting surfaces.
- Honeydew `#D4F489` and green `#468B2B` remain a fixed light/dark pair. Do not invent intermediate greens.
- Orange `#FBA956` is never tinted or used as a surface. It appears at most once per page, reserved for a high-intent action or moment.
- Prefer the official RGB SVG logo files for responsive web use. Use the primary logo for prominent brand representation, the secondary logo where horizontal space requires it, and the icon only in condensed contexts.
- Maintain logo clear space equal to the cap height of the “K.” Never stretch, rotate, recolor, shadow, gradient-fill, or otherwise alter the supplied marks.
- Use the supplied gradient as an atmospheric brand element, not generic interface decoration.
- Use Causten Bold for Title Case headings if licensed webfont files become available. For launch, use the prepared Jost fallback without representing it as the licensed font. Use Archivo Light Italic for Title Case subheads and accents, Archivo Regular for Title Case buttons, and Urbanist for sentence-case body text.
- Heading tracking is `-0.04em` with a tight `0.875` line height. Body tracking is `0.05em` with a `1.3` line height.
- Shapes, cards, controls, and images use the brand's restrained `5px` corner radius.
- Motion is limited to gentle entrance, hover, and menu transitions and respects reduced-motion preferences.
- Unavailable photography is replaced with deliberate brand compositions rather than unfinished image placeholders or low-quality crops.

## Shared Components

### Announcement and Navigation

Retain the mission announcement, official secondary logo, five primary destinations, and a prominent Book a Call action. Preserve the logo's required clear space. Desktop navigation remains horizontal. Mobile navigation uses an accessible disclosure menu with visible focus treatment, keyboard support, and scroll locking while open.

### Booking Actions

Use the supplied Acuity owner ID `38041134`. Standard Book a Call buttons open the direct scheduling URL in a new tab with safe link attributes. The Contact page loads the supplied general scheduling bar script and also presents the direct scheduling button if the embed is unavailable or blocked.

### Footer

Use the official tagline lockup or approved white logo variation with the tagline, primary page links, booking access, and current copyright information. Avoid duplicate or inconsistent Kaindly spelling.

## Page Design

### Home

Lead with “Lead AI. Don't Chase It.” and a clear statement about helping individuals and organizations shape their AI future with confidence. Present the Kaindly system, the anxiety-to-advantage progression, the access-centered belief statement, the case for equitable AI adoption, and a final scheduling invitation. Reduce repeated copy and keep one dominant action per section.

### The Kaindly Collective

Position the Collective as a sustained AI-fluency community rather than a conventional course. Explain who it serves, the 90-day transformation, membership experience, learning pathways, and what participants receive. Remove expired or unverified enrollment deadlines and avoid unsupported pricing. Join actions route to scheduling until a separate checkout or enrollment URL is provided.

### Insights

Create an editorial landing page with a featured insight and aligned article cards drawn from the supplied concepts. Category controls operate as lightweight in-page filters. Articles without full source content are clearly presented as previews and do not lead to broken detail pages.

### About

Introduce the people and purpose near the top, then explain why Kaindly exists and how its values show up in practice. Present Barbara Salami and Leanna Baker Williams as co-founders using the supplied biographies. Until original headshots are provided, use premium branded identity panels rather than extracting low-resolution portraits from a reference screenshot.

### Contact

Make scheduling the primary purpose of the page. Explain what to expect from an advisory intake conversation, load the general Acuity booking bar, and provide a visually prominent direct Schedule Appointment fallback. Do not include a redundant contact form.

## Content and Interaction Rules

- Use consistent Title Case for headings and buttons and sentence case for body copy.
- Keep language inclusive of professionals, leaders, students, and other motivated learners where appropriate.
- Avoid invented testimonials, clients, performance claims, dates, prices, and article details.
- External scheduler links open in a new tab; internal links remain in the same tab.
- JavaScript enhances navigation, filters, reveal motion, and the Acuity integration, but core content and links remain usable if JavaScript fails.

## Error Handling and Resilience

- The direct Acuity URL remains visible if the embedded scheduling script is blocked.
- Missing optional images do not collapse layouts because visual panels have branded CSS fallbacks.
- Navigation and page content remain available without JavaScript.
- External font loading uses sensible local fallbacks so text remains legible during network failures.
- There are no client-side forms that can silently lose submissions.

## Accessibility and Responsive Behavior

Use semantic landmarks, a skip link, descriptive page titles, meaningful link text, labeled controls, visible focus indicators, sufficient color contrast, and decorative-image handling. Layouts adapt at desktop, tablet, and small-phone widths. Touch targets remain comfortably sized. Motion is disabled when the visitor requests reduced motion.

## Verification

Before handoff:

- Validate the HTML structure and JavaScript syntax.
- Check every internal link and local asset path.
- Confirm all five pages return successfully in a local static preview.
- Confirm both supplied Acuity integration URLs and scripts are present in the intended locations.
- Check for placeholder copy, broken references, horizontal overflow, and missing accessibility labels.
- Review the responsive layout at representative mobile and desktop sizes when browser verification is available.

## Deployment and GitHub Handoff

Initialize a Git repository in the workspace, keep source files at the repository root, and include a concise README with preview and deployment guidance. The site remains compatible with GitHub Pages and conventional static hosts. Connecting a remote repository, pushing, and configuring a custom domain happen after the user supplies or selects the GitHub destination.

## Deferred Work

- A full article publishing system or CMS.
- Individual article detail pages without approved source content.
- Membership checkout until a destination URL and offer details are provided.
- Original founder photography until source-quality images are supplied.
- Analytics, newsletter capture, and custom-domain configuration until the relevant accounts or requirements are available.
