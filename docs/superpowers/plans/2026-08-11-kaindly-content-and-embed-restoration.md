# KAINDLY Content and Embed Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the complete Collective offer, publish the AI Readiness Assessment and KAINDLY Standards article, and add working Typeform and Acuity embeds to Home and Contact.

**Architecture:** Keep the existing multi-page static architecture: one semantic HTML file per route, one shared stylesheet, and the current lightweight JavaScript enhancements. External services remain isolated behind their official embeds and direct fallback links, while Node’s built-in test runner verifies copy, routes, embed IDs, external-link safety, and local-path integrity.

**Tech Stack:** HTML5, shared CSS, ES modules, Node.js built-in test runner, Typeform embeds, Acuity Scheduling embeds, GitHub Pages

## Global Constraints

- Preserve the working static site shell, five-item primary navigation, shared header/footer, accessibility, responsive behavior, and existing content not named for replacement.
- Use `Kaindly website redesign/site/collective.jsx` as the source of truth for the Collective’s complete content and section order.
- Send every membership action to `https://kaindly.circle.so/checkout/founding-member` in a new tab with `rel="noopener noreferrer"`.
- Send assessment actions to the internal `/assessment/` route.
- Use HTTPS for Typeform and Acuity scripts and provide visible direct fallbacks for every iframe or Typeform.
- Publish “How We Show Up” verbatim as the KAINDLY Standards article; do not include the replaced “Lead AI. Don’t Chase It.” draft.
- Do not add a framework, build step, CMS, database, analytics, or new dependency.

---

## File Structure

- `collective/index.html` — complete Collective membership journey, checkout actions, comparison pricing, and assessment path.
- `assessment/index.html` — dedicated AI Readiness Assessment route and Typeform embed.
- `index.html` — existing Home content plus the supplied Home Typeform section.
- `contact/index.html` — inline Acuity scheduler, message Typeform, assessment card, and fallbacks.
- `insights/index.html` — existing editorial index with a working KAINDLY Standards card.
- `insights/kaindly-standards/index.html` — semantic “How We Show Up” article.
- `assets/css/site.css` — shared responsive styles for Typeform containers, restored Collective blocks, inline scheduling, and editorial article layout.
- `tests/site.test.mjs` — route, content, embed, accessibility, metadata, and link-resolution regression tests.
- `README.md` — seven-route and embed documentation.

---

### Task 1: Restore the Complete Collective Offer

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `collective/index.html`
- Modify: `assets/css/site.css`

**Interfaces:**
- Consumes: Existing shared page shell and the supplied `Kaindly website redesign/site/collective.jsx` source.
- Produces: A complete `/collective/` page whose checkout links use the Circle URL and whose assessment actions use `../assessment/`.

- [ ] **Step 1: Replace the unsupported-claims test with restoration assertions**

Update the Collective test so it proves the restored offer rather than rejecting its price:

```js
test("Collective preserves the complete approved membership offer", () => {
  const html = readFileSync("collective/index.html", "utf8");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const circleUrl = "https://kaindly.circle.so/checkout/founding-member";

  assert.match(visibleText, /Enrollment Now Open/);
  assert.match(visibleText, /\$97\/month/);
  assert.match(visibleText, /Cancel anytime/);
  assert.equal((html.match(/data-audience-card/g) || []).length, 6);
  assert.equal((html.match(/data-benefit/g) || []).length, 5);
  assert.equal((html.match(/data-pathway/g) || []).length, 5);
  for (const price of ["$2,000+", "$500+", "$300+", "$97/month"]) {
    assert.match(visibleText, new RegExp(price.replace(/[+$]/g, "\\$&")));
  }
  assert.ok((html.match(new RegExp(circleUrl, "g")) || []).length >= 2);
  assert.match(html, /href="\.\.\/assessment\/"/);
  assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i);
});
```

- [ ] **Step 2: Run the Collective test and verify it fails**

Run: `npm test -- --test-name-pattern="Collective preserves"`

Expected: FAIL because the current page omits the enrollment label, price comparison, Circle URL, and assessment route.

- [ ] **Step 3: Restore the Collective markup and responsive presentation**

Translate every section from the JSX source into static semantic markup inside the existing `<main>`. Use explicit verification hooks on repeated units:

```html
<p class="enrollment-pill">Enrollment Now Open</p>
<p class="membership-price"><strong>$97/month</strong> · Cancel anytime</p>
<a class="button button--accent" href="https://kaindly.circle.so/checkout/founding-member" target="_blank" rel="noopener noreferrer">Join The Collective</a>

<article class="content-card" data-audience-card><h3>You Want Depth.</h3><p>You want frameworks for your actual work, not another surface-level demo or list of tips.</p></article>
<article class="content-card" data-audience-card><h3>Your Experience Matters.</h3><p>Your domain knowledge and judgment are what make AI useful. The goal is amplification, not replacement.</p></article>
<article class="content-card" data-audience-card><h3>You Want to Lead.</h3><p>You are building fluency so you can guide a team, advise a client or classmate, and bring clarity to the noise.</p></article>
<article class="content-card" data-audience-card><h3>You Are Done Learning Alone.</h3><p>You want peers who understand the stakes and a place to practice, troubleshoot, and grow together.</p></article>
<article class="content-card" data-audience-card><h3>You Value Capability.</h3><p>You know the difference between consuming content and building something real, useful, and lasting.</p></article>
<article class="content-card" data-audience-card><h3>You Are Ready to Begin.</h3><p>You are not waiting for a perfect mandate. You are ready to take the next thoughtful step now.</p></article>

<article class="feature-card" data-benefit><h3>Curated Learning Pathways</h3></article>
<article class="feature-card" data-benefit><h3>A Growing Prompt Library</h3></article>
<article class="feature-card" data-benefit><h3>Visible Progression</h3></article>
<article class="feature-card" data-benefit><h3>Practice in Community</h3></article>
<article class="feature-card" data-benefit><h3>Access to the Founders</h3></article>

<article class="pathway-row" data-pathway><h3>Decide</h3></article>
<article class="pathway-row" data-pathway><h3>Communicate</h3></article>
<article class="pathway-row" data-pathway><h3>Operate</h3></article>
<article class="pathway-row" data-pathway><h3>Build</h3></article>
<article class="pathway-row" data-pathway><h3>Lead</h3></article>

<div class="value-row"><span>Industry Conference</span><strong>$2,000+</strong></div>
<div class="value-row"><span>Executive Coaching</span><strong>$500+</strong></div>
<div class="value-row"><span>Online Course Bundle</span><strong>$300+</strong></div>
<div class="value-row value-row--featured"><span>The KAINDLY Collective</span><strong>$97/month</strong></div>

<a class="text-link" href="../assessment/">Take the AI Readiness Assessment</a>
```

Add scoped CSS for `.enrollment-pill`, `.membership-price`, `.value-comparison`, `.value-row`, and the assessment banner. Reuse existing grids, cards, buttons, colors, focus treatments, and breakpoints.

- [ ] **Step 4: Run the Collective test and full suite**

Run: `npm test -- --test-name-pattern="Collective preserves"`

Expected: PASS.

Run: `npm test`

Expected: PASS with no regressions.

- [ ] **Step 5: Commit the Collective restoration**

```bash
git add collective/index.html assets/css/site.css tests/site.test.mjs
git commit -m "feat: restore complete Collective offer"
```

---

### Task 2: Add the Assessment Route and Home Typeform

**Files:**
- Create: `assessment/index.html`
- Modify: `index.html`
- Modify: `assets/css/site.css`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: Shared header/footer shell and Typeform’s `data-tf-live` initialization contract.
- Produces: `/assessment/`, Home embed ID `01KJ3V41DCC0V9P0VT0T97XK4E`, and assessment embed ID `01KJ3TB8AV4EBVV6P51RE768EB`.

- [ ] **Step 1: Add the new route and Typeform assertions**

Append `['assessment/index.html', '/assessment/']` to `pageFiles` and add:

```js
test("Home and Assessment expose the supplied Typeforms with fallbacks", () => {
  const home = readFileSync("index.html", "utf8");
  const assessment = readFileSync("assessment/index.html", "utf8");

  assert.match(home, /data-tf-live="01KJ3V41DCC0V9P0VT0T97XK4E"/);
  assert.match(home, /https:\/\/form\.typeform\.com\/to\/V6UyKfJp/);
  assert.equal((home.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
  assert.match(assessment, /data-tf-live="01KJ3TB8AV4EBVV6P51RE768EB"/);
  assert.match(assessment, /https:\/\/form\.typeform\.com\/to\/V6UyKfJp/);
  assert.equal((assessment.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
});
```

Inside the existing metadata loop, replace the unconditional active-navigation assertion with:

```js
const expectedCurrentLinks = file === "assessment/index.html" ? 0 : 1;
assert.equal((html.match(/aria-current="page"/g) || []).length, expectedCurrentLinks, `${file} has an incorrect active navigation state`);
```

- [ ] **Step 2: Run the new Typeform test and verify it fails**

Run: `npm test -- --test-name-pattern="Home and Assessment"`

Expected: FAIL because `assessment/index.html` and both embed sections are absent.

- [ ] **Step 3: Build the Assessment page and add the Home section**

Create `assessment/index.html` by adapting the existing page shell. Set unique metadata and leave the five primary navigation links unmarked because Assessment is not one of those destinations. In the global metadata test, set the expected `aria-current="page"` count to zero for `assessment/index.html` and one for every other route. Use:

```html
<section class="assessment-hero">
  <div class="container section-heading section-heading--center">
    <p class="eyebrow">AI Readiness Assessment</p>
    <h1>Find Your Clearest Starting Point.</h1>
    <p>Take ten minutes to reflect on where you are today and identify a practical next step.</p>
  </div>
</section>
<section class="section typeform-section">
  <div class="container typeform-panel">
    <div data-tf-live="01KJ3TB8AV4EBVV6P51RE768EB"></div>
    <p class="embed-fallback">If the assessment does not load, <a href="https://form.typeform.com/to/V6UyKfJp" target="_blank" rel="noopener noreferrer">open it directly in Typeform</a>.</p>
  </div>
</section>
<script src="https://embed.typeform.com/next/embed.js" async></script>
```

Insert the Home section immediately after `.hero-home`:

```html
<section class="section section--lavender home-assessment">
  <div class="container typeform-layout">
    <div class="section-heading"><p class="eyebrow">Start With Clarity</p><h2>Where Do You Stand With AI?</h2><p>Use this short assessment to identify your current starting point and the next capability worth building.</p></div>
    <div class="typeform-panel"><div data-tf-live="01KJ3V41DCC0V9P0VT0T97XK4E"></div><p class="embed-fallback">If the form does not load, <a href="https://form.typeform.com/to/V6UyKfJp" target="_blank" rel="noopener noreferrer">open it directly in Typeform</a>.</p></div>
  </div>
</section>
<script src="https://embed.typeform.com/next/embed.js" async></script>
```

Add `.typeform-layout`, `.typeform-panel`, `.typeform-panel [data-tf-live]`, `.embed-fallback`, and `.assessment-hero` styles with a stable minimum embed height and a one-column mobile breakpoint.

- [ ] **Step 4: Run the Typeform test and full suite**

Run: `npm test -- --test-name-pattern="Home and Assessment"`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit the assessment experiences**

```bash
git add assessment/index.html index.html assets/css/site.css tests/site.test.mjs
git commit -m "feat: add AI readiness assessments"
```

---

### Task 3: Embed Scheduling and Messaging on Contact

**Files:**
- Modify: `contact/index.html`
- Modify: `assets/css/site.css`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: Acuity owner `38041134`, message Typeform ID `01KZS1XDVQMV2J1AP4SMMSTQZ6`, and the `/assessment/` route from Task 2.
- Produces: A resilient Contact page with inline scheduling, general booking bar, direct scheduler fallback, message embed, and assessment card.

- [ ] **Step 1: Replace the Contact regression test with embed assertions**

```js
test("Contact exposes embedded scheduling, messaging, and assessment paths", () => {
  const html = readFileSync("contact/index.html", "utf8");
  assert.match(html, /src="https:\/\/app\.acuityscheduling\.com\/schedule\.php\?owner=38041134&amp;ref=embedded_csp"/);
  assert.match(html, /title="Schedule Appointment"[^>]+width="100%"[^>]+height="800"[^>]+allow="payment"/);
  assert.equal((html.match(/https:\/\/embed\.acuityscheduling\.com\/js\/embed\.js/g) || []).length, 1);
  assert.match(html, /class="acuity-booking-bar" style="display: none;"/);
  assert.match(html, /owner=38041134&amp;ref=booking_button/);
  assert.match(html, /data-tf-live="01KZS1XDVQMV2J1AP4SMMSTQZ6"/);
  assert.match(html, /https:\/\/form\.typeform\.com\/to\/CLwbVZRw/);
  assert.equal((html.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
  assert.match(html, /Not Sure Where You Stand\?/);
  assert.match(html, /href="\.\.\/assessment\/"/);
});
```

- [ ] **Step 2: Run the Contact test and verify it fails**

Run: `npm test -- --test-name-pattern="Contact exposes embedded"`

Expected: FAIL because the page currently uses the button integration and has neither iframe nor message Typeform.

- [ ] **Step 3: Replace the scheduling panel and add the restored contact pathways**

Use a one-third/two-thirds `.contact-layout` and replace the booking panel with:

```html
<div class="scheduler-panel" data-reveal>
  <p class="eyebrow">Schedule With KAINDLY</p>
  <h2>Choose Your Time.</h2>
  <iframe src="https://app.acuityscheduling.com/schedule.php?owner=38041134&amp;ref=embedded_csp" title="Schedule Appointment" width="100%" height="800" frameborder="0" allow="payment"></iframe>
  <p class="embed-fallback">If scheduling does not load, <a href="https://app.acuityscheduling.com/schedule.php?owner=38041134&amp;ref=booking_button" target="_blank" rel="noopener noreferrer">open the direct scheduler</a>.</p>
</div>
```

Add a new section beneath scheduling:

```html
<section class="section section--soft">
  <div class="container contact-pathways">
    <article class="message-panel"><h2>Send Us a Message</h2><p>Tell us where you are and what you're working toward. We reply within two business days.</p><div data-tf-live="01KZS1XDVQMV2J1AP4SMMSTQZ6"></div><p class="embed-fallback">If the form does not load, <a href="https://form.typeform.com/to/CLwbVZRw" target="_blank" rel="noopener noreferrer">open it directly in Typeform</a>.</p></article>
    <aside class="assessment-card"><h2>Not Sure Where You Stand?</h2><p>Take the 10-minute AI Readiness Assessment and get a recommended starting point.</p><a class="text-link" href="../assessment/">Take the Assessment <span aria-hidden="true">→</span></a></aside>
  </div>
</section>
```

Load the Acuity inline embed script and the Typeform script once each with `async`. Remove the unused Acuity button stylesheet and button script, but retain the general booking-bar markup and script. Add `.scheduler-panel`, `.contact-pathways`, `.message-panel`, and `.assessment-card` styles and stack both grids at the existing tablet breakpoint.

- [ ] **Step 4: Run the Contact test and full suite**

Run: `npm test -- --test-name-pattern="Contact exposes embedded"`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit the Contact restoration**

```bash
git add contact/index.html assets/css/site.css tests/site.test.mjs
git commit -m "feat: embed scheduling and messaging"
```

---

### Task 4: Publish “How We Show Up” and Link KAINDLY Standards

**Files:**
- Create: `insights/kaindly-standards/index.html`
- Modify: `insights/index.html`
- Modify: `assets/css/site.css`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: Shared page shell and the user-supplied corrected article copy.
- Produces: `/insights/kaindly-standards/` and a working article card from `/insights/`.

- [ ] **Step 1: Add the article route and verbatim-copy regression test**

Append `['insights/kaindly-standards/index.html', '/insights/kaindly-standards/']` to `pageFiles`, change the Insights expectation to require `href="kaindly-standards/"`, and add:

```js
test("KAINDLY Standards publishes the corrected article verbatim", () => {
  const html = readFileSync("insights/kaindly-standards/index.html", "utf8");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(html, /<title>How We Show Up \| KAINDLY Standards<\/title>/);
  assert.match(visibleText, /These standards govern how we work—with clients, with each other, and in every decision we make\./);
  for (const opening of [
    "We do not shame uncertainty.",
    "We design for the least confident person in the room.",
    "We choose clarity over cleverness.",
    "We build confidence through practice, not proclamation.",
    "We challenge without diminishing.",
    "We resist the pressure to move before direction is clear.",
    "We measure by capability and outcomes, not adoption.",
  ]) assert.match(visibleText, new RegExp(opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(visibleText, /These standards are not negotiable\./);
  assert.match(visibleText, /They are how KAINDLY earns the right to guide/);
  assert.doesNotMatch(visibleText, /We lead AI\. We don.t chase it\./i);
});
```

- [ ] **Step 2: Run the Standards test and verify it fails**

Run: `npm test -- --test-name-pattern="KAINDLY Standards publishes"`

Expected: FAIL because the article route does not exist.

- [ ] **Step 3: Create the semantic article and link its Insights card**

Create the page with canonical URL `https://www.kaindly.ai/insights/kaindly-standards/`, unique social metadata, the shared shell, and this article structure:

```html
<article class="standards-article">
  <header class="article-header"><p class="eyebrow">KAINDLY Standards</p><h1>How We Show Up</h1><p class="article-deck">These standards govern how we work—with clients, with each other, and in every decision we make. They are not aspirations. They are commitments. They reflect what it means to be human-centered and outcomes-focused in practice.</p></header>
  <div class="article-body">
    <p><strong>We do not shame uncertainty.</strong> Hesitation is not weakness. Questions are not failure. We create space for people to learn without fear of judgment—because learning is the path to outcomes.</p>
    <p><strong>We design for the least confident person in the room.</strong> If our work leaves anyone behind, it is not finished. Accessibility is not a concession; it is a standard—and it expands capability across the entire organization. We believe that this is not about just filling a skill gap, but creating an equitable access opportunity.</p>
    <p><strong>We choose clarity over cleverness.</strong> If people are confused, the problem is ours. We translate complexity into language that can be understood, tested, and applied—because confusion delays outcomes.</p>
    <p><strong>We build confidence through practice, not proclamation.</strong> Real confidence grows from experience. We create opportunities to try, fail safely, and try again—because confidence is the bridge to competence.</p>
    <p><strong>We challenge without diminishing.</strong> High standards and human dignity are not in tension. We hold people accountable while preserving their sense of worth—because accountability without dignity produces compliance, not capability.</p>
    <p><strong>We resist the pressure to move before direction is clear.</strong> Speed without clarity is not leadership. We do not confuse motion with progress or urgency with importance—because misdirected speed delays outcomes.</p>
    <p><strong>We measure by capability and outcomes, not adoption.</strong> Success is not how many people have access to tools. It is how many can use them well—and what they produce as a result.</p>
    <footer class="standards-commitment"><p><em>These standards are not negotiable.</em></p><p><em>They are how KAINDLY earns the right to guide</em></p></footer>
  </div>
</article>
```

Wrap the Standards story card body with `<a class="story-card-link" href="kaindly-standards/">`, change its label to “Read Article,” and add `.standards-article`, `.article-header`, `.article-deck`, `.article-body`, `.standards-commitment`, and `.story-card-link` styles.

- [ ] **Step 4: Run the Standards test and full suite**

Run: `npm test -- --test-name-pattern="KAINDLY Standards publishes"`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit the article**

```bash
git add insights/index.html insights/kaindly-standards/index.html assets/css/site.css tests/site.test.mjs
git commit -m "feat: publish KAINDLY Standards"
```

---

### Task 5: Update Handoff Documentation and Verify the Release

**Files:**
- Modify: `README.md`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: All completed pages from Tasks 1–4.
- Produces: Accurate operator documentation and a fully verified release candidate.

- [ ] **Step 1: Strengthen global release assertions**

Ensure `pageFiles` contains exactly seven routes and add script-count and placeholder checks inside the existing metadata loop:

```js
assert.equal(pageFiles.length, 7);
assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i, `${file} contains placeholder content`);
```

- [ ] **Step 2: Run the full suite before documentation changes**

Run: `npm test`

Expected: PASS for all page, content, embed, metadata, accessibility, and link checks.

- [ ] **Step 3: Update README routes and integration notes**

Change “five-page” to “seven-route,” list `/assessment/` and `/insights/kaindly-standards/`, and document:

```markdown
## Embedded Experiences

- Home: Typeform readiness experience `01KJ3V41DCC0V9P0VT0T97XK4E`
- Assessment: Typeform `01KJ3TB8AV4EBVV6P51RE768EB`
- Contact message: Typeform `01KZS1XDVQMV2J1AP4SMMSTQZ6`
- Contact scheduling: Acuity owner `38041134`, with inline scheduler, direct fallback, and general booking bar
- Collective membership: Circle founding-member checkout
```

Remove the obsolete “Inputs to Add Later” entries for article content and the Collective checkout URL.

- [ ] **Step 4: Run final automated and local HTTP verification**

Run: `npm test`

Expected: PASS.

Start: `python3 -m http.server 4173`

Check: `/`, `/collective/`, `/assessment/`, `/insights/`, `/insights/kaindly-standards/`, `/about/`, and `/contact/` each return HTTP 200. Confirm each page loads its local stylesheet, JavaScript, and brand images without 404 responses.

- [ ] **Step 5: Commit the release documentation**

```bash
git add README.md tests/site.test.mjs
git commit -m "docs: update KAINDLY site handoff"
```

- [ ] **Step 6: Push and verify GitHub Pages**

Run: `git push origin main`

Wait for the latest GitHub Pages build to report `built`, then verify the seven public routes under `https://claritybyleanna.github.io/kaindly-website/` return HTTP 200 and the deployed HTML contains the three Typeform IDs, Circle checkout URL, Acuity inline iframe, and Standards article text on their intended pages.
