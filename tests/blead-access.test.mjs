import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { once } from "node:events";

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

test("local prototype server enforces the Blead access contract", async () => {
  const { base, child } = await startTestServer();
  try {
    const protectedResponse = await fetch(`${base}/Blead/`, { redirect: "manual" });
    assert.equal(protectedResponse.status, 303);
    assert.equal(new URL(protectedResponse.headers.get("location"), base).pathname, "/Blead/access/");
    assert.equal((await fetch(`${base}/Blead/access/`)).status, 200);
    assert.equal((await fetch(`${base}/about/`)).status, 200);

    const incorrect = await fetch(`${base}/Blead/access/`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: base },
      body: new URLSearchParams({ password: "wrong", returnTo: "/Blead/" }),
    });
    assert.equal(incorrect.status, 303);
    assert.match(incorrect.headers.get("location"), /error=1/);
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
