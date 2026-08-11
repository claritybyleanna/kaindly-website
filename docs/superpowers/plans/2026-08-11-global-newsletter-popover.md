# KAINDLY Global Newsletter Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the supplied KAINDLY newsletter Typeform popover exactly once on every published page.

**Architecture:** Add the same `data-tf-live` container near the end of each static HTML body. Reuse existing Typeform loaders on pages that already have forms and add one loader only where missing, preserving the current framework-free GitHub Pages architecture. Replace the unreliable Home readiness embed with a direct button to the dedicated Assessment page.

**Tech Stack:** HTML5, Typeform live embeds, Node.js built-in test runner, Playwright browser verification, GitHub Pages

## Global Constraints

- Use live embed ID `01KZS2YNAZC5SMZR13X20CRVKZ` on all seven routes.
- Load `https://embed.typeform.com/next/embed.js` exactly once per page.
- Replace the Home readiness Typeform with a branded button to `/assessment/`.
- Do not alter the Assessment Typeform, Contact message Typeform, Acuity scheduler, or their fallback links.
- Do not add CSS, JavaScript, dependencies, or a build step for the popover.

---

## File Structure

- `index.html` — Home assessment button, popover container, and Typeform loader.
- `collective/index.html` — Collective popover container and Typeform loader.
- `assessment/index.html` — Assessment popover container; retains the existing Typeform loader.
- `insights/index.html` — Insights popover container and Typeform loader.
- `insights/kaindly-standards/index.html` — Standards article popover container and Typeform loader.
- `about/index.html` — About popover container and Typeform loader.
- `contact/index.html` — Contact popover container; retains the existing Typeform loader.
- `tests/site.test.mjs` — global popover and script-deduplication contract.

---

### Task 1: Add and Verify the Global Newsletter Popover

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `index.html`
- Modify: `collective/index.html`
- Modify: `assessment/index.html`
- Modify: `insights/index.html`
- Modify: `insights/kaindly-standards/index.html`
- Modify: `about/index.html`
- Modify: `contact/index.html`

**Interfaces:**
- Consumes: Existing `pageFiles` route list and Typeform’s `data-tf-live` initialization contract.
- Produces: One configured newsletter popover and one Typeform loader on every page.

- [ ] **Step 1: Write the failing global integration test**

Add this test after the existing Home and Assessment Typeform test:

```js
test("every page initializes the newsletter popover exactly once", () => {
  for (const [file] of pageFiles) {
    const html = readFileSync(file, "utf8");
    assert.equal(
      (html.match(/data-tf-live="01KZS2YNAZC5SMZR13X20CRVKZ"/g) || []).length,
      1,
      `${file} needs one newsletter popover`,
    );
    assert.equal(
      (html.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length,
      1,
      `${file} needs exactly one Typeform loader`,
    );
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --test-name-pattern="newsletter popover"`

Expected: FAIL because none of the seven pages contains the newsletter live embed ID.

- [ ] **Step 3: Add the popover container to every page**

Insert the following immediately after `</main>` on each page:

```html
<div data-tf-live="01KZS2YNAZC5SMZR13X20CRVKZ"></div>
```

On Home, Assessment, and Contact, retain the page’s single loader and do not add another script.

- [ ] **Step 4: Add the loader to pages that do not already use Typeform**

Insert the following immediately after the popover container on Collective, Insights, the Standards article, and About:

```html
<script src="https://embed.typeform.com/next/embed.js" async></script>
```

- [ ] **Step 5: Run focused and full automated verification**

Run: `npm test -- --test-name-pattern="newsletter popover"`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS with no failures.

- [ ] **Step 5a: Replace the Home readiness embed with a direct button**

Update the Home contract first so it requires no readiness-form ID or fallback link and does require a “Take the Assessment” link to `assessment/`. Confirm that focused test fails, then replace the Home embed panel with the branded button. Keep the page’s Typeform loader because the global newsletter popover still requires it.

- [ ] **Step 6: Verify real browser initialization**

Serve the repository locally and inspect Home, Collective, Assessment, Standards, and Contact at desktop and mobile widths. Confirm each page creates one `.tf-v1-popover-button`, has no horizontal overflow, Home displays the assessment button without the old blank panel, and the dedicated inline Typeforms still create their expected frames.

- [ ] **Step 7: Commit the implementation**

```bash
git add index.html collective/index.html assessment/index.html insights/index.html insights/kaindly-standards/index.html about/index.html contact/index.html assets/css/site.css tests/site.test.mjs docs/superpowers/specs/2026-08-11-global-newsletter-popover-design.md docs/superpowers/plans/2026-08-11-global-newsletter-popover.md
git commit -m "feat: add global newsletter popover"
```

---

### Task 2: Publish and Verify GitHub Pages

**Files:**
- No file changes

**Interfaces:**
- Consumes: The tested commit from Task 1.
- Produces: A published GitHub Pages release at the existing site URL.

- [ ] **Step 1: Run the final clean-tree verification**

Run: `npm test && git diff --check && git status -sb`

Expected: all tests PASS, no diff errors, and `main` is ahead of `origin/main` only by the intended commits.

- [ ] **Step 2: Push the approved release**

Run: `git push origin main`

- [ ] **Step 3: Wait for GitHub Pages and verify the public routes**

Confirm the latest Pages build reports `built`, then request all seven public routes. Each route must return HTTP 200 and contain `01KZS2YNAZC5SMZR13X20CRVKZ`; representative live pages must initialize one `.tf-v1-popover-button` without mobile overflow.
