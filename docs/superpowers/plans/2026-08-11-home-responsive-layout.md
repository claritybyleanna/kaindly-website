# KAINDLY Home Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformat the Home assessment CTA and KAINDLY System so the CTA is compact, five reference-style product cards share one desktop row, and both systems stack vertically on phones.

**Architecture:** Keep the existing static HTML and shared stylesheet architecture. Add semantic metadata inside the existing five product articles, replace the obsolete Home Typeform layout hook with a dedicated CTA hook, and define explicit large-desktop, tablet, and phone grid behavior in `assets/css/site.css`.

**Tech Stack:** HTML5, CSS Grid/Flexbox, Node.js built-in test runner, Playwright browser verification, GitHub Pages

## Global Constraints

- Preserve the existing product order, titles, descriptions, trademark marks, assessment link, and unrelated Home content.
- Use the supplied card hierarchy with KAINDLY's white, violet, periwinkle, lavender, honeydew, orange, and muted-grey palette.
- Large desktop (`min-width: 1180px`) uses five equal product columns.
- Tablet (`681px` through `1179px`) uses two readable product columns and a horizontal four-stage line.
- Phone (`max-width: 680px`) uses one product column, a vertical four-stage line, and a one-column assessment CTA.
- Do not introduce dependencies, JavaScript behavior, a build step, or horizontal overflow.

---

## File Structure

- `index.html` — dedicated assessment layout hook and semantic card metadata/badges.
- `assets/css/site.css` — compact CTA layout, reference-style card hierarchy, and responsive grid rules.
- `tests/site.test.mjs` — HTML and CSS contracts for the approved structure and breakpoints.

---

### Task 1: Add the Approved Home Content Structure

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `index.html:75-124`

**Interfaces:**
- Consumes: Existing `.home-assessment`, `.system-grid`, and five `.system-card` elements.
- Produces: `.home-assessment-layout`, `.card-category`, `.card-description`, `.card-tags`, `.card-tag--primary`, and `.card-tag--secondary` hooks consumed by Task 2.

- [ ] **Step 1: Write the failing HTML structure test**

Add this test after the Home assessment test:

```js
test("Home exposes the approved assessment and five-card structure", () => {
  const home = readFileSync("index.html", "utf8");
  assert.match(home, /class="container home-assessment-layout"/);
  assert.doesNotMatch(home, /class="container typeform-layout"/);

  const cards = home.match(/<article class="system-card"[\s\S]*?<\/article>/g) || [];
  assert.equal(cards.length, 5);

  const categories = [
    "Assessment · Diagnostic",
    "Discovery · Workflow Mapping",
    "Enterprise · Bespoke Programs",
    "Training · Cohort-Based",
    "Community · Sustained Fluency",
  ];
  const badges = [
    "Enterprise",
    "Individual",
    "Enterprise Only",
    "Enterprise Cohorts",
    "Open Enrollment",
    "Organizational Access",
    "Individual Membership",
  ];

  for (const category of categories) assert.match(home, new RegExp(category.replace("·", "\\s*·\\s*")));
  for (const badge of badges) assert.match(home, new RegExp(`>${badge}<`));
  for (const card of cards) {
    assert.match(card, /class="card-category"/);
    assert.match(card, /class="card-description"/);
    assert.match(card, /class="card-tags"/);
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --test-name-pattern="approved assessment and five-card structure"`

Expected: FAIL because Home still uses `typeform-layout` and the product metadata is absent.

- [ ] **Step 3: Add the dedicated CTA hook and card metadata**

Change the assessment container to:

```html
<div class="container home-assessment-layout">
```

Within each product card, keep the existing number and heading, then add the corresponding category before the existing description. Give the description `class="card-description"` and append the supplied badges as a noninteractive list. Card 1 is the reference pattern:

```html
<article class="system-card" data-reveal>
  <span class="card-number">01</span>
  <h3>AI Readiness Spectrum&trade;</h3>
  <p class="card-category">Assessment <span aria-hidden="true">&middot;</span> Diagnostic</p>
  <p class="card-description">An 11-dimension diagnostic that shows where an individual or organization stands on the AI adoption curve, so the next move is grounded in evidence.</p>
  <ul class="card-tags" aria-label="Available for">
    <li class="card-tag card-tag--primary">Enterprise</li>
    <li class="card-tag card-tag--secondary">Individual</li>
  </ul>
</article>
```

Apply the exact metadata from the approved spec to cards 2–5.

- [ ] **Step 4: Run the focused and full tests**

Run: `npm test -- --test-name-pattern="approved assessment and five-card structure"`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the structural change**

```bash
git add index.html tests/site.test.mjs
git commit -m "feat: structure Home product cards"
```

---

### Task 2: Implement the Approved Responsive Presentation

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `assets/css/site.css:502-570,1272-1286,2020-2110`

**Interfaces:**
- Consumes: The HTML hooks produced by Task 1.
- Produces: Five-column desktop, two-column tablet, one-column phone, vertical phone stage line, and compact CTA behavior.

- [ ] **Step 1: Write the failing stylesheet contract test**

Add this test after the Home structure test:

```js
test("Home stylesheet defines the approved responsive grids", () => {
  const css = readFileSync("assets/css/site.css", "utf8");
  assert.match(css, /\.home-assessment-layout\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/);
  assert.match(css, /\.system-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*1179px\)[\s\S]*?\.system-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*?\.stage-rail\s*{[^}]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*?\.system-grid\s*{[^}]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*?\.home-assessment-layout\s*{[^}]*grid-template-columns:\s*1fr;/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --test-name-pattern="approved responsive grids"`

Expected: FAIL because the current stylesheet defines a six-column 3+2 card layout and a two-column phone stage line.

- [ ] **Step 3: Implement the compact CTA**

Replace the Home-specific use of `.typeform-layout` with:

```css
.home-assessment {
  padding-block: 72px;
}

.home-assessment-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(48px, 10vw, 160px);
}

.home-assessment-layout .section-heading {
  max-width: 700px;
  margin-bottom: 0;
}

.home-assessment-action {
  justify-self: end;
}
```

Keep `.typeform-layout` for any non-Home embedded forms that still use it.

- [ ] **Step 4: Implement the reference-style five-card grid**

Define the large-desktop grid and card internals:

```css
.system-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: stretch;
  gap: 16px;
}

.system-card {
  display: flex;
  min-width: 0;
  min-height: 470px;
  flex-direction: column;
  padding: 26px 22px;
}

.card-number::after {
  display: block;
  width: 46px;
  height: 3px;
  margin-top: 16px;
  background: var(--periwinkle);
  content: "";
}

.card-category {
  min-height: 2.6em;
  color: var(--violet);
  font-family: var(--font-accent);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.card-description {
  margin-bottom: 28px;
  color: var(--muted);
  font-size: 0.86rem;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: auto 0 0;
  padding: 0;
  list-style: none;
}

.card-tag {
  padding: 6px 8px;
  border: 1px solid var(--periwinkle-50);
  border-radius: 3px;
  color: var(--violet);
  font-family: var(--font-accent);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-tag--primary {
  border-color: var(--honeydew);
  background: var(--honeydew-50);
}
```

Remove the old six-column spans and fourth/fifth-card placement overrides.

- [ ] **Step 5: Implement tablet and phone behavior**

Add the tablet grid before the existing `1040px` media query:

```css
@media (max-width: 1179px) {
  .system-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .system-card:last-child {
    grid-column: 1 / -1;
    width: calc(50% - 8px);
    justify-self: center;
  }
}
```

Add the approved phone behavior at `680px`:

```css
@media (max-width: 680px) {
  .home-assessment { padding-block: 64px; }
  .home-assessment-layout { grid-template-columns: 1fr; gap: 30px; }
  .home-assessment-action { justify-self: start; }
  .stage-rail { grid-template-columns: 1fr; }
  .system-grid { grid-template-columns: 1fr; }
  .system-card,
  .system-card:last-child {
    grid-column: auto;
    width: 100%;
    min-height: 0;
  }
  .system-card h3,
  .card-category { min-height: 0; }
}
```

Remove or supersede the conflicting `1040px` card span rules and `640px` two-column stage rule.

- [ ] **Step 6: Run focused and full automated verification**

Run: `npm test -- --test-name-pattern="approved responsive grids"`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Verify computed browser layouts**

Serve the repository locally, then use Playwright at widths `1440`, `900`, and `390`. Verify:

- `1440`: `.system-grid` has five computed columns and all five cards share the same top coordinate.
- `900`: `.system-grid` has two computed columns and the stage line has four columns.
- `390`: `.system-grid`, `.stage-rail`, and `.home-assessment-layout` each have one computed column; the assessment button follows the copy; no horizontal overflow.
- All widths: five cards, complete metadata, and no browser console errors.

- [ ] **Step 8: Commit the responsive styling**

```bash
git add assets/css/site.css tests/site.test.mjs
git commit -m "fix: align Home layouts across screen sizes"
```

---

### Task 3: Publish and Verify GitHub Pages

**Files:**
- No file changes

**Interfaces:**
- Consumes: The tested Home structure and responsive stylesheet.
- Produces: The corrected public Home page on the existing GitHub Pages deployment.

- [ ] **Step 1: Run final repository verification**

Run: `npm test`

Expected: all tests PASS.

Run: `git diff --check`

Expected: no output and exit code `0`.

Run: `git status -sb`

Expected: clean `main`, ahead of `origin/main` only by the intended commits.

- [ ] **Step 2: Push the approved commits**

Run: `git push origin main`

- [ ] **Step 3: Wait for Pages and verify the public Home page**

Confirm the latest `pages-build-deployment` run succeeds. Request the public Home route and verify HTTP `200`, all five card categories and the assessment link. Perform desktop and phone browser checks confirming the same computed columns and no horizontal overflow.
