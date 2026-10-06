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
