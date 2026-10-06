import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SESSION_MS = 8 * 60 * 60 * 1000;
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function loadLocalEnvironment() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/gu, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function redirect(response, location, headers = {}) {
  response.writeHead(303, { Location: location, "Cache-Control": "no-store", ...headers });
  response.end();
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

function requestUrl(request) {
  return new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
}

function sameOriginPost(request, url) {
  return request.method === "POST" && request.headers.origin === url.origin;
}

function safeReturnHash(value) {
  return /^#week-[0-9]{2}$/u.test(value) ? value : "";
}

async function readForm(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request body too large");
  }
  return new URLSearchParams(body);
}

function resolveStaticFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.split("/").some((segment) => segment.startsWith("."))) return null;
  let relative = decoded.replace(/^\/+/, "");
  if (!relative || decoded.endsWith("/")) relative += "index.html";
  const target = resolve(ROOT, relative);
  if (target !== ROOT && !target.startsWith(`${ROOT}${sep}`)) return null;
  if (!existsSync(target) || !statSync(target).isFile()) return null;
  return target;
}

function serveFile(response, pathname, { noStore = false } = {}) {
  const target = resolveStaticFile(pathname);
  if (!target) return send(response, 404, "Not found.", { "Cache-Control": "no-store" });
  const body = readFileSync(target);
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES.get(extname(target).toLowerCase()) || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": noStore ? "no-store" : "public, max-age=0, must-revalidate",
  });
  response.end(body);
}

export function createBleadPrototypeServer({ password, secret }) {
  return createServer(async (request, response) => {
    try {
      const url = requestUrl(request);
      const isBlead = url.pathname === "/Blead" || url.pathname.startsWith("/Blead/");

      if (url.pathname === "/Blead/access" || url.pathname === "/Blead/access/") {
        const token = readCookie(request.headers.cookie, BLEAD_COOKIE_NAME);
        if (request.method === "GET" && await verifyBleadSession(token, secret)) {
          return redirect(response, "/Blead/");
        }
        if (request.method === "GET") return serveFile(response, "/Blead/access/index.html", { noStore: true });
        if (!sameOriginPost(request, url)) return send(response, 403, "Request not accepted.", { "Cache-Control": "no-store" });

        const form = await readForm(request);
        const returnTo = sanitizeBleadReturnTo(form.get("returnTo") || "");
        const returnHash = safeReturnHash(form.get("returnHash") || "");
        if (!(await securePasswordMatch(form.get("password") || "", password))) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
          const search = new URLSearchParams({ error: "1", returnTo });
          return redirect(response, `/Blead/access/?${search}`);
        }

        const tokenValue = await signBleadSession({ expiresAt: Date.now() + SESSION_MS, secret });
        const destination = `${returnTo.split("#", 1)[0]}${returnHash || returnTo.match(/#[a-z0-9-]+$/iu)?.[0] || ""}`;
        return redirect(response, destination, {
          "Set-Cookie": serializeBleadSession(tokenValue, { secure: false }),
        });
      }

      if (url.pathname === "/Blead/logout/" && sameOriginPost(request, url)) {
        return redirect(response, "/Blead/access/", {
          "Set-Cookie": clearBleadSession({ secure: false }),
        });
      }

      if (isBlead) {
        const token = readCookie(request.headers.cookie, BLEAD_COOKIE_NAME);
        if (!(await verifyBleadSession(token, secret))) {
          const search = new URLSearchParams({ returnTo: url.pathname + url.search });
          return redirect(response, `/Blead/access/?${search}`);
        }
        return serveFile(response, url.pathname, { noStore: true });
      }

      return serveFile(response, url.pathname);
    } catch {
      return send(response, 500, "The local prototype could not complete this request.", { "Cache-Control": "no-store" });
    }
  });
}

function start() {
  loadLocalEnvironment();
  const password = process.env.BLEAD_PASSWORD;
  const secret = process.env.BLEAD_SESSION_SECRET;
  if (!password || !secret) {
    process.stderr.write("BLEAD_PASSWORD and BLEAD_SESSION_SECRET are required.\n");
    process.exitCode = 1;
    return;
  }

  const requestedPort = Number(process.env.BLEAD_PORT || 4173);
  const server = createBleadPrototypeServer({ password, secret });
  server.listen(requestedPort, "127.0.0.1", () => {
    const address = server.address();
    process.stdout.write(`BLEAD_SERVER_READY http://127.0.0.1:${address.port}\n`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) start();
