# KAINDLY Claude Export Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overlay the refreshed Claude export onto the permanent `preview` branch exactly—overwriting matching paths, adding new paths, deleting nothing—and publish the validated result only to the stable Vercel Preview.

**Architecture:** Treat `/Users/leanna/Downloads/export 4/kaindly-site` as an immutable 32-file input snapshot. Update the repository's contract tests for the refreshed routes, explicit `index.html` navigation, and Beehiiv newsletter integration, then copy the export tree over the site without deletion. Verify every exported file byte-for-byte, prove all pre-overlay paths still exist, review desktop and phone layouts, push `preview`, and recheck Preview, Production, and retired GitHub Pages surfaces.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, SHA-256/diff verification, Vercel Routing Middleware, Vercel Preview deployments, browser-based responsive review, HTTP verification.

## Global Constraints

- Source snapshot: `/Users/leanna/Downloads/export 4/kaindly-site`.
- Copy every source file into the same relative path in the site.
- Overwrite matching paths and add paths that do not yet exist.
- Delete nothing else; do not clean up unused or duplicate assets.
- Imported files must remain byte-for-byte identical to the refreshed export.
- Do not edit an imported file to fix validation findings; request a refreshed export instead.
- Preserve `middleware.js`, `package.json`, `package-lock.json`, tests, documentation, repository configuration, and every other path absent from the export.
- Preserve `assets/brand/og.png` because no matching export path exists.
- Preserve the environment-aware maintenance wall: `preview` and `development` pass through; Production, missing, and unknown environments return the existing HTTP `503` wall.
- The refreshed sitewide newsletter is Beehiiv form `7f631179-635f-49de-8c8f-063918eadc8c`; it replaces the former sitewide newsletter Typeform.
- Preserve Assessment Typeform `01KJ3TB8AV4EBVV6P51RE768EB` and Contact Typeform `01KZS1XDVQMV2J1AP4SMMSTQZ6`.
- Preserve Acuity owner `38041134`, Collective checkout `https://kaindly.circle.so/checkout/founding-member`, and `hello@kaindly.ai`.
- Push only the permanent `preview` branch. Do not merge or promote to `main` or Production.
- The stable Preview must be public and retain `X-Robots-Tag: noindex`.
- `kaindly.ai`, `www.kaindly.ai`, and the Production Vercel alias must remain maintenance-only.
- GitHub Pages must remain unpublished.

---

### Task 1: Import the Refreshed Export With Updated Contracts

**Files:**
- Modify: `tests/site.test.mjs`
- Overwrite from export: `index.html`
- Overwrite from export: `about/index.html`
- Overwrite from export: `assessment/index.html`
- Overwrite from export: `collective/index.html`
- Overwrite from export: `contact/index.html`
- Overwrite from export: `insights/index.html`
- Overwrite from export: `insights/kaindly-standards/index.html`
- Create from export: `insights/exclusion-inequity-ai/index.html`
- Create from export: `privacy/index.html`
- Create from export: `terms/index.html`
- Overwrite from export: `assets/css/site.css`
- Overwrite from export: `assets/js/site.js`
- Overwrite/add from export: all 20 files under `assets/brand/`, `assets/icons/`, `assets/images/`, `assets/img/`, and `assets/logos/`

**Interfaces:**
- Consumes: the exact 32-file export snapshot at `/Users/leanna/Downloads/export 4/kaindly-site`.
- Produces: a non-destructive repository overlay whose exported paths are byte-identical to the source and whose existing non-exported paths remain present.
- Produces: a 10-page validation matrix covering Home, Collective, Insights, About, Contact, Assessment, two articles, Privacy, and Terms.

- [ ] **Step 1: Freeze the source and destination path inventories before editing**

Run:

```bash
(
  cd '/Users/leanna/Downloads/export 4/kaindly-site'
  find . -type f -print0 | sort -z | xargs -0 shasum -a 256
) > /tmp/kaindly-export-4-source.sha256
find '/Users/leanna/Downloads/export 4/kaindly-site' -type f | sed 's#^/Users/leanna/Downloads/export 4/kaindly-site/##' | sort > /tmp/kaindly-export-4-paths.txt
git ls-files | sort > /tmp/kaindly-preview-pre-overlay-paths.txt
wc -l /tmp/kaindly-export-4-source.sha256 /tmp/kaindly-export-4-paths.txt
shasum -a 256 /tmp/kaindly-export-4-source.sha256
```

Expected: both export files report exactly `32` lines; the manifest SHA-256 is exactly `fe304b0f3d4fe5afb0fc0376c9cfea9fc6c2bbe4d89424ba97894fb7129ce6d1`; the pre-overlay inventory records every tracked repository path before the copy. Stop if the count or manifest digest differs because the source changed after this plan was approved.

- [ ] **Step 2: Extend the page matrix and rewrite only obsolete test expectations**

In `tests/site.test.mjs`, replace `pageFiles` with:

```js
const pageFiles = [
  ["index.html", "/"],
  ["collective/index.html", "/collective/"],
  ["insights/index.html", "/insights/"],
  ["about/index.html", "/about/"],
  ["contact/index.html", "/contact/"],
  ["assessment/index.html", "/assessment/"],
  ["insights/kaindly-standards/index.html", "/insights/kaindly-standards/"],
  ["insights/exclusion-inequity-ai/index.html", "/insights/exclusion-inequity-ai/"],
  ["privacy/index.html", "/privacy/"],
  ["terms/index.html", "/terms/"],
];
```

Update path assertions to match the refreshed export's explicit file links:

```js
assert.match(html, /href="index\.html"[^>]+aria-current="page"/);
for (const route of ["collective/index.html", "insights/index.html", "about/index.html", "contact/index.html"]) {
  assert.match(html, new RegExp(`href="${route.replaceAll(".", "\\.").replaceAll("/", "\\/")}"`));
}
assert.match(home, /<a class="button button--accent" href="assessment\/index\.html">Take the Assessment<\/a>/);
```

Change active-navigation checks on section pages from extensionless paths to the exported explicit paths:

```js
assert.match(html, /href="\.\.\/collective\/index\.html"[^>]+aria-current="page"/);
assert.match(html, /href="\.\.\/insights\/index\.html"[^>]+aria-current="page"/);
assert.match(html, /href="\.\.\/about\/index\.html"[^>]+aria-current="page"/);
assert.match(html, /href="\.\.\/contact\/index\.html"[^>]+aria-current="page"/);
```

Replace the sitewide newsletter test with the refreshed Beehiiv contract:

```js
test("every page initializes the Beehiiv newsletter exactly once", () => {
  for (const [file] of pageFiles) {
    const html = readFileSync(file, "utf8");
    assert.equal((html.match(/data-beehiiv-form="7f631179-635f-49de-8c8f-063918eadc8c"/g) || []).length, 1, `${file} needs one Beehiiv form`);
    assert.equal((html.match(/https:\/\/subscribe-forms\.beehiiv\.com\/v3\/loader\.js/g) || []).length, 1, `${file} needs one Beehiiv loader`);
    assert.equal((html.match(/https:\/\/subscribe-forms\.beehiiv\.com\/attribution\.js/g) || []).length, 1, `${file} needs one Beehiiv attribution script`);
    assert.equal((html.match(/class="newsletter-fab"/g) || []).length, 1, `${file} needs one newsletter button`);
  }
});
```

Retain the Assessment and Contact Typeform loader checks on their respective pages. Update the Collective Assessment link to `../assessment/index.html`, and update the Insights contract to require the new article route:

```js
assert.match(html, /href="exclusion-inequity-ai\/"/);
assert.match(html, /href="kaindly-standards\/"/);
assert.equal((html.match(/data-insight-card/g) || []).length, 3);
```

Add focused contracts for the new pages:

```js
test("the Exclusion and Inequity article is published from Insights", () => {
  const index = readFileSync("insights/index.html", "utf8");
  const article = readFileSync("insights/exclusion-inequity-ai/index.html", "utf8");
  assert.match(index, /href="exclusion-inequity-ai\/"/);
  assert.match(article, /Exclusion and Inequity Has a New Face in the World of AI/i);
  assert.match(article.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), /What we're facing isn't a skill gap\. It's an access gap\./);
});

test("Privacy and Terms are linked from every footer", () => {
  assert.equal(existsSync("privacy/index.html"), true);
  assert.equal(existsSync("terms/index.html"), true);
  for (const [file] of pageFiles) {
    const html = readFileSync(file, "utf8");
    assert.match(html, /Privacy Policy/);
    assert.match(html, /Terms of Service/);
  }
});
```

Keep unchanged tests for middleware, accessibility landmarks, unique metadata, external-link safety, local-reference resolution, the five-card system, responsive grids, Collective content counts, Insights filtering, Standards copy, founder images, Contact embeds, Acuity, Circle, and email destinations.

In the metadata/accessibility test, keep title, description, canonical, landmark, alt-text, and external-link-safety checks for all 10 pages. The refreshed Privacy and Terms pages intentionally omit Open Graph and Twitter metadata, so apply social-metadata assertions only to the eight non-legal pages:

```js
const isLegalPage = file === "privacy/index.html" || file === "terms/index.html";
if (!isLegalPage) {
  assert.match(html, new RegExp(`<meta property="og:url" content="https:\\/\\/www\\.kaindly\\.ai${route.replaceAll("/", "\\/")}">`));
  assert.match(html, /<meta name="twitter:title" content="[^"]+">/);
  assert.match(html, /<meta name="twitter:description" content="[^"]+">/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/www\.kaindly\.ai\/assets\/brand\/og\.png">/);
}
const expectedCurrentLinks = ["assessment/index.html", "privacy/index.html", "terms/index.html"].includes(file) ? 0 : 1;
assert.equal((html.match(/aria-current="page"/g) || []).length, expectedCurrentLinks, `${file} has an incorrect active navigation state`);
```

- [ ] **Step 3: Run the suite and confirm RED against the pre-overlay site**

Run:

```bash
npm ci
npm test
```

Expected: FAIL because `privacy/index.html`, `terms/index.html`, and `insights/exclusion-inequity-ai/index.html` do not exist yet and the current pages still use the former sitewide newsletter integration.

- [ ] **Step 4: Apply the exact non-destructive overlay**

Run only this copy operation from the `preview` worktree root:

```bash
cp -R '/Users/leanna/Downloads/export 4/kaindly-site/.' .
```

Expected: matching paths are overwritten, new directories/files are added, and no destination path is removed.

- [ ] **Step 5: Verify byte identity and prove non-deletion**

Verify every export path matches the source:

```bash
while IFS= read -r relative; do
  cmp -s "/Users/leanna/Downloads/export 4/kaindly-site/$relative" "$relative" || {
    echo "Mismatch: $relative"
    exit 1
  }
done < /tmp/kaindly-export-4-paths.txt
```

Verify all tracked paths present before the overlay still exist:

```bash
while IFS= read -r relative; do
  test -e "$relative" || {
    echo "Deleted path: $relative"
    exit 1
  }
done < /tmp/kaindly-preview-pre-overlay-paths.txt
```

Verify the export itself did not change between the Task 1 freeze and import:

```bash
(
  cd '/Users/leanna/Downloads/export 4/kaindly-site'
  find . -type f -print0 | sort -z | xargs -0 shasum -a 256
) > /tmp/kaindly-export-4-current.sha256
diff -u /tmp/kaindly-export-4-source.sha256 /tmp/kaindly-export-4-current.sha256
```

Expected: all commands exit `0` with no mismatch or deletion output.

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
npm test -- --test-name-pattern="Beehiiv|Exclusion|Privacy|Terms|middleware|local page link"
npm test
npm ls @vercel/functions
git diff --check
git status --short
```

Expected: all tests pass with 0 failures; `@vercel/functions@3.9.3` remains installed; whitespace check is clean. Status shows only changed or newly added paths from the 32-file overlay plus `tests/site.test.mjs`; source files already identical to the repository may be absent from status. It must not show `middleware.js`, `package.json`, `package-lock.json`, or any deletion.

- [ ] **Step 7: Review the exact scope and commit**

Run:

```bash
git diff --name-status
git diff -- middleware.js package.json package-lock.json
git diff -- tests/site.test.mjs
git status --short | rg '^ D|^D ' && exit 1 || true
git add about assessment assets collective contact index.html insights privacy terms tests/site.test.mjs
git diff --cached --check
git commit -m "feat: import refreshed KAINDLY site export"
```

Expected: infrastructure diff is empty; there are no deletions; the commit contains the exact overlay and updated tests.

---

### Task 2: Review and Publish the Updated Team Preview

**Files:**
- No repository file changes.

**Interfaces:**
- Consumes: Task 1's committed, exact overlay on `preview`.
- Produces: a visually reviewed stable Vercel Preview deployment for team feedback.
- Preserves: all Production surfaces and the unpublished GitHub Pages state.

- [ ] **Step 1: Re-run the release gate**

Run:

```bash
npm ci
npm test
git diff --check origin/preview..HEAD
git status -sb
```

Expected: all tests pass, diff check is clean, and `preview` is ahead of `origin/preview` with no uncommitted changes.

- [ ] **Step 2: Start a local static server for browser review**

Run from the worktree root:

```bash
python3 -m http.server 8765
```

Expected: the site is available at `http://127.0.0.1:8765/`. Keep this process running through Step 3.

- [ ] **Step 3: Review representative desktop and phone layouts**

Use the browser to inspect these routes at approximately `1440×900` and `390×844`:

```text
/
/collective/
/insights/
/about/
/contact/
/assessment/
/insights/kaindly-standards/
/insights/exclusion-inequity-ai/
/privacy/
/terms/
```

For each size, verify: no horizontal overflow; navigation is usable; content is not clipped; five Home cards are horizontal on wide screens and vertical on phones; footer columns stack on phones; founder and site imagery loads; articles and legal copy remain readable; Contact and Assessment embeds do not overlap surrounding content; and Beehiiv opens from the newsletter button.

If an imported-file defect is found, stop and report the exact route/viewport/evidence. Do not edit the imported file; request a refreshed export. If an external embed is blocked only on localhost, record that limitation and confirm its markup contract through the automated tests.

- [ ] **Step 4: Push only the permanent Preview branch**

Run:

```bash
git push origin preview
```

Expected: `origin/preview` advances to the Task 1 commit and Vercel creates a Preview deployment. Do not create a PR to `main`, merge, or promote.

- [ ] **Step 5: Verify the stable Vercel Preview after deployment becomes Ready**

Use the stable branch URL:

```text
https://kaindly-website-git-preview-claritybyleannas-projects.vercel.app/
```

Run:

```bash
curl -sS -L --max-time 30 -D /tmp/kaindly-overlay-preview-headers.txt \
  https://kaindly-website-git-preview-claritybyleannas-projects.vercel.app/ \
  -o /tmp/kaindly-overlay-preview-home.html
rg -ni '^HTTP/|^x-robots-tag:' /tmp/kaindly-overlay-preview-headers.txt
rg -n 'KAINDLY \| Lead AI|data-beehiiv-form="7f631179-635f-49de-8c8f-063918eadc8c"' /tmp/kaindly-overlay-preview-home.html
! rg -n 'Our site is being updated' /tmp/kaindly-overlay-preview-home.html
```

Expected: HTTP `200`, `X-Robots-Tag: noindex`, refreshed Home/Beehiiv markers present, and maintenance copy absent. Open the stable URL without an authenticated Vercel session and verify it requires no login.

- [ ] **Step 6: Verify new Preview routes and Production isolation**

Run:

```bash
for path in privacy/ terms/ insights/exclusion-inequity-ai/; do
  curl -sS -L --max-time 30 -D /tmp/kaindly-overlay-route-headers.txt \
    "https://kaindly-website-git-preview-claritybyleannas-projects.vercel.app/$path" \
    -o /tmp/kaindly-overlay-route-body.html
  rg -ni '^HTTP/[^ ]+ 200' /tmp/kaindly-overlay-route-headers.txt
done

for url in \
  https://kaindly.ai/ \
  https://www.kaindly.ai/ \
  https://kaindly-website-git-main-claritybyleannas-projects.vercel.app/; do
  curl -sS -L --max-time 30 -D /tmp/kaindly-overlay-production-headers.txt "$url" -o /tmp/kaindly-overlay-production-body.html
  rg -ni '^HTTP/[^ ]+ 503|^cache-control: no-store, max-age=0|^retry-after: 3600|^x-robots-tag: noindex, nofollow' /tmp/kaindly-overlay-production-headers.txt
  rg -n 'Our site is being updated|hello@kaindly.ai' /tmp/kaindly-overlay-production-body.html
done

curl -sS -L --max-time 30 -D /tmp/kaindly-overlay-pages-headers.txt \
  https://claritybyleanna.github.io/kaindly-website/ \
  -o /tmp/kaindly-overlay-pages-body.html
! rg -n 'KAINDLY \| Lead AI|data-beehiiv-form' /tmp/kaindly-overlay-pages-body.html
```

Expected: all three new Preview routes return `200`; the apex redirects to `www` and ends at `503`; `www` and the Production alias return `503` maintenance with exact headers/body; GitHub Pages does not serve the site.

- [ ] **Step 7: Record the team handoff**

Report the stable Preview URL, branch `preview`, deployed commit SHA, test count, 32/32 byte-identity result, desktop/phone review result, Preview `200/noindex` evidence, Production `503` evidence, and GitHub Pages result. State that Production remains unchanged and future edits must continue on `preview`.
