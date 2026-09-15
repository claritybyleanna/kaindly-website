# KAINDLY Vercel Preview Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Production behind the maintenance wall while exposing the complete website through one stable, publicly shareable Vercel Preview URL and retiring the public GitHub Pages copy.

**Architecture:** Root `middleware.js` remains fail-closed and returns the approved `503` maintenance response unless Vercel reports `VERCEL_ENV=preview` or `development`. Those two environments use `next()` from `@vercel/functions` to continue to the underlying static website. The permanent `preview` branch drives one stable Vercel branch URL; GitHub Pages is unpublished only after Preview and Production pass live checks.

**Tech Stack:** Static HTML/CSS/JavaScript, Vercel Routing Middleware, `@vercel/functions` 3.9.3, Node.js built-in test runner, GitHub/Vercel dashboards, HTTP verification with `curl`.

## Global Constraints

- `main` remains Vercel's Production Branch.
- `preview` remains the permanent team-review branch.
- Production, missing, or unknown environment state must return the existing maintenance document with HTTP `503` and its exact temporary-response headers.
- Preview and Development must continue to the complete static site.
- `/assets/` must continue to bypass middleware.
- The Preview URL must be accessible to anyone with the link and must not use a custom domain.
- Standard Vercel Preview responses must retain `X-Robots-Tag: noindex`.
- Do not unpublish GitHub Pages until the Vercel Preview and both Production custom domains pass live verification.
- Do not delete or rewrite existing website pages, branches, Git history, or brand assets.

---

### Task 1: Make the Maintenance Wall Environment-Aware

**Files:**
- Modify: `middleware.js:1-162`
- Modify: `tests/site.test.mjs:33-75`
- Modify: `package.json`
- Create: `package-lock.json`

**Interfaces:**
- Consumes: runtime `process.env.VERCEL_ENV`, with supported values `production`, `preview`, and `development`.
- Produces: `isFullSiteEnvironment(value: string | undefined): boolean` and the existing default middleware handler.
- Produces: a Vercel `next()` pass-through response only for `preview` and `development`.

- [ ] **Step 1: Rewrite the middleware contract test to cover every environment**

Replace the current single-environment response loop with an environment matrix while retaining all approved-copy, matcher, and sole-interaction assertions:

```js
async function withVercelEnv(value, run) {
  const previous = process.env.VERCEL_ENV;
  if (value === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = value;

  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
}

test("Vercel middleware separates Preview from the production maintenance wall", async () => {
  assert.equal(existsSync("middleware.js"), true, "Vercel routing middleware is missing");

  const { config, default: maintenanceMiddleware, isFullSiteEnvironment } = await import("../middleware.js");
  const matcher = new RegExp(`^${config.matcher[0]}$`);
  assert.equal(matcher.test("/"), true);
  assert.equal(matcher.test("/about/"), true);
  assert.equal(matcher.test("/assets/brand/logo-secondary-violet.svg"), false);

  assert.equal(isFullSiteEnvironment("preview"), true);
  assert.equal(isFullSiteEnvironment("development"), true);
  assert.equal(isFullSiteEnvironment("production"), false);
  assert.equal(isFullSiteEnvironment("staging"), false);
  assert.equal(isFullSiteEnvironment(undefined), false);

  for (const environment of ["preview", "development"]) {
    const response = await withVercelEnv(environment, () => maintenanceMiddleware());
    assert.equal(response.status, 200, `${environment} must continue to the static site`);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  }

  for (const environment of ["production", "staging", undefined]) {
    const response = await withVercelEnv(environment, () => maintenanceMiddleware());
    assert.equal(response.status, 503, `${environment ?? "missing"} must fail closed`);
    assert.deepEqual(Object.fromEntries(response.headers), {
      "cache-control": "no-store, max-age=0",
      "content-type": "text/html; charset=utf-8",
      "retry-after": "3600",
      "x-robots-tag": "noindex, nofollow",
    });
    const maintenance = await response.text();
    assert.match(maintenance, /Our site is being updated\./);
    assert.match(maintenance, /href="mailto:hello@kaindly\.ai"/);
  }

  const maintenance = await withVercelEnv("production", async () =>
    (await maintenanceMiddleware()).text(),
  );
  assert.match(maintenance, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(maintenance, /A Thoughtful Update Is Underway/);
  assert.match(maintenance, /Thank you for your patience while we make thoughtful improvements to the KAINDLY experience\./);
  assert.match(maintenance, /Lead AI\. Don(?:’|&rsquo;)t Chase It\./);
  assert.equal((maintenance.match(/<a\b/g) || []).length, 1);
  assert.equal((maintenance.match(/mailto:hello@kaindly\.ai/g) || []).length, 1);
  assert.doesNotMatch(maintenance, /<nav\b|acuityscheduling|data-tf-live|Schedule Appointment|Book a Call/i);
  assert.doesNotMatch(maintenance, /<(?:button|input|select|textarea|form|iframe)\b/i);
});
```

The production response is read once for the complete approved-copy and sole-interaction contract.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- --test-name-pattern="Vercel middleware"
```

Expected: FAIL because `isFullSiteEnvironment` is not exported and Preview still receives the maintenance response.

- [ ] **Step 3: Install the official pass-through helper at the reviewed version**

Run:

```bash
npm install --save-exact @vercel/functions@3.9.3
```

Expected: `package.json` records `"@vercel/functions": "3.9.3"` and npm creates `package-lock.json`.

- [ ] **Step 4: Implement fail-closed environment routing**

Add the import and environment decision around the existing maintenance response without changing the maintenance HTML or headers:

```js
import { next } from "@vercel/functions";

const FULL_SITE_ENVIRONMENTS = new Set(["preview", "development"]);

export function isFullSiteEnvironment(value = process.env.VERCEL_ENV) {
  return FULL_SITE_ENVIRONMENTS.has(value);
}

export default function maintenanceMiddleware() {
  if (isFullSiteEnvironment()) return next();

  return new Response(maintenanceDocument, {
    status: 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
```

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
npm test -- --test-name-pattern="Vercel middleware"
npm test
npm ls @vercel/functions
git diff --check
```

Expected: the focused test passes; the full suite passes with 0 failures; npm reports `@vercel/functions@3.9.3`; the whitespace check is clean.

- [ ] **Step 6: Confirm scope and commit**

Run:

```bash
git diff --name-only HEAD
git diff -- middleware.js tests/site.test.mjs package.json package-lock.json
git add middleware.js tests/site.test.mjs package.json package-lock.json
git commit -m "feat: expose full site in Vercel previews"
```

Expected changed runtime files: `middleware.js`, `tests/site.test.mjs`, `package.json`, and `package-lock.json`. The previously committed spec and this plan are the only documentation changes on the branch.

---

### Task 2: Publish and Verify the Stable Vercel Preview

**Files:**
- No repository file changes.

**Interfaces:**
- Consumes: the committed `preview` branch from Task 1 and the connected Vercel Git integration.
- Produces: one stable, public branch-specific Vercel Preview URL for team review.
- Preserves: `kaindly.ai`, `www.kaindly.ai`, and the production Vercel alias as maintenance-only surfaces.

- [ ] **Step 1: Re-run the release gate before publishing**

Run:

```bash
npm test
git diff --check origin/main..HEAD
git status -sb
```

Expected: all tests pass, the diff check is clean, and the branch is `preview` with no uncommitted changes.

- [ ] **Step 2: Push the permanent Preview branch**

Run:

```bash
git push -u origin preview
```

Expected: GitHub receives `preview`; Vercel starts a Preview deployment because `preview` is not the Production Branch.

- [ ] **Step 3: Confirm Vercel environment and access settings**

In Vercel:

1. Open Project → Settings → Git and confirm Production Branch is `main`.
2. Open Project → Settings → Environment Variables and enable **Automatically expose System Environment Variables** if it is disabled.
3. Open Project → Settings → Deployment Protection and leave Vercel Authentication disabled for Preview deployments.
4. Open Deployments, filter Branch to `preview`, wait for Ready, and copy the Branch URL rather than a commit-specific URL.

If the deployment still shows the wall, enable the system-variable setting, redeploy the latest `preview` deployment, and repeat the checks. If the deployment requests Vercel authentication, disable Preview protection and retry from a signed-out browser.

- [ ] **Step 4: Verify the Preview response without an authenticated session**

At the prompt below, paste the Branch URL copied from Vercel, then verify it:

```bash
read -r KAINDLY_PREVIEW_URL
: "${KAINDLY_PREVIEW_URL:?A Vercel Preview Branch URL is required}"
curl -sS -D /tmp/kaindly-preview-headers.txt "$KAINDLY_PREVIEW_URL/" -o /tmp/kaindly-preview-home.html
rg -ni "^HTTP/|^x-robots-tag:" /tmp/kaindly-preview-headers.txt
rg -n "KAINDLY \| Lead AI|data-tf-live" /tmp/kaindly-preview-home.html
! rg -n "Our site is being updated" /tmp/kaindly-preview-home.html
```

Expected: HTTP `200`; `X-Robots-Tag: noindex`; the full Home title and newsletter integration are present; maintenance copy is absent. Open the same URL in a signed-out/private browser and confirm it loads without a login prompt.

- [ ] **Step 5: Verify Production remains protected**

Run:

```bash
for url in https://kaindly.ai/ https://www.kaindly.ai/; do
  curl -sS -D /tmp/kaindly-production-headers.txt "$url" -o /tmp/kaindly-production-body.html
  rg -ni "^HTTP/[^ ]+ 503|^cache-control: no-store, max-age=0|^retry-after: 3600|^x-robots-tag: noindex, nofollow" /tmp/kaindly-production-headers.txt
  rg -n "Our site is being updated|hello@kaindly.ai" /tmp/kaindly-production-body.html
done
```

Expected: both custom domains return the maintenance wall with HTTP `503` and the required temporary-response headers. Also verify the production `vercel.app` alias from the Vercel Domains screen with the same checks.

- [ ] **Step 6: Record the team handoff**

Report the stable Preview URL, the branch name `preview`, the current commit SHA, the successful test count, Preview `200/noindex` evidence, and Production `503` evidence. Do not promote the Preview deployment to Production.

---

### Task 3: Unpublish the Public GitHub Pages Copy

**Files:**
- No repository file changes.

**Interfaces:**
- Consumes: the verified Preview and Production evidence from Task 2.
- Produces: the former GitHub Pages URL no longer serves the complete site.
- Preserves: all repository content, branches, settings unrelated to Pages, and Git history.

- [ ] **Step 1: Reconfirm the rollout gate**

Do not proceed unless all Task 2 checks passed in the current run: public Preview HTTP `200`, Preview `noindex`, both custom domains HTTP `503`, and the production Vercel alias HTTP `503`.

- [ ] **Step 2: Unpublish without deleting the site or repository**

On GitHub, open `claritybyleanna/kaindly-website` → Settings → Pages. Under the live-site notice, open the overflow menu and choose **Unpublish site**. Confirm only the unpublish action. Do not delete the repository, branch, `.nojekyll`, or site files.

- [ ] **Step 3: Verify GitHub Pages no longer serves the full site**

Run:

```bash
curl -sS -L -D /tmp/kaindly-pages-headers.txt https://claritybyleanna.github.io/kaindly-website/ -o /tmp/kaindly-pages-body.html
! rg -n "KAINDLY \| Lead AI|data-tf-live" /tmp/kaindly-pages-body.html
```

Expected: the former Pages URL does not return the complete KAINDLY Home page. If GitHub's edge cache still serves the previous deployment, wait for the unpublish operation to complete and retry; do not change repository content to force removal.

- [ ] **Step 4: Recheck the two intended surfaces after unpublishing**

Repeat Task 2 Steps 4 and 5.

Expected: the stable Preview still returns the full site with HTTP `200` and `noindex`; both custom domains and the production alias still return the maintenance wall with HTTP `503`.

- [ ] **Step 5: Final handoff**

Report the stable team Preview URL and confirm that GitHub Pages is unpublished. State explicitly that future website changes should be pushed to `preview`, not `main`, and that launching Production requires a separate approved change to remove or disable the maintenance wall.
