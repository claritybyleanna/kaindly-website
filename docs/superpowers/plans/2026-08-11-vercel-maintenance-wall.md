# KAINDLY Vercel Maintenance Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a branded temporary page and Vercel-only catch-all routing so every user-facing Vercel URL returns the maintenance experience while the completed website remains intact.

**Architecture:** Create one self-contained static `maintenance.html` and one root `vercel.json`. Ordered Vercel routes allow existing brand assets, then rewrite every other application path to the maintenance document with a temporary `503` response and anti-indexing headers; GitHub Pages ignores the Vercel configuration.

> **Implementation correction (2026-08-11):** The route rewrite design above is superseded by root `middleware.js`. Vercel Routing Middleware directly returns the maintenance HTML with `503` semantics and the required headers for every non-asset path (including `/maintenance.html` and case variants), avoiding a destination rewrite loop. Its statically analyzable matcher excludes `/assets/`; GitHub Pages remains unaffected because it does not execute Vercel middleware.

**Tech Stack:** HTML5, inline CSS, Vercel static routing, Node.js built-in test runner, Playwright browser verification

## Global Constraints

- Every user-facing Vercel route must return the maintenance page; Vercel's reserved `/.well-known` path is the only platform-defined exception.
- Preserve all existing website HTML, shared CSS, shared JavaScript, Typeforms, Acuity integrations, and GitHub Pages behavior unchanged.
- Display `hello@kaindly.ai` as the only interactive destination using `mailto:hello@kaindly.ai`.
- Do not expose site navigation, booking links, Typeforms, newsletter controls, or internal-site links on the maintenance page.
- Return status `503` with `Cache-Control: no-store, max-age=0`, `Retry-After: 3600`, and `X-Robots-Tag: noindex, nofollow`.
- The page must be usable at desktop and phone widths without JavaScript, animation, or horizontal overflow.

---

## File Structure

- `maintenance.html` — standalone branded maintenance experience with inline, page-specific CSS.
- `vercel.json` — Vercel-only asset allowlist and temporary catch-all route.
- `tests/site.test.mjs` — structural contract for the maintenance content and Vercel routing behavior.

---

### Task 1: Build and Verify the Vercel Maintenance Wall

**Files:**
- Create: `maintenance.html`
- Create: `vercel.json`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: Existing `/assets/brand/logo-secondary-violet.svg` and `/assets/brand/icon-violet.svg`.
- Produces: A static maintenance document and ordered Vercel route array.

- [ ] **Step 1: Write the failing maintenance contract test**

Add this test near the other site-shell tests:

```js
test("Vercel serves the approved maintenance wall on every application route", () => {
  assert.equal(existsSync("maintenance.html"), true, "Maintenance page is missing");
  assert.equal(existsSync("vercel.json"), true, "Vercel configuration is missing");

  const maintenance = readFileSync("maintenance.html", "utf8");
  assert.match(maintenance, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(maintenance, /A Thoughtful Update Is Underway/);
  assert.match(maintenance, /Our site is being updated\./);
  assert.match(maintenance, /Thank you for your patience while we make thoughtful improvements to the KAINDLY experience\. We(?:’|&rsquo;)ll be back soon\./);
  assert.match(maintenance, /href="mailto:hello@kaindly\.ai"/);
  assert.match(maintenance, />hello@kaindly\.ai<\/a>/);
  assert.match(maintenance, /Lead AI\. Don(?:’|&rsquo;)t Chase It\./);
  assert.equal((maintenance.match(/mailto:hello@kaindly\.ai/g) || []).length, 1);
  assert.doesNotMatch(maintenance, /<nav\b|acuityscheduling|data-tf-live|Schedule Appointment|Book a Call/i);

  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.deepEqual(config.routes[0], {
    src: "/assets/(.*)",
    dest: "/assets/$1",
  });
  assert.deepEqual(config.routes[1], {
    src: "/(.*)",
    dest: "/maintenance.html",
    status: 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Retry-After": "3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --test-name-pattern="approved maintenance wall"`

Expected: FAIL with `Maintenance page is missing` because neither new file exists.

- [ ] **Step 3: Create the standalone maintenance document**

Create `maintenance.html` with this semantic structure and exact copy:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KAINDLY | Site Update</title>
  <meta name="description" content="The KAINDLY website is being thoughtfully updated.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,600;1,300&amp;family=Jost:wght@600;700&amp;family=Urbanist:wght@400;500;600&amp;display=swap" rel="stylesheet">
  <style>
    :root {
      --violet: #634cc8;
      --violet-deep: #4d39a6;
      --periwinkle: #8c6efc;
      --periwinkle-25: #e2dbfe;
      --honeydew-50: #eafac4;
      --charcoal: #242424;
      --muted: #686670;
      --white: #ffffff;
      --shadow: 0 28px 80px rgba(48, 35, 107, 0.16);
    }

    * { box-sizing: border-box; }

    body {
      min-width: 320px;
      min-height: 100vh;
      margin: 0;
      background: var(--periwinkle-25);
      color: var(--charcoal);
      font-family: "Urbanist", "Avenir Next", Avenir, sans-serif;
      line-height: 1.45;
    }

    .maintenance-shell {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 40px 24px;
    }

    .maintenance-card {
      width: min(720px, 100%);
      padding: clamp(38px, 7vw, 72px);
      border: 1px solid rgba(99, 76, 200, 0.2);
      border-radius: 8px;
      background: var(--white);
      box-shadow: var(--shadow);
      text-align: center;
    }

    .maintenance-logo {
      width: min(210px, 62vw);
      height: auto;
      margin: 0 auto 34px;
    }

    .maintenance-accent {
      width: 58px;
      height: 4px;
      margin: 0 auto 30px;
      border-radius: 999px;
      background: var(--periwinkle);
    }

    .eyebrow {
      margin: 0 0 16px;
      color: var(--muted);
      font-family: "Archivo", "Helvetica Neue", Arial, sans-serif;
      font-size: 0.76rem;
      font-style: italic;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 24px;
      color: var(--violet);
      font-family: "Jost", "Avenir Next", Avenir, sans-serif;
      font-size: clamp(2.6rem, 7vw, 4.8rem);
      line-height: 0.95;
      letter-spacing: -0.045em;
    }

    .message {
      max-width: 560px;
      margin: 0 auto 28px;
      color: var(--muted);
      font-size: clamp(1.05rem, 2vw, 1.25rem);
    }

    .contact {
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      margin: 0 0 34px;
      padding: 12px 16px;
      border-radius: 5px;
      background: var(--honeydew-50);
      font-weight: 600;
    }

    .contact a {
      color: var(--violet-deep);
      text-underline-offset: 3px;
    }

    .contact a:focus-visible {
      outline: 3px solid var(--periwinkle);
      outline-offset: 4px;
    }

    .tagline {
      margin: 0;
      color: var(--violet);
      font-family: "Jost", "Avenir Next", Avenir, sans-serif;
      font-weight: 700;
    }

    @media (max-width: 600px) {
      .maintenance-shell { padding: 18px; }
      .maintenance-card { padding: 38px 24px; }
      .maintenance-logo { margin-bottom: 28px; }
      .contact { display: block; }
      .contact a { display: block; margin-top: 3px; }
    }
  </style>
</head>
<body>
  <main class="maintenance-shell">
    <section class="maintenance-card" aria-labelledby="maintenance-title">
      <img class="maintenance-logo" src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY">
      <div class="maintenance-accent" aria-hidden="true"></div>
      <p class="eyebrow">A Thoughtful Update Is Underway</p>
      <h1 id="maintenance-title">Our site is being updated.</h1>
      <p class="message">Thank you for your patience while we make thoughtful improvements to the KAINDLY experience. We&rsquo;ll be back soon.</p>
      <p class="contact">Need to reach us? <a href="mailto:hello@kaindly.ai">hello@kaindly.ai</a></p>
      <p class="tagline">Lead AI. Don&rsquo;t Chase It.</p>
    </section>
  </main>
</body>
</html>
```

- [ ] **Step 4: Create the Vercel-only route configuration**

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/maintenance.html",
      "status": 503,
      "headers": {
        "Cache-Control": "no-store, max-age=0",
        "Retry-After": "3600",
        "X-Robots-Tag": "noindex, nofollow"
      }
    }
  ]
}
```

- [ ] **Step 5: Run focused and full automated verification**

Run: `npm test -- --test-name-pattern="approved maintenance wall"`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Verify the maintenance document in a real browser**

Serve the repository locally and open `/maintenance.html` at `1440x1000` and `390x844`. Confirm:

- Logo, eyebrow, heading, message, email, and tagline are visible.
- The email link is the only interactive element and resolves to `mailto:hello@kaindly.ai`.
- The page has no horizontal overflow, blank state, error overlay, or browser console errors.
- At phone width, the contact label and email stack cleanly.

The local static server does not execute Vercel routes. Validate the JSON contract through the automated test; after the repository is connected to Vercel, validate the catch-all on a preview deployment before assigning the production domain.

- [ ] **Step 7: Confirm the completed site remains untouched**

Run: `git diff --name-only HEAD -- index.html about/index.html collective/index.html assessment/index.html insights/index.html insights/kaindly-standards/index.html contact/index.html assets/css/site.css assets/js/site.js`

Expected: no output.

Run: `git diff --check`

Expected: no output and exit code `0`.

- [ ] **Step 8: Commit the maintenance wall**

```bash
git add maintenance.html vercel.json tests/site.test.mjs
git commit -m "feat: add Vercel maintenance wall"
```

---

### Task 2: Publish the Vercel-Ready Repository

**Files:**
- No file changes

**Interfaces:**
- Consumes: The tested maintenance document and Vercel configuration from Task 1.
- Produces: A GitHub repository ready to connect to Vercel while retaining the full GitHub Pages site.

- [ ] **Step 1: Run final verification**

Run: `npm test`

Expected: all tests PASS.

Run: `git status -sb`

Expected: clean `main`, ahead of `origin/main` only by the intended specification, plan, and implementation commits.

- [ ] **Step 2: Push the repository**

Run: `git push origin main`

- [ ] **Step 3: Confirm GitHub Pages remains unaffected**

Wait for GitHub Pages, then request the existing public Home route. Confirm HTTP `200`, the real Home heading `Lead AI. Don't Chase It.`, and the absence of the maintenance heading.

- [ ] **Step 4: Hand off the Vercel connection check**

After the user connects the repository to Vercel, verify a preview deployment at `/`, `/about/`, and `/this-path-does-not-exist`. Each user-facing path should render the maintenance document with status `503`, the three temporary-response headers, and working `/assets/brand/` files.
