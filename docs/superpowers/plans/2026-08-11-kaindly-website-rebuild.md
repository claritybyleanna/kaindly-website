# Kaindly Website Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a production-ready five-page Kaindly website with resilient Acuity scheduling and portable GitHub Pages hosting.

**Architecture:** Create a dependency-free multi-page static site with one directory-based HTML entry point per page, shared CSS, and a small progressive-enhancement JavaScript module. Copy official RGB SVG marks and the supplied gradient into a focused web asset directory. Use Node's built-in test runner for structural, link, asset, accessibility-smoke, and booking-integration checks.

**Tech Stack:** Semantic HTML5, modern CSS, vanilla JavaScript, Node.js built-in test runner, Acuity Scheduling embed.

## Global Constraints

- Pages: Home, The Kaindly Collective, Insights, About, and Contact.
- Booking owner ID: `38041134`.
- Primary palette: violet `#634CC8`, periwinkle `#8C6EFC`, periwinkle tints `#C6B6FD` and `#E2DBFE`, honeydew `#D4F489`, green `#468B2B`, orange `#FBA956`, charcoal `#242424`, grey `#DBD9E0`.
- Orange appears at most once per page and is never tinted or used as a surface.
- Use only official supplied logo files, preserve proportions and clear space, and do not add effects.
- Headings use Jost as the launch fallback for Causten; subheads/buttons use Archivo; body copy uses Urbanist.
- Shapes, controls, cards, and images use the brand's `5px` radius.
- Internal navigation works without JavaScript; scheduling always retains a direct-link fallback.
- Do not invent testimonials, clients, dates, prices, claims, or article details.
- Respect `prefers-reduced-motion` and maintain visible keyboard focus.

---

## File Structure

- `index.html` — Home page and canonical site entry.
- `collective/index.html` — The Kaindly Collective page.
- `insights/index.html` — Editorial resource landing page.
- `about/index.html` — Founders, purpose, and values.
- `contact/index.html` — Acuity scheduling experience and fallback.
- `assets/css/site.css` — Brand tokens, shared components, page layouts, responsive behavior.
- `assets/js/site.js` — Mobile navigation, reveal enhancement, and Insights filtering.
- `assets/brand/` — Official web logos, icon, tagline lockup, and gradient.
- `tests/site.test.mjs` — Static structure, links, assets, metadata, accessibility-smoke, and Acuity checks.
- `package.json` — Dependency-free check command and project metadata.
- `.nojekyll` — Direct static serving on GitHub Pages.
- `README.md` — Preview, verification, GitHub, and publishing handoff.

### Task 1: Verification Harness and Official Assets

**Files:**
- Create: `package.json`
- Create: `tests/site.test.mjs`
- Create: `.nojekyll`
- Copy: official RGB SVG/PNG and gradient files into `assets/brand/`

**Interfaces:**
- Produces: `npm test`, the `pageFiles` route map, and stable asset names used by every page.

- [ ] **Step 1: Write the failing structural test**

Create a Node test that requires all five page files, `assets/css/site.css`, `assets/js/site.js`, and official brand assets. It must also assert that every page has one `<main>`, a skip link, a unique `<title>`, a meta description, viewport metadata, and no `image-slot`, `TODO`, `TBD`, or `text/babel` content.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const pageFiles = ["index.html", "collective/index.html", "insights/index.html", "about/index.html", "contact/index.html"];

test("all production pages and shared assets exist", () => {
  for (const file of [...pageFiles, "assets/css/site.css", "assets/js/site.js", "assets/brand/logo-secondary-violet.svg", "assets/brand/icon-violet.svg", "assets/brand/tagline-white.svg", "assets/brand/gradient.png"]) {
    assert.equal(existsSync(file), true, `${file} is missing`);
  }
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`

Expected: FAIL because the production pages and focused asset paths do not exist.

- [ ] **Step 3: Add the test command and official assets**

Create `package.json` with `"test": "node --test tests/site.test.mjs"`, add `.nojekyll`, and copy only the official digital assets needed by the site. Do not modify logo files.

- [ ] **Step 4: Run the asset test**

Run: `npm test`

Expected: Asset assertions pass; page assertions still fail until page tasks are complete.

- [ ] **Step 5: Commit**

```bash
git add package.json tests/site.test.mjs .nojekyll assets/brand
git commit -m "test: establish Kaindly site verification"
```

### Task 2: Shared System and Home Page

**Files:**
- Create: `assets/css/site.css`
- Create: `assets/js/site.js`
- Create: `index.html`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Produces: shared `.site-header`, `.site-nav`, `.button`, `.section`, `.card`, `.site-footer`, `[data-menu-toggle]`, `[data-menu]`, and `[data-reveal]` contracts consumed by all later pages.

- [ ] **Step 1: Add failing Home and shared-shell assertions**

Require Home to contain the approved headline, mission announcement, all five navigation destinations, `aria-current="page"`, a direct Acuity link, semantic header/nav/main/footer landmarks, the approved shared stylesheet/script paths, and page-specific social metadata.

- [ ] **Step 2: Run the targeted test**

Run: `npm test -- --test-name-pattern="Home|shared"`

Expected: FAIL because the Home page and shared assets are absent.

- [ ] **Step 3: Implement shared design tokens and responsive components**

Define the exact brand colors, typography roles, 5px radius, focus ring, spacing scale, light-first surfaces, responsive navigation, reusable grids, buttons, cards, editorial treatments, footer, and reduced-motion behavior. Keep optional JavaScript progressive: toggle menu state with `aria-expanded`, close on Escape and link activation, and add an `.is-visible` class only when IntersectionObserver exists.

- [ ] **Step 4: Build Home**

Create the announcement, accessible shared navigation, gradient hero, Kaindly system cards, anxiety-to-advantage path, access-opportunity statement, equitable-adoption case, and final booking invitation. Use one orange booking action in the hero and violet actions elsewhere.

- [ ] **Step 5: Run tests and syntax checks**

Run: `npm test && node --check assets/js/site.js`

Expected: Home/shared tests pass and JavaScript parses successfully.

- [ ] **Step 6: Commit**

```bash
git add index.html assets/css/site.css assets/js/site.js tests/site.test.mjs
git commit -m "feat: rebuild Kaindly home experience"
```

### Task 3: The Kaindly Collective

**Files:**
- Create: `collective/index.html`
- Modify: `assets/css/site.css`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: the shared navigation, cards, buttons, footer, and booking URL.
- Produces: Collective route with stable `#experience`, `#transformation`, and `#pathways` sections.

- [ ] **Step 1: Add failing Collective assertions**

Require the page title, active navigation state, “Your AI Future Starts With You,” “Not a course. A living ecosystem.”, five learning pathways, a direct Acuity action, and the absence of prices or expired enrollment dates.

- [ ] **Step 2: Run the targeted test**

Run: `npm test -- --test-name-pattern="Collective"`

Expected: FAIL because `collective/index.html` is absent.

- [ ] **Step 3: Implement the Collective page**

Build a confident editorial hero, audience qualification cards, a side-by-side current-state/90-day transformation, membership experience, five pathway cards, and a booking invitation. Keep dark sections subordinate to the light-first system and use periwinkle/honeydew for dark-surface contrast.

- [ ] **Step 4: Run all tests**

Run: `npm test`

Expected: Home and Collective checks pass; remaining page checks are pending.

- [ ] **Step 5: Commit**

```bash
git add collective/index.html assets/css/site.css tests/site.test.mjs
git commit -m "feat: build Kaindly Collective page"
```

### Task 4: Insights Page and Filtering

**Files:**
- Create: `insights/index.html`
- Modify: `assets/css/site.css`
- Modify: `assets/js/site.js`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Produces: buttons with `[data-filter]` and cards with `[data-insight-card][data-category]`; shared JavaScript sets `hidden` and `aria-pressed` without changing URLs.

- [ ] **Step 1: Add failing Insights assertions**

Require one featured insight, three approved preview cards, category filter buttons, `aria-pressed`, matching category tokens, and no links to nonexistent article detail pages.

- [ ] **Step 2: Run the targeted test**

Run: `npm test -- --test-name-pattern="Insights"`

Expected: FAIL because the route and filter contracts do not exist.

- [ ] **Step 3: Implement editorial layout and filters**

Build the featured panel, filter rail, aligned card grid, dates already present in the supplied concept, and non-clicking “Preview” labels for unavailable articles. In `site.js`, activate one filter at a time, update `aria-pressed`, and toggle each card's `hidden` property based on exact category match or `all`.

- [ ] **Step 4: Run tests and syntax checks**

Run: `npm test && node --check assets/js/site.js`

Expected: Insights contracts and JavaScript syntax pass.

- [ ] **Step 5: Commit**

```bash
git add insights/index.html assets/css/site.css assets/js/site.js tests/site.test.mjs
git commit -m "feat: create Kaindly insights experience"
```

### Task 5: About and Contact Scheduling

**Files:**
- Create: `about/index.html`
- Create: `contact/index.html`
- Modify: `assets/css/site.css`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: shared shell and official logo/icon assets.
- Produces: founder identity panels and the canonical Contact scheduling experience.

- [ ] **Step 1: Add failing About and Contact assertions**

Require both co-founder names and roles, the approved purpose/value sections, Contact's Acuity booking-bar markup, `https://embed.acuityscheduling.com/embed/bar/38041134.js`, and the direct `owner=38041134` fallback with safe new-tab attributes.

- [ ] **Step 2: Run targeted tests**

Run: `npm test -- --test-name-pattern="About|Contact|Acuity"`

Expected: FAIL because both routes are absent.

- [ ] **Step 3: Implement About**

Build a founder-first hero, two accessible co-founder profiles using brand identity panels, “Why Kaindly,” and three values-in-practice cards. Use the supplied biographies without inventing credentials.

- [ ] **Step 4: Implement Contact**

Build the scheduling hero, expectation steps, supplied hidden Acuity booking bar, asynchronous bar script, direct Schedule Appointment fallback button, and a concise privacy/third-party note. Do not add a contact form.

- [ ] **Step 5: Run all tests**

Run: `npm test && node --check assets/js/site.js`

Expected: All five pages, brand asset, semantic, link, and Acuity tests pass.

- [ ] **Step 6: Commit**

```bash
git add about/index.html contact/index.html assets/css/site.css tests/site.test.mjs
git commit -m "feat: add Kaindly about and scheduling pages"
```

### Task 6: Full Verification and GitHub Handoff

**Files:**
- Create: `README.md`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Produces: final verification report through `npm test` and concise publishing instructions.

- [ ] **Step 1: Complete link and metadata tests**

Parse every local `href` and `src`, resolve paths from each page directory, and assert the target exists. Require exactly one active navigation item per page, unique titles/descriptions, canonical URL paths, alt text on meaningful images, safe external links, and the absence of development CDN/compiler references.

- [ ] **Step 2: Run the complete automated check**

Run: `npm test && node --check assets/js/site.js`

Expected: PASS with zero missing files, broken internal links, booking regressions, syntax errors, or structural failures.

- [ ] **Step 3: Preview every route over HTTP**

Run a retained local static server and request `/`, `/collective/`, `/insights/`, `/about/`, `/contact/`, `assets/css/site.css`, and `assets/js/site.js`.

Expected: HTTP 200 for every route and shared asset.

- [ ] **Step 4: Write the handoff README**

Document the five routes, Acuity integration, official brand source, `npm test`, local preview, GitHub remote commands, GitHub Pages setup, and deferred inputs (headshots, checkout URL, article content, analytics, and custom domain).

- [ ] **Step 5: Review the final diff and repository status**

Run: `git diff --check && git status -sb && git log --oneline --decorate -8`

Expected: No whitespace errors; only intended final files are staged or committed.

- [ ] **Step 6: Commit**

```bash
git add README.md tests/site.test.mjs
git commit -m "docs: add Kaindly publishing handoff"
```
