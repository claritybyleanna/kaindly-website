# Blead Leadership Learning Hub Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an unpublished, password-protected, clickable KAINDLY Leadership Learning Hub prototype at the exact local route `/Blead/` for owner review.

**Architecture:** Extend the existing static KAINDLY site with a generated, progressively enhanced `/Blead/` page and a branded access screen. Shared Web Crypto helpers sign an eight-hour `HttpOnly` session; existing Vercel middleware and a dedicated local Node server enforce the same route contract. Public-safe sample content stays in a structured module under `/Blead/` and is rendered into semantic HTML at build time.

**Tech Stack:** Static HTML, CSS, browser JavaScript modules, Node.js 20+, Node test runner, Web Crypto API, Vercel Routing Middleware via `@vercel/functions`.

**Spec:** `docs/superpowers/specs/2026-10-06-blead-learning-hub-prototype-design.md`

## Global Constraints

- Work only on local branch `codex/blead-prototype`; do not push, deploy, or modify `main`.
- Preserve the exact case-sensitive route `/Blead/` and keep existing site navigation unchanged.
- Do not commit the shared password, signing secret, `.env.local`, participant data, client identity, real curriculum, dates, private links, analytics, forms, or embeds.
- Use the official assets already present in `assets/brand/`; do not alter logo files.
- Keep sample weeks and optional component examples visibly labeled as fictional design-review content.
- Protect every file below `/Blead/`; static CSS, generic JavaScript, and official brand assets may remain public.
- Target WCAG 2.2 AA, 44px practical touch targets, reduced motion, 200% zoom, and 320px reflow without horizontal scrolling.
- Preserve the existing maintenance fallback in `middleware.js` for environments other than production, preview, and development.
- Use no new runtime dependency beyond the existing `@vercel/functions` package.

## Review Focus

- A missing password or session secret must fail closed for `/Blead/` without affecting other production routes; Task 2 tests this.
- Tampered, malformed, or expired session cookies must redirect to access without throwing; Tasks 1 and 2 test this.
- Return destinations must stay inside `/Blead/` and must not create an open redirect; Tasks 1–3 test this.
- Unavailable sample resources must never render a working link or fake `href="#"`; Task 4 tests this.
- At 320px and 200% zoom, week titles, state labels, menu controls, and the access form must reflow without horizontal scrolling; Task 6 verifies this in a browser.

---

### Task 1: Authentication Primitives

**Files:**
- Create: `lib/blead-auth.js`
- Create: `tests/blead-auth.test.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `securePasswordMatch(candidate, expected) -> Promise<boolean>`
- Produces: `signBleadSession({ expiresAt, secret }) -> Promise<string>`
- Produces: `verifyBleadSession(token, secret, now = Date.now()) -> Promise<boolean>`
- Produces: `readCookie(cookieHeader, name) -> string | undefined`
- Produces: `serializeBleadSession(token, { secure, maxAge }) -> string`
- Produces: `clearBleadSession({ secure }) -> string`
- Produces: `sanitizeBleadReturnTo(value) -> string`

- [ ] **Step 1: Add focused failing tests and make the full test script discover every test file**

Change `package.json`:

```json
"scripts": {
  "test": "node --test tests/*.test.mjs"
}
```

Add `.env.local` to `.gitignore`, then create `tests/blead-auth.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  BLEAD_COOKIE_NAME,
  clearBleadSession,
  readCookie,
  sanitizeBleadReturnTo,
  securePasswordMatch,
  serializeBleadSession,
  signBleadSession,
  verifyBleadSession,
} from "../lib/blead-auth.js";

test("password comparison accepts only an exact value", async () => {
  assert.equal(await securePasswordMatch("correct", "correct"), true);
  assert.equal(await securePasswordMatch("Correct", "correct"), false);
  assert.equal(await securePasswordMatch("", "correct"), false);
});

test("signed sessions reject tampering, malformed input, and expiration", async () => {
  const secret = "unit-test-secret-with-adequate-length";
  const token = await signBleadSession({ expiresAt: 20_000, secret });
  assert.equal(await verifyBleadSession(token, secret, 10_000), true);
  assert.equal(await verifyBleadSession(`${token}x`, secret, 10_000), false);
  assert.equal(await verifyBleadSession("not-a-token", secret, 10_000), false);
  assert.equal(await verifyBleadSession(token, secret, 20_001), false);
});

test("cookie helpers scope and clear the Blead session", () => {
  const cookie = serializeBleadSession("signed-token", { secure: true, maxAge: 28_800 });
  assert.match(cookie, new RegExp(`^${BLEAD_COOKIE_NAME}=signed-token`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\/Blead\//);
  assert.equal(readCookie(`${cookie}; another=value`, BLEAD_COOKIE_NAME), "signed-token");
  assert.match(clearBleadSession({ secure: true }), /Max-Age=0/);
});

test("return destinations cannot leave the protected route", () => {
  assert.equal(sanitizeBleadReturnTo("/Blead/"), "/Blead/");
  assert.equal(sanitizeBleadReturnTo("/Blead/#week-01"), "/Blead/#week-01");
  assert.equal(sanitizeBleadReturnTo("https://attacker.example"), "/Blead/");
  assert.equal(sanitizeBleadReturnTo("//attacker.example"), "/Blead/");
  assert.equal(sanitizeBleadReturnTo("/contact/"), "/Blead/");
});
```

- [ ] **Step 2: Run the new test and verify the expected missing-module failure**

Run: `node --test tests/blead-auth.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/blead-auth.js`.

- [ ] **Step 3: Implement the Web Crypto and cookie helpers**

Create `lib/blead-auth.js` using the global Web Crypto API:

```js
export const BLEAD_COOKIE_NAME = "kaindly_blead_session";
const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function importHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

export async function securePasswordMatch(candidate = "", expected = "") {
  if (!candidate || !expected) return false;
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function signBleadSession({ expiresAt, secret }) {
  if (!secret) throw new Error("BLEAD_SESSION_SECRET is required");
  const payload = `v1.${Number(expiresAt)}`;
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyBleadSession(token, secret, now = Date.now()) {
  try {
    if (!token || !secret) return false;
    const [version, expiresText, signatureText, extra] = token.split(".");
    if (version !== "v1" || extra !== undefined) return false;
    const expiresAt = Number(expiresText);
    if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
    const key = await importHmacKey(secret, ["verify"]);
    return crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureText),
      encoder.encode(`${version}.${expiresText}`),
    );
  } catch {
    return false;
  }
}

export function readCookie(cookieHeader = "", name) {
  for (const item of cookieHeader.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

export function serializeBleadSession(token, { secure = true, maxAge = 28_800 } = {}) {
  return [
    `${BLEAD_COOKIE_NAME}=${token}`,
    "Path=/Blead/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function clearBleadSession({ secure = true } = {}) {
  return serializeBleadSession("", { secure, maxAge: 0 });
}

export function sanitizeBleadReturnTo(value = "") {
  return /^\/Blead\/(?:#[a-z0-9-]+)?$/i.test(value) ? value : "/Blead/";
}
```

- [ ] **Step 4: Run auth and existing site tests**

Run: `npm test`

Expected: all existing tests plus the four new authentication tests PASS.

- [ ] **Step 5: Commit the authentication boundary**

```bash
git add .gitignore package.json lib/blead-auth.js tests/blead-auth.test.mjs
git commit -m "feat: add Blead session primitives"
```

### Task 2: Route Protection in Existing Middleware

**Files:**
- Modify: `middleware.js`
- Modify: `tests/blead-auth.test.mjs`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: all helpers from `lib/blead-auth.js`
- Produces: `isProtectedBleadPath(pathname) -> boolean`
- Produces: `handleBleadAccess(request, options) -> Promise<Response>`
- Preserves: `isFullSiteEnvironment(value)` and the existing maintenance response

- [ ] **Step 1: Add failing middleware tests for public routes, access, failure, success, expiry, logout, and missing configuration**

Append tests that construct `Request` objects and call the default middleware under `VERCEL_ENV=development`:

```js
test("Blead middleware protects only the learning hub", async () => {
  const { default: middleware } = await import("../middleware.js");
  process.env.VERCEL_ENV = "development";
  process.env.BLEAD_PASSWORD = "test-password";
  process.env.BLEAD_SESSION_SECRET = "test-session-secret-with-adequate-length";

  const publicResponse = await middleware(new Request("https://www.kaindly.ai/about/"));
  assert.equal(publicResponse.headers.get("x-middleware-next"), "1");

  const protectedResponse = await middleware(new Request("https://www.kaindly.ai/Blead/"));
  assert.equal(protectedResponse.status, 303);
  assert.equal(new URL(protectedResponse.headers.get("location")).pathname, "/Blead/access/");

  const contentResponse = await middleware(new Request("https://www.kaindly.ai/Blead/content.js"));
  assert.equal(contentResponse.status, 303);
});

test("Blead access rejects a bad password without putting it in the URL", async () => {
  const { default: middleware } = await import("../middleware.js");
  const body = new URLSearchParams({ password: "wrong", returnTo: "/Blead/" });
  const response = await middleware(new Request("https://www.kaindly.ai/Blead/access/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://www.kaindly.ai" },
    body,
  }));
  assert.equal(response.status, 303);
  assert.match(response.headers.get("location"), /error=1/);
  assert.doesNotMatch(response.headers.get("location"), /wrong/);
  assert.equal(response.headers.get("set-cookie"), null);
});
```

Add equivalent assertions for correct password (`Set-Cookie`, 303 to sanitized return destination), a tampered cookie (redirect), missing environment variables (503 for Blead only), and POST `/Blead/logout/` (clearing cookie, redirect to access). Restore environment variables after every test.

- [ ] **Step 2: Run focused middleware tests and verify failure**

Run: `node --test --test-name-pattern="Blead middleware|Blead access" tests/blead-auth.test.mjs`

Expected: FAIL because the middleware does not yet protect `/Blead/`.

- [ ] **Step 3: Extend middleware without changing the maintenance fallback**

Import the auth helpers, make the default export async, and branch only after the existing full-site environment check:

```js
const BLEAD_SESSION_MS = 8 * 60 * 60 * 1000;

export function isProtectedBleadPath(pathname) {
  return pathname === "/Blead" || pathname.startsWith("/Blead/");
}

function redirect(location, headers = {}) {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store", ...headers } });
}

export default async function maintenanceMiddleware(
  request = new Request("https://www.kaindly.ai/"),
) {
  if (!isFullSiteEnvironment()) return maintenanceResponse();

  const url = new URL(request.url);
  if (!isProtectedBleadPath(url.pathname)) return next();

  const password = process.env.BLEAD_PASSWORD;
  const secret = process.env.BLEAD_SESSION_SECRET;
  if (!password || !secret) {
    return new Response("This learning hub is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (url.pathname === "/Blead/access/" || url.pathname === "/Blead/access") {
    if (request.method !== "POST") {
      const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
      return (await verifyBleadSession(token, secret)) ? redirect("/Blead/") : next();
    }
    return handleBleadAccess(request, { password, secret });
  }

  if (url.pathname === "/Blead/logout/" && request.method === "POST") {
    return redirect("/Blead/access/", { "Set-Cookie": clearBleadSession({ secure: url.protocol === "https:" }) });
  }

  const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
  if (await verifyBleadSession(token, secret)) return next();
  return redirect(new URL(`/Blead/access/?returnTo=${encodeURIComponent(url.pathname + url.search)}`, url));
}
```

`handleBleadAccess()` must verify same-origin POSTs, parse `formData()`, compare the password, sanitize `returnTo`, create the eight-hour token, and use a fixed 350ms delay before redirecting failed attempts. Refactor the existing maintenance response construction into `maintenanceResponse()` without changing its HTML or headers.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all middleware, authentication, and existing site tests PASS.

- [ ] **Step 5: Commit route protection**

```bash
git add middleware.js tests/blead-auth.test.mjs tests/site.test.mjs
git commit -m "feat: protect Blead route with signed sessions"
```

### Task 3: Branded Access Screen and Local Protected Server

**Files:**
- Create: `Blead/access/index.html`
- Create: `assets/css/blead-access.css`
- Create: `assets/js/blead-access.js`
- Create: `scripts/blead-prototype-server.mjs`
- Create: `tests/blead-access.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `lib/blead-auth.js`
- Produces: local server command `npm run prototype:blead`
- Produces: access-form fields `password`, `returnTo`, and `returnHash`

- [ ] **Step 1: Add failing structural and local-server tests**

Create `tests/blead-access.test.mjs` with assertions that the access page has one H1, an official logo, a labeled password input, a same-route POST form, no newsletter/analytics/embed scripts, `noindex`, generic metadata, an `aria-live` error, and no literal owner-supplied password. Add a child-process test that starts the local server with test-only environment values and verifies:

```js
assert.equal((await fetch(`${base}/Blead/`, { redirect: "manual" })).status, 303);
assert.equal((await fetch(`${base}/Blead/access/`)).status, 200);
assert.equal((await fetch(`${base}/about/`)).status, 200);
```

Then submit correct and incorrect `application/x-www-form-urlencoded` bodies and verify the same cookie/redirect contract as middleware.

- [ ] **Step 2: Run the access test and verify missing-file/server failures**

Run: `node --test tests/blead-access.test.mjs`

Expected: FAIL because the access page and local server do not exist.

- [ ] **Step 3: Build the access page and progressive enhancement**

Create a compact, light-first KAINDLY card with this participant-facing copy:

```html
<p class="eyebrow">AI Leadership Program</p>
<h1 id="access-title">Enter the Leadership Learning Hub</h1>
<p>Use the program password provided through your approved participant channel.</p>
<form method="post" action="/Blead/access/" data-blead-access-form>
  <label for="program-password">Program password</label>
  <input id="program-password" name="password" type="password" autocomplete="current-password" required>
  <input name="returnTo" type="hidden" value="/Blead/">
  <input name="returnHash" type="hidden" value="">
  <button type="submit">Open the learning hub</button>
</form>
<p class="access-error" role="alert" aria-live="assertive" hidden data-access-error>
  That password was not accepted. Check it and try again.
</p>
```

`blead-access.js` reads `error=1`, reveals the generic message, focuses the password input, and copies only a valid `#week-[0-9]+` fragment into `returnHash`. It must never persist, log, or place the password in a URL.

- [ ] **Step 4: Implement the local server with the shared auth helpers**

The server must:

- read `.env.local` without third-party packages;
- refuse to start without `BLEAD_PASSWORD` and `BLEAD_SESSION_SECRET`;
- enforce auth before serving any `/Blead/` file except `/Blead/access/`;
- mirror middleware POST, cookie, logout, error-delay, and return-destination behavior;
- serve repository files through a resolved-path allowlist that prevents `..` traversal;
- use `Cache-Control: no-store` for access and protected responses;
- listen on `127.0.0.1:4173` by default.

Add:

```json
"prototype:blead": "node scripts/build-blead.mjs && node scripts/blead-prototype-server.mjs"
```

The build script is introduced in Task 4; until then, run the server file directly in this task's focused tests.

- [ ] **Step 5: Run access and full tests**

Run: `npm test`

Expected: all tests PASS and the test child process exits cleanly.

- [ ] **Step 6: Commit the access experience**

```bash
git add Blead/access/index.html assets/css/blead-access.css assets/js/blead-access.js scripts/blead-prototype-server.mjs tests/blead-access.test.mjs package.json
git commit -m "feat: add branded Blead access screen"
```

### Task 4: Public-Safe Content Model and Semantic Page Generator

**Files:**
- Create: `Blead/content.js`
- Create: `scripts/build-blead.mjs`
- Create: `tests/blead-content.test.mjs`
- Generate: `Blead/index.html`

**Interfaces:**
- Produces: `bleadContent` with `site`, `weeks`, `resources`, `updates`, and `faqs`
- Produces: `renderBleadPage(content) -> string`
- Produces: `npm run build:blead`

- [ ] **Step 1: Add failing content-validation and generated-markup tests**

Test the exact route casing, generic metadata, `sample: true` on fictional records, three week states, lack of dates/client identity/private URLs, and absence of draft/editorial fields. Validate that every rendered active action has a real destination and every unavailable resource has no anchor.

```js
test("sample content is public-safe and explicitly labeled", async () => {
  const { bleadContent } = await import("../Blead/content.js");
  assert.equal(bleadContent.site.title, "Leadership Learning Hub");
  assert.deepEqual(bleadContent.weeks.map(({ state }) => state), ["available", "overview", "upcoming"]);
  assert.ok(bleadContent.weeks.every(({ sample }) => sample === true));
  assert.ok(bleadContent.resources.every(({ sample, publicUrl }) => sample === true && publicUrl === null));
  assert.doesNotMatch(JSON.stringify(bleadContent), /@|202[0-9]|client|participant name|assessment result/i);
});
```

Generated HTML tests must assert one H1, semantic sections and anchors, real buttons with `aria-expanded`, controlled panel IDs, visible sample labels, three week state labels, disabled optional actions without links, privacy/terms links, and no canonical, newsletter, forms, embeds, marketing CTA, fake `href="#"`, or unfinished-marker strings.

- [ ] **Step 2: Run the content test and verify missing-module failure**

Run: `node --test tests/blead-content.test.mjs`

Expected: FAIL because `Blead/content.js` and the builder do not exist.

- [ ] **Step 3: Create the structured sample content**

Export the approved generic hero copy, Learn/Reflect/Apply overview, four usage steps, the three fictional week examples, four fictional resource-state examples, one fictional update, and five neutral FAQs from the brief. Use stable IDs (`week-01`, `resource-guide`, `faq-start`) and null public URLs.

- [ ] **Step 4: Implement deterministic semantic HTML generation**

`renderBleadPage()` must HTML-escape every content value, omit empty subsections, map controlled states to fixed labels, generate real button/panel relationships, and render unavailable resources as status blocks rather than anchors. Write output only when run as the entry script:

```js
export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

export function renderBleadPage(content) {
  validatePublicContent(content);
  return `<!doctype html>...`;
}
```

Add `"build:blead": "node scripts/build-blead.mjs"` to `package.json` and ensure two consecutive builds produce byte-identical `Blead/index.html`.

- [ ] **Step 5: Run build, focused tests, and full tests**

Run: `npm run build:blead && node --test tests/blead-content.test.mjs && npm test`

Expected: deterministic build and all tests PASS.

- [ ] **Step 6: Commit the content model and generated page**

```bash
git add Blead/content.js Blead/index.html scripts/build-blead.mjs tests/blead-content.test.mjs package.json
git commit -m "feat: generate Blead learning hub content"
```

### Task 5: Accessible Hub Interactions

**Files:**
- Create: `assets/js/blead.js`
- Modify: `tests/blead-content.test.mjs`
- Regenerate: `Blead/index.html`

**Interfaces:**
- Produces: `setDisclosure(button, expanded) -> void`
- Produces: `openDeepLinkedWeek(hash) -> boolean`
- Produces: `resourceMatches(resourceElement, query, type) -> boolean`

- [ ] **Step 1: Add failing pure-function and markup-hook tests**

Test complete-token filtering, empty-query behavior, safe deep-link IDs, multiple independently expanded panels, `aria-expanded` synchronization, an `aria-live` result count, and a clear-filter button. Assert that every button's `aria-controls` points to an existing panel.

- [ ] **Step 2: Run the focused interaction test and verify missing exports**

Run: `node --test --test-name-pattern="Blead interactions" tests/blead-content.test.mjs`

Expected: FAIL because `assets/js/blead.js` does not exist.

- [ ] **Step 3: Implement progressive enhancement**

The module must:

- add `.blead-js` only after initialization;
- attach click handlers to disclosure buttons;
- keep multiple panels open;
- update `aria-expanded` and `hidden` together;
- open and scroll a safe `#week-*` deep link;
- filter only in-memory fictional resource cards;
- update `N sample resources shown` through `aria-live`;
- support Clear filters;
- avoid animation when `prefers-reduced-motion: reduce` matches.

Use pure exported helpers for unit tests and guard DOM initialization with `typeof document !== "undefined"`.

- [ ] **Step 4: Run interaction and full tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit interactions**

```bash
git add assets/js/blead.js Blead/index.html tests/blead-content.test.mjs
git commit -m "feat: add accessible Blead interactions"
```

### Task 6: KAINDLY Visual System and Responsive States

**Files:**
- Create: `assets/css/blead.css`
- Modify: `assets/css/blead-access.css`
- Modify: `tests/blead-content.test.mjs`
- Regenerate: `Blead/index.html`

**Interfaces:**
- Consumes: semantic classes produced by `renderBleadPage()`
- Produces: desktop, tablet, 390px, and 320px layouts

- [ ] **Step 1: Add failing stylesheet contract tests**

Assert violet anchor tokens, light surfaces, 5px default radius, visible `:focus-visible`, sticky-header target offsets, 44px minimum disclosure/menu targets, 320px single-column rules, independent state-label wrapping, `.blead-js` collapsed panel handling, and `prefers-reduced-motion` overrides.

- [ ] **Step 2: Run the focused style test and verify missing-file failure**

Run: `node --test --test-name-pattern="Blead stylesheet" tests/blead-content.test.mjs`

Expected: FAIL because `assets/css/blead.css` does not exist.

- [ ] **Step 3: Implement the approved visual direction**

Use existing site tokens and these core layout contracts:

```css
.blead-hero-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: clamp(32px, 5vw, 72px); }
.blead-week-header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 16px; }
.blead-disclosure { min-width: 44px; min-height: 44px; }
[id] { scroll-margin-top: 110px; }
@media (max-width: 760px) {
  .blead-hero-grid, .blead-overview-grid, .blead-resource-grid { grid-template-columns: 1fr; }
  .blead-week-header { grid-template-columns: auto minmax(0, 1fr) auto; }
  .blead-state { grid-column: 2; justify-self: start; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
}
```

Keep shadows minimal, omit orange, reserve honeydew for one informational notice, and maintain readable line lengths.

- [ ] **Step 4: Run all automated tests and static checks**

Run: `npm run build:blead && npm test && git diff --check`

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 5: Start the protected local prototype and verify access visually**

Create ignored `.env.local` using the owner-supplied password and a newly generated 32-byte session secret without printing either value. Run `npm run prototype:blead`. Verify the branded access screen, rejected-password state, successful access, and logout.

- [ ] **Step 6: Verify desktop and mobile layouts in the browser**

Check 1440px, 390px, and 320px widths. Confirm no horizontal overflow; the plan is visible near the first screen; the next-step card stacks directly after the hero; week state labels do not collide; one sample week is initially open; more than one week can remain open; FAQs and filters work; focus remains visible; Escape closes the menu; and console errors are absent.

- [ ] **Step 7: Commit visual implementation**

```bash
git add assets/css/blead.css assets/css/blead-access.css Blead/index.html tests/blead-content.test.mjs
git commit -m "style: complete Blead responsive prototype"
```

### Task 7: Privacy Audit, Full Verification, and Local Handoff

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Produces: documented local review command and route
- Preserves: local-only branch with no remote push or deployment

- [ ] **Step 1: Add the final public-bundle audit test**

Scan committed `/Blead/`, route-specific assets, generated HTML, and source maps for literal secrets, email addresses, client identifiers, dates, private URL schemes, tokens, meeting IDs, comments copied from the source brief, unfinished-marker strings, analytics, marketing pixels, newsletter scripts, forms other than the access/logout forms, and fake links. Assert no existing public page links to `/Blead/`.

- [ ] **Step 2: Run the audit test and fix any concrete finding**

Run: `node --test --test-name-pattern="Blead public bundle" tests/site.test.mjs`

Expected: PASS after every finding is removed or explicitly proven safe.

- [ ] **Step 3: Document the unpublished local review workflow**

Add a README section explaining:

- the exact route `/Blead/`;
- `npm run prototype:blead`;
- that `.env.local` supplies the password and signing secret and is never committed;
- that the prototype is sample-only and must not be pushed or deployed without separate approval;
- that Production and the public navigation remain unchanged.

- [ ] **Step 4: Run fresh full verification**

Run:

```bash
npm run build:blead
npm test
git diff --check
git status --short
```

Expected: all tests PASS, no diff errors, only intentional tracked changes, and `.env.local` absent from status.

- [ ] **Step 5: Re-run the complete browser story**

From a signed-out session: open `/Blead/`, verify redirect to access, reject an incorrect password, accept the owner-supplied password, verify all navigation/accordion/filter/help behaviors, reload with the cookie, deep-link to `#week-01`, log out, and verify protected files redirect again. Repeat layout checks at 1440px, 390px, and 320px.

- [ ] **Step 6: Commit the verified local handoff**

```bash
git add README.md tests/site.test.mjs
git commit -m "test: verify Blead protected prototype"
```

- [ ] **Step 7: Open the local prototype for owner reaction**

Keep `npm run prototype:blead` running, open `http://127.0.0.1:4173/Blead/` in the in-app browser, and report the password privately in chat only if the owner requests it. Do not push the branch, create a pull request, or deploy to Vercel.
