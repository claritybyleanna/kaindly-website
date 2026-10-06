import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { request as httpRequest } from "node:http";

test("Blead access page is branded, generic, and safe", () => {
  const html = readFileSync("Blead/access/index.html", "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /Leadership Learning Hub/);
  assert.match(html, /src="\.\.\/\.\.\/assets\/brand\/logo-secondary-violet\.svg" alt="KAINDLY"/);
  assert.match(html, /<form[^>]+method="post"[^>]+action="\/Blead\/access\/"[^>]*>/);
  assert.match(html, /<label for="program-password">Program password<\/label>/);
  assert.match(html, /<input[^>]+id="program-password"[^>]+name="password"[^>]+type="password"[^>]+required/);
  assert.match(html, /name="returnTo"[^>]+value="\/Blead\/"/);
  assert.match(html, /name="returnHash"[^>]+value=""/);
  assert.match(html, /role="alert"[^>]+aria-live="assertive"[^>]+hidden[^>]+data-access-error/);
  assert.match(html, /<noscript>[\s\S]*#access-error-noscript:not\(:target\)[^}]*display:\s*none[\s\S]*password was not accepted[\s\S]*<\/noscript>/i);
  assert.match(html, /id="access-error-noscript"/);
  assert.doesNotMatch(html, /newsletter|beehiiv|acuity|typeform|analytics|gtag|BLEAD_PASSWORD|SESSION_SECRET/i);
  assert.doesNotMatch(html, /name="password"[^>]+value=/i);
});

async function startTestServer() {
  const child = spawn(process.execPath, ["scripts/blead-prototype-server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BLEAD_PASSWORD: "test-password",
      BLEAD_SESSION_SECRET: "test-session-secret-with-adequate-length",
      BLEAD_PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.setEncoding("utf8");
  const ready = new Promise((resolve, reject) => {
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const match = stdout.match(/BLEAD_SERVER_READY (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) resolve(match[1]);
    });
    child.once("exit", (code) => reject(new Error(`server exited ${code}: ${stderr}`)));
  });

  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`server start timeout: ${stderr}`)), 5_000));
  const base = await Promise.race([ready, timeout]);
  return { base, child };
}

async function stopTestServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await once(child, "exit");
}

function requestWithHost(base, host) {
  const target = new URL(base);
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: target.hostname,
      port: target.port,
      path: "/Blead/access/",
      headers: { host },
    }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    request.once("error", reject);
    request.end();
  });
}

test("local prototype server enforces the Blead access contract", async () => {
  const { base, child } = await startTestServer();
  try {
    const protectedResponse = await fetch(`${base}/Blead/`, { redirect: "manual" });
    assert.equal(protectedResponse.status, 303);
    assert.equal(new URL(protectedResponse.headers.get("location"), base).pathname, "/Blead/access/");
    assert.equal((await fetch(`${base}/Blead/access/`)).status, 200);
    assert.equal((await fetch(`${base}/about/`)).status, 200);
    assert.equal((await fetch(`${base}/assets/css/site.css`)).status, 200);
    for (const privatePath of [
      "/package.json",
      "/docs/superpowers/specs/2026-10-06-blead-learning-hub-prototype-design.md",
      "/tests/site.test.mjs",
      "/scripts/build-blead.mjs",
      "/lib/blead-auth.js",
      "/.env.local",
      "/%2e%2e/package.json",
    ]) {
      assert.equal((await fetch(`${base}${privatePath}`)).status, 404, `${privatePath} must not be public`);
    }
    assert.equal(await requestWithHost(base, "attacker.example"), 403);

    const { isLoopbackHost } = await import("../scripts/blead-prototype-server.mjs");
    assert.equal(isLoopbackHost("127.0.0.1:4173"), true);
    assert.equal(isLoopbackHost("localhost:4173"), true);
    assert.equal(isLoopbackHost("[::1]:4173"), true);
    assert.equal(isLoopbackHost("example.test"), false);

    const crossOrigin = await fetch(`${base}/Blead/access/`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://attacker.example" },
      body: new URLSearchParams({ password: "test-password", returnTo: "/Blead/" }),
    });
    assert.equal(crossOrigin.status, 403);

    const incorrect = await fetch(`${base}/Blead/access/`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: base },
      body: new URLSearchParams({ password: "wrong", returnTo: "/Blead/", returnHash: "#week-01" }),
    });
    assert.equal(incorrect.status, 303);
    assert.match(incorrect.headers.get("location"), /error=1/);
    const retryUrl = new URL(incorrect.headers.get("location"), base);
    assert.equal(retryUrl.searchParams.get("returnHash"), "#week-01");
    assert.equal(retryUrl.hash, "#access-error-noscript");
    assert.equal(incorrect.headers.get("set-cookie"), null);

    const correct = await fetch(`${base}/Blead/access/`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: base },
      body: new URLSearchParams({ password: "test-password", returnTo: "/Blead/", returnHash: "#week-01" }),
    });
    assert.equal(correct.status, 303);
    assert.equal(correct.headers.get("location"), "/Blead/#week-01");
    const cookie = correct.headers.get("set-cookie");
    assert.match(cookie, /^kaindly_blead_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.doesNotMatch(cookie, /test-password/);

    const authenticated = await fetch(`${base}/Blead/`, {
      headers: { cookie: cookie.split(";", 1)[0] },
      redirect: "manual",
    });
    assert.equal(authenticated.status, 200);
    assert.equal(authenticated.headers.get("cache-control"), "no-store");
    const protectedContent = await fetch(`${base}/Blead/content.js`, {
      headers: { cookie: cookie.split(";", 1)[0] },
      redirect: "manual",
    });
    assert.equal(protectedContent.status, 200);
    const tampered = await fetch(`${base}/Blead/content.js`, {
      headers: { cookie: `${cookie.split(";", 1)[0]}x` },
      redirect: "manual",
    });
    assert.equal(tampered.status, 303);

    const logout = await fetch(`${base}/Blead/logout/`, {
      method: "POST",
      redirect: "manual",
      headers: { origin: base, cookie: cookie.split(";", 1)[0] },
    });
    assert.equal(logout.status, 303);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  } finally {
    await stopTestServer(child);
  }
});
