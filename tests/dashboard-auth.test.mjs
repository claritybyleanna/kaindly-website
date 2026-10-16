import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const NOW = Date.parse("2026-10-15T18:00:00.000Z");
const ALLOWED_EMAIL = "leanna.baker@kaindly.ai";
const ORIGINS = ["https://www.kaindly.ai", "https://kaindly-preview.vercel.app"];
const TEST_PUBLISHABLE_KEY = "pk_test_Y2xlcmsuaW5zcGlyZWQucHVtYS03NC5sY2wuZGV2JA";
const LIVE_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuZXhhbXBsZS5jb20k";
const TEST_SECRET_KEY = `sk_test_${"a".repeat(32)}`;
const LIVE_SECRET_KEY = `sk_live_${"b".repeat(32)}`;

function signedInFixture(overrides = {}) {
  const values = {
    email: ALLOWED_EMAIL,
    verificationStatus: "verified",
    primaryEmailAddressId: "email_primary",
    sessionCreatedAt: NOW - 60_000,
    userId: "user_123",
    sessionId: "sess_123",
    ...overrides,
  };
  const calls = { authenticate: [], users: [], sessions: [] };

  return {
    calls,
    options: {
      authenticateRequest: async (request, options) => {
        calls.authenticate.push({ request, options });
        if (values.authenticateError) throw new Error("Clerk unavailable");
        if (values.authenticated === false) {
          return { isAuthenticated: false, toAuth: () => ({ userId: null, sessionId: null }) };
        }
        return {
          isAuthenticated: true,
          toAuth: () => ({ userId: values.userId, sessionId: values.sessionId }),
        };
      },
      getUser: async (userId) => {
        calls.users.push(userId);
        if (values.getUserError) throw new Error("User lookup failed");
        return values.user ?? {
          id: values.userId,
          primaryEmailAddressId: values.primaryEmailAddressId,
          emailAddresses: values.emailAddresses ?? [{
            id: "email_primary",
            emailAddress: values.email,
            verification: { status: values.verificationStatus },
          }],
        };
      },
      getSession: async (sessionId) => {
        calls.sessions.push(sessionId);
        if (values.getSessionError) throw new Error("Session lookup failed");
        return values.session ?? {
          id: values.sessionId,
          userId: values.userId,
          status: "active",
          createdAt: values.sessionCreatedAt,
        };
      },
      now: NOW,
      allowedEmail: ALLOWED_EMAIL,
      authorizedOrigins: ORIGINS,
    },
  };
}

test("authorizes only a verified exact primary email with a session younger than four hours", async () => {
  const { createDashboardAuthorizer } = await import("../lib/dashboard-auth.js");
  const fixture = signedInFixture({
    email: "  LEANNA.BAKER@KAINDLY.AI  ",
    sessionCreatedAt: NOW - (4 * 60 * 60 * 1000) + 1,
  });
  const authorize = createDashboardAuthorizer(fixture.options);
  const request = new Request("https://www.kaindly.ai/dashboard/");

  assert.deepEqual(await authorize(request), {
    userId: "user_123",
    sessionId: "sess_123",
    email: ALLOWED_EMAIL,
  });
  assert.deepEqual(fixture.calls.authenticate[0].options, {
    authorizedParties: ORIGINS,
  });
  assert.deepEqual(fixture.calls.users, ["user_123"]);
  assert.deepEqual(fixture.calls.sessions, ["sess_123"]);
});

test("rejects absent sessions and every primary-email authorization mismatch", async (t) => {
  const { createDashboardAuthorizer } = await import("../lib/dashboard-auth.js");
  const cases = [
    ["signed out", { authenticated: false }],
    ["another address", { email: "other@kaindly.ai" }],
    ["plus alias", { email: "leanna.baker+dashboard@kaindly.ai" }],
    ["lookalike character", { email: "leanna.bakеr@kaindly.ai" }],
    ["Kelvin sign in local part", { email: "leanna.baKer@kaindly.ai" }],
    ["Kelvin sign in domain", { email: "leanna.baker@Kaindly.ai" }],
    ["zero-width variant", { email: "leanna.baker\u200b@kaindly.ai" }],
    ["unverified primary", { verificationStatus: "unverified" }],
    ["case-altered verification state", { verificationStatus: "VERIFIED" }],
    ["missing primary id", { primaryEmailAddressId: null }],
    ["primary object absent", { emailAddresses: [{ id: "email_other", emailAddress: ALLOWED_EMAIL, verification: { status: "verified" } }] }],
  ];

  for (const [name, overrides] of cases) {
    await t.test(name, async () => {
      const fixture = signedInFixture(overrides);
      assert.equal(
        await createDashboardAuthorizer(fixture.options)(new Request("https://www.kaindly.ai/dashboard/")),
        null,
      );
    });
  }
});

test("rejects sessions at the four-hour boundary, in the future, or with invalid creation times", async (t) => {
  const { createDashboardAuthorizer } = await import("../lib/dashboard-auth.js");
  const cases = [
    ["exactly four hours old", NOW - (4 * 60 * 60 * 1000)],
    ["older than four hours", NOW - (4 * 60 * 60 * 1000) - 1],
    ["created in the future", NOW + 1],
    ["not a timestamp", "yesterday"],
    ["missing timestamp", undefined],
  ];

  for (const [name, sessionCreatedAt] of cases) {
    await t.test(name, async () => {
      const fixture = signedInFixture({ sessionCreatedAt });
      assert.equal(
        await createDashboardAuthorizer(fixture.options)(new Request("https://www.kaindly.ai/dashboard/")),
        null,
      );
    });
  }
});

test("evaluates session age at request time when an authorizer is reused", async () => {
  const { createDashboardAuthorizer } = await import("../lib/dashboard-auth.js");
  let clock = NOW;
  const fixture = signedInFixture({ sessionCreatedAt: NOW - (60 * 60 * 1000) });
  const authorize = createDashboardAuthorizer({ ...fixture.options, now: () => clock });
  const request = new Request("https://www.kaindly.ai/dashboard/");

  assert.ok(await authorize(request));
  clock = NOW + (3 * 60 * 60 * 1000);
  assert.equal(await authorize(request), null);
});

test("fails closed for Clerk errors, inconsistent resources, and malformed configuration", async (t) => {
  const { createDashboardAuthorizer } = await import("../lib/dashboard-auth.js");
  const cases = [
    ["authentication failure", { authenticateError: true }],
    ["user lookup failure", { getUserError: true }],
    ["session lookup failure", { getSessionError: true }],
    ["wrong returned user", { user: { id: "other", primaryEmailAddressId: "email_primary", emailAddresses: [] } }],
    ["wrong returned session", { session: { id: "other", userId: "user_123", createdAt: NOW - 1 } }],
    ["session belongs to another user", { session: { id: "sess_123", userId: "other", createdAt: NOW - 1 } }],
  ];

  for (const [name, overrides] of cases) {
    await t.test(name, async () => {
      const fixture = signedInFixture(overrides);
      assert.equal(
        await createDashboardAuthorizer(fixture.options)(new Request("https://www.kaindly.ai/dashboard/")),
        null,
      );
    });
  }

  for (const malformed of [
    { authorizedOrigins: [] },
    { authorizedOrigins: ["*"] },
    { authorizedOrigins: ["https://www.kaindly.ai/path"] },
    { authorizedOrigins: ["https://user@example.com"] },
    { authorizedOrigins: ["javascript:alert(1)"] },
    { allowedEmail: "other@kaindly.ai" },
    { now: Number.NaN },
  ]) {
    const fixture = signedInFixture();
    const authorize = createDashboardAuthorizer({ ...fixture.options, ...malformed });
    assert.equal(await authorize(new Request("https://www.kaindly.ai/dashboard/")), null);
    assert.equal(fixture.calls.authenticate.length, 0);
  }
});

test("production authorizer passes only validated environment origins to Clerk", async () => {
  const {
    parseAuthorizedOrigins,
    validateClerkKeyPair,
  } = await import("../lib/dashboard-auth.js");
  assert.deepEqual(
    parseAuthorizedOrigins(" https://www.kaindly.ai,https://preview.example.vercel.app "),
    ["https://www.kaindly.ai", "https://preview.example.vercel.app"],
  );
  for (const value of [
    "",
    "https://www.kaindly.ai,",
    "https://www.kaindly.ai/path",
    "https://*.kaindly.ai",
    "http://www.kaindly.ai",
    "https://www.kaindly.ai#fragment",
  ]) {
    assert.equal(parseAuthorizedOrigins(value), null);
  }

  assert.deepEqual(validateClerkKeyPair(TEST_PUBLISHABLE_KEY, TEST_SECRET_KEY), {
    publishableKey: TEST_PUBLISHABLE_KEY,
    secretKey: TEST_SECRET_KEY,
    instanceType: "development",
  });
  assert.deepEqual(validateClerkKeyPair(LIVE_PUBLISHABLE_KEY, LIVE_SECRET_KEY), {
    publishableKey: LIVE_PUBLISHABLE_KEY,
    secretKey: LIVE_SECRET_KEY,
    instanceType: "production",
  });
  for (const [publishableKey, secretKey] of [
    ["pk_test_dashboard123", TEST_SECRET_KEY],
    [TEST_PUBLISHABLE_KEY, "sk_test_dashboard123"],
    [TEST_PUBLISHABLE_KEY, LIVE_SECRET_KEY],
    [LIVE_PUBLISHABLE_KEY, TEST_SECRET_KEY],
    [TEST_PUBLISHABLE_KEY, `sk_test_${"a".repeat(31)}!`],
  ]) {
    assert.equal(validateClerkKeyPair(publishableKey, secretKey), null);
  }
});

test("resolves the Clerk publishable key from Vercel's managed integration variable", async () => {
  const dashboardAuth = await import("../lib/dashboard-auth.js");
  assert.equal(typeof dashboardAuth.resolveClerkPublishableKey, "function");
  assert.equal(
    dashboardAuth.resolveClerkPublishableKey({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: LIVE_PUBLISHABLE_KEY,
    }),
    LIVE_PUBLISHABLE_KEY,
  );
  assert.equal(
    dashboardAuth.resolveClerkPublishableKey({
      CLERK_PUBLISHABLE_KEY: TEST_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: LIVE_PUBLISHABLE_KEY,
    }),
    TEST_PUBLISHABLE_KEY,
  );
});

test("auth configuration endpoint returns only the publishable key with private response headers", async () => {
  const previous = {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  };
  process.env.CLERK_PUBLISHABLE_KEY = TEST_PUBLISHABLE_KEY;
  process.env.CLERK_SECRET_KEY = TEST_SECRET_KEY;
  try {
    const { GET } = await import(`../api/dashboard-auth-config.js?test=${Date.now()}`);
    const response = await GET(new Request("https://www.kaindly.ai/api/dashboard-auth-config"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { publishableKey: TEST_PUBLISHABLE_KEY });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.doesNotMatch(JSON.stringify(await (await GET()).json()), /secret|sk_(?:test|live)_|leanna\.baker/iu);
  } finally {
    if (previous.publishableKey === undefined) delete process.env.CLERK_PUBLISHABLE_KEY;
    else process.env.CLERK_PUBLISHABLE_KEY = previous.publishableKey;
    if (previous.secretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous.secretKey;
  }
});

test("Vercel routes the public dashboard auth configuration URL to its physical function", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(config.rewrites.some(({ source, destination }) => (
    source === "/dashboard/api/auth-config" && destination === "/api/dashboard-auth-config"
  )));
});

test("auth configuration endpoint fails closed when either Clerk key is malformed or mismatched", async () => {
  const previous = {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  };
  try {
    for (const [publishableKey, secretKey] of [
      [undefined, TEST_SECRET_KEY],
      ["", TEST_SECRET_KEY],
      ["pk_test_dashboard123", TEST_SECRET_KEY],
      [TEST_PUBLISHABLE_KEY, undefined],
      [TEST_PUBLISHABLE_KEY, "sk_test_dashboard123"],
      [TEST_PUBLISHABLE_KEY, LIVE_SECRET_KEY],
      [LIVE_PUBLISHABLE_KEY, TEST_SECRET_KEY],
    ]) {
      if (publishableKey === undefined) delete process.env.CLERK_PUBLISHABLE_KEY;
      else process.env.CLERK_PUBLISHABLE_KEY = publishableKey;
      if (secretKey === undefined) delete process.env.CLERK_SECRET_KEY;
      else process.env.CLERK_SECRET_KEY = secretKey;
      const { GET } = await import(`../api/dashboard-auth-config.js?test=${Math.random()}`);
      const response = await GET(new Request("https://www.kaindly.ai/api/dashboard-auth-config"));
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: "Authentication is temporarily unavailable." });
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    }
  } finally {
    if (previous.publishableKey === undefined) delete process.env.CLERK_PUBLISHABLE_KEY;
    else process.env.CLERK_PUBLISHABLE_KEY = previous.publishableKey;
    if (previous.secretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous.secretKey;
  }
});

test("browser entry requests a Clerk email code and activates only the completed session", async () => {
  const {
    requestDashboardEmailCode,
    verifyDashboardEmailCode,
  } = await import("../assets/js/dashboard-auth-entry.js");
  const calls = [];
  const signInAttempt = {
    supportedFirstFactors: [{ strategy: "email_code", emailAddressId: "email_primary" }],
    prepareFirstFactor: async (params) => calls.push(["prepare", params]),
    attemptFirstFactor: async (params) => {
      calls.push(["attempt", params]);
      return { status: "complete", createdSessionId: "sess_123" };
    },
  };
  const clerk = {
    client: {
      signIn: {
        create: async (params) => (calls.push(["create", params]), signInAttempt),
      },
    },
    setActive: async (params) => calls.push(["active", params]),
  };
  const redirects = [];

  const preparedAttempt = await requestDashboardEmailCode({
    clerk,
    identifier: "person@example.com",
  });
  await verifyDashboardEmailCode({
    clerk,
    signInAttempt: preparedAttempt,
    code: "123456",
    redirectTo: (url) => redirects.push(url),
  });

  assert.deepEqual(calls, [
    ["create", { identifier: "person@example.com" }],
    ["prepare", {
      strategy: "email_code",
      emailAddressId: "email_primary",
    }],
    ["attempt", { strategy: "email_code", code: "123456" }],
    ["active", { session: "sess_123" }],
  ]);
  assert.deepEqual(redirects, ["/dashboard/"]);
});

test("browser form always shows one neutral PIN confirmation and never embeds a server secret", async () => {
  const {
    EMAIL_CODE_CONFIRMATION,
    submitDashboardEmailCodeRequest,
  } = await import("../assets/js/dashboard-auth-entry.js");
  const status = { textContent: "" };
  const button = { disabled: false };
  const failingClerk = {
    client: { signIn: { create: async () => { throw new Error("unknown account"); } } },
  };

  const attempt = await submitDashboardEmailCodeRequest({
    clerk: failingClerk,
    identifier: "unknown@example.com",
    status,
    button,
  });
  assert.equal(attempt, null);
  assert.equal(status.textContent, EMAIL_CODE_CONFIRMATION);
  assert.equal(button.disabled, false);
  assert.doesNotMatch(status.textContent, /unknown|not found|authorized|account/iu);

  const source = await readFile(new URL("../assets/js/dashboard-auth-entry.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /CLERK_SECRET_KEY|sk_(?:test|live)_|leanna\.baker@kaindly\.ai/u);
  assert.match(source, /import\("@clerk\/clerk-js"\)/u);
});

test("browser auth entry bundles for the browser with the installed Clerk SDK", async () => {
  const { build } = await import("esbuild");
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../assets/js/dashboard-auth-entry.js", import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
  });
  assert.ok(result.outputFiles[0].contents.byteLength > 10_000);
  const bundle = result.outputFiles[0].text;
  assert.doesNotMatch(bundle, /CLERK_SECRET_KEY|sk_(?:test|live)_|leanna\.baker@kaindly\.ai/u);
});

test("middleware protects dashboard HTML but passes pretty dashboard APIs to their own authorizers", async () => {
  const {
    handleDashboardRoute,
    isDashboardFunctionPath,
    isDashboardPublicPath,
    isProtectedDashboardPath,
  } = await import("../middleware.js");

  assert.equal(isProtectedDashboardPath("/dashboard/"), true);
  assert.equal(isProtectedDashboardPath("/dashboard/responses"), true);
  assert.equal(isProtectedDashboardPath("/Dashboard/"), false);
  for (const pathname of [
    "/dashboard/access",
    "/dashboard/access/",
    "/dashboard/verify",
    "/dashboard/verify/",
    "/dashboard/api/auth-config",
  ]) {
    assert.equal(isDashboardPublicPath(pathname), true);
    const response = await handleDashboardRoute(new Request(`https://www.kaindly.ai${pathname}`), {
      authorize: async () => { throw new Error("public route must not authenticate"); },
    });
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  }

  for (const pathname of [
    "/dashboard/api/responses",
    "/dashboard/api/export.csv",
  ]) {
    assert.equal(isDashboardFunctionPath(pathname), true);
    const response = await handleDashboardRoute(new Request(`https://www.kaindly.ai${pathname}`), {
      authorize: async () => { throw new Error("pretty API must defer to its physical function"); },
    });
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  }

  const allowed = await handleDashboardRoute(
    new Request("https://www.kaindly.ai/dashboard/?client=bracco"),
    { authorize: async () => ({ userId: "user_123" }) },
  );
  assert.equal(allowed.headers.get("x-middleware-next"), "1");

  const denied = await handleDashboardRoute(
    new Request("https://www.kaindly.ai/dashboard/?client=bracco"),
    { authorize: async () => null },
  );
  assert.equal(denied.status, 303);
  const location = new URL(denied.headers.get("location"));
  assert.equal(location.pathname, "/dashboard/access/");
  assert.equal(location.searchParams.get("returnTo"), "/dashboard/?client=bracco");
  assert.equal(denied.headers.get("cache-control"), "private, no-store");
  assert.equal(denied.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("default middleware fails closed for protected dashboard HTML and does not intercept physical APIs", async () => {
  const keys = [
    "VERCEL_ENV",
    "VERCEL_TARGET_ENV",
    "CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "DASHBOARD_ALLOWED_EMAIL",
    "DASHBOARD_AUTHORIZED_ORIGINS",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.VERCEL_ENV = "development";
  delete process.env.VERCEL_TARGET_ENV;
  delete process.env.CLERK_PUBLISHABLE_KEY;
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.DASHBOARD_ALLOWED_EMAIL;
  delete process.env.DASHBOARD_AUTHORIZED_ORIGINS;
  try {
    const { default: middleware } = await import("../middleware.js");
    const protectedResponse = await middleware(new Request("https://www.kaindly.ai/dashboard/"));
    assert.equal(protectedResponse.status, 303);
    assert.equal(new URL(protectedResponse.headers.get("location")).pathname, "/dashboard/access/");

    for (const path of ["/api/dashboard-auth-config", "/api/dashboard-responses", "/api/dashboard-export"]) {
      const response = await middleware(new Request(`https://www.kaindly.ai${path}`));
      assert.equal(response.headers.get("x-middleware-next"), "1");
    }
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
