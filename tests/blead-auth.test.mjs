import test from "node:test";
import assert from "node:assert/strict";
import {
  BLEAD_COOKIE_NAME,
  clearBleadSession,
  isValidBleadConfiguration,
  readCookie,
  sanitizeBleadReturnTo,
  securePasswordMatch,
  serializeBleadSession,
  signBleadSession,
  verifyBleadSession,
} from "../lib/blead-auth.js";

test("Blead configuration requires a distinct 32-byte signing secret", async () => {
  assert.equal(isValidBleadConfiguration("review-password", "a".repeat(32)), true);
  assert.equal(isValidBleadConfiguration("review-password", "short-secret"), false);
  assert.equal(isValidBleadConfiguration("same-value".repeat(4), "same-value".repeat(4)), false);
  await assert.rejects(
    signBleadSession({ expiresAt: 20_000, secret: "short-secret" }),
    /at least 32 bytes/,
  );
});

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
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/Blead\//);
  assert.equal(readCookie(`${cookie}; another=value`, BLEAD_COOKIE_NAME), "signed-token");
  assert.equal(readCookie(null, BLEAD_COOKIE_NAME), undefined);
  assert.match(clearBleadSession({ secure: true }), /Max-Age=0/);
});

test("return destinations cannot leave the protected route", () => {
  assert.equal(sanitizeBleadReturnTo("/Blead/"), "/Blead/");
  assert.equal(sanitizeBleadReturnTo("/Blead/#week-01"), "/Blead/#week-01");
  assert.equal(
    sanitizeBleadReturnTo("/Blead/session-1-prompts/"),
    "/Blead/session-1-prompts/",
  );
  assert.equal(
    sanitizeBleadReturnTo("/Blead/session-1-prompts/#prompt-02"),
    "/Blead/session-1-prompts/#prompt-02",
  );
  assert.equal(sanitizeBleadReturnTo("/Blead/../contact/"), "/Blead/");
  assert.equal(sanitizeBleadReturnTo("https://attacker.example"), "/Blead/");
  assert.equal(sanitizeBleadReturnTo("//attacker.example"), "/Blead/");
  assert.equal(sanitizeBleadReturnTo("/contact/"), "/Blead/");
});

test("the access page preserves safe nested workbook destinations", async () => {
  const accessModule = await import("../assets/js/blead-access.js");
  assert.equal(typeof accessModule.sanitizeBleadAccessReturnTo, "function");
  assert.equal(
    accessModule.sanitizeBleadAccessReturnTo("/Blead/session-1-prompts/"),
    "/Blead/session-1-prompts/",
  );
  assert.equal(
    accessModule.sanitizeBleadAccessReturnTo("/Blead/../contact/"),
    "/Blead/",
  );
});

async function withBleadEnvironment(values, run) {
  const keys = ["VERCEL_ENV", "VERCEL_TARGET_ENV", "BLEAD_PASSWORD", "BLEAD_SESSION_SECRET"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }

  try {
    return await run();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

const testEnvironment = {
  VERCEL_ENV: "development",
  BLEAD_PASSWORD: "test-password",
  BLEAD_SESSION_SECRET: "test-session-secret-with-adequate-length",
};

test("Blead middleware protects only the learning hub and its content", async () => {
  const { default: middleware, isProtectedBleadPath } = await import("../middleware.js");
  await withBleadEnvironment(testEnvironment, async () => {
    assert.equal(isProtectedBleadPath("/Blead/"), true);
    assert.equal(isProtectedBleadPath("/blead/"), false);
    assert.equal(isProtectedBleadPath("/about/"), false);

    const publicResponse = await middleware(new Request("https://www.kaindly.ai/about/"));
    assert.equal(publicResponse.headers.get("x-middleware-next"), "1");

    const protectedResponse = await middleware(new Request("https://www.kaindly.ai/Blead/"));
    assert.equal(protectedResponse.status, 303);
    const accessUrl = new URL(protectedResponse.headers.get("location"));
    assert.equal(accessUrl.pathname, "/Blead/access/");
    assert.equal(accessUrl.searchParams.get("returnTo"), "/Blead/");

    const contentResponse = await middleware(new Request("https://www.kaindly.ai/Blead/content.js"));
    assert.equal(contentResponse.status, 303);
  });
});

test("Blead access rejects a bad password without exposing it", async () => {
  const { default: middleware } = await import("../middleware.js");
  await withBleadEnvironment(testEnvironment, async () => {
    const body = new URLSearchParams({ password: "wrong", returnTo: "/Blead/", returnHash: "#week-01" });
    const response = await middleware(new Request("https://www.kaindly.ai/Blead/access/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.kaindly.ai",
      },
      body,
    }));
    assert.equal(response.status, 303);
    assert.match(response.headers.get("location"), /error=1/);
    const retryUrl = new URL(response.headers.get("location"));
    assert.equal(retryUrl.searchParams.get("returnHash"), "#week-01");
    assert.equal(retryUrl.hash, "#access-error-noscript");
    assert.doesNotMatch(response.headers.get("location"), /wrong/);
    assert.equal(response.headers.get("set-cookie"), null);
  });
});

test("Blead access creates a scoped session and sanitizes its return destination", async () => {
  const { default: middleware } = await import("../middleware.js");
  await withBleadEnvironment(testEnvironment, async () => {
    const body = new URLSearchParams({
      password: testEnvironment.BLEAD_PASSWORD,
      returnTo: "https://attacker.example/",
      returnHash: "#week-01",
    });
    const response = await middleware(new Request("https://www.kaindly.ai/Blead/access/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.kaindly.ai",
      },
      body,
    }));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/Blead/#week-01");
    assert.match(response.headers.get("set-cookie"), new RegExp(`^${BLEAD_COOKIE_NAME}=`));
    assert.doesNotMatch(response.headers.get("set-cookie"), /test-password/);
  });
});

test("Blead middleware accepts valid sessions and rejects tampered sessions", async () => {
  const { default: middleware } = await import("../middleware.js");
  await withBleadEnvironment(testEnvironment, async () => {
    const token = await signBleadSession({
      expiresAt: Date.now() + 60_000,
      secret: testEnvironment.BLEAD_SESSION_SECRET,
    });
    const valid = await middleware(new Request("https://www.kaindly.ai/Blead/", {
      headers: { cookie: `${BLEAD_COOKIE_NAME}=${token}` },
    }));
    assert.equal(valid.headers.get("x-middleware-next"), "1");
    assert.equal(valid.headers.get("cache-control"), "private, no-store");

    const tampered = await middleware(new Request("https://www.kaindly.ai/Blead/", {
      headers: { cookie: `${BLEAD_COOKIE_NAME}=${token}x` },
    }));
    assert.equal(tampered.status, 303);
  });
});

test("Blead middleware fails closed only for Blead when configuration is missing", async () => {
  const { default: middleware } = await import("../middleware.js");
  await withBleadEnvironment({ VERCEL_ENV: "development" }, async () => {
    const protectedResponse = await middleware(new Request("https://www.kaindly.ai/Blead/"));
    assert.equal(protectedResponse.status, 503);
    assert.equal(protectedResponse.headers.get("cache-control"), "no-store");

    const publicResponse = await middleware(new Request("https://www.kaindly.ai/about/"));
    assert.equal(publicResponse.headers.get("x-middleware-next"), "1");
  });

  await withBleadEnvironment({
    VERCEL_ENV: "development",
    BLEAD_PASSWORD: "same-value".repeat(4),
    BLEAD_SESSION_SECRET: "same-value".repeat(4),
  }, async () => {
    const protectedResponse = await middleware(new Request("https://www.kaindly.ai/Blead/"));
    assert.equal(protectedResponse.status, 503);
  });
});

test("Blead logout clears the scoped session", async () => {
  const { default: middleware } = await import("../middleware.js");
  await withBleadEnvironment(testEnvironment, async () => {
    const response = await middleware(new Request("https://www.kaindly.ai/Blead/logout/", {
      method: "POST",
      headers: { origin: "https://www.kaindly.ai" },
    }));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/Blead/access/");
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  });
});
