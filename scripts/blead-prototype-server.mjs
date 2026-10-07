import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BLEAD_COOKIE_NAME,
  BLEAD_FACILITATOR_COOKIE_NAME,
  clearBleadFacilitatorSession,
  clearBleadSession,
  isValidBleadConfiguration,
  readCookie,
  sanitizeBleadFacilitatorReturnTo,
  sanitizeBleadReturnTo,
  securePasswordMatch,
  serializeBleadFacilitatorSession,
  serializeBleadSession,
  signBleadFacilitatorSession,
  signBleadSession,
  verifyBleadFacilitatorSession,
  verifyBleadSession,
} from "../lib/blead-auth.js";
import {
  createFacilitatorHandlers,
  createParticipantResponseHandlers,
} from "../lib/blead-response-api.js";
import { BLEAD_DELETE_AFTER } from "../lib/blead-response-domain.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SESSION_MS = 8 * 60 * 60 * 1000;
const FACILITATOR_SESSION_MS = 4 * 60 * 60 * 1000;
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
const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/index.html",
  "/about/",
  "/about/index.html",
  "/assessment/",
  "/assessment/index.html",
  "/collective/",
  "/collective/index.html",
  "/contact/",
  "/contact/index.html",
  "/insights/",
  "/insights/index.html",
  "/insights/exclusion-inequity-ai/",
  "/insights/exclusion-inequity-ai/index.html",
  "/insights/kaindly-standards/",
  "/insights/kaindly-standards/index.html",
  "/insights/take-charge-of-your-ai-future/",
  "/insights/take-charge-of-your-ai-future/index.html",
  "/McLendon/",
  "/McLendon/index.html",
  "/privacy/",
  "/privacy/index.html",
  "/terms/",
  "/terms/index.html",
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
  return new URL(request.url, `http://${request.headers.host}`);
}

export function isLoopbackHost(host = "") {
  return /^(?:127\.0\.0\.1|localhost|\[::1\])(?::[0-9]{1,5})?$/iu.test(host);
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

async function toWebRequest(request, url) {
  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 65_536) throw new Error("Request body too large");
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body,
  });
}

async function sendWebResponse(response, webResponse) {
  const body = Buffer.from(await webResponse.arrayBuffer());
  const headers = Object.fromEntries(webResponse.headers.entries());
  headers["content-length"] = body.length;
  response.writeHead(webResponse.status, headers);
  response.end(body);
}

function resolveStaticFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.split("/").some((segment) => segment.startsWith("."))) return null;
  const isPublicAsset = decoded.startsWith("/assets/");
  const isProtectedBleadAsset = decoded === "/Blead" || decoded.startsWith("/Blead/");
  if (!PUBLIC_PAGE_PATHS.has(decoded) && !isPublicAsset && !isProtectedBleadAsset) return null;
  let relative = decoded.replace(/^\/+/, "");
  if (!relative || decoded.endsWith("/")) relative += "index.html";
  const target = resolve(ROOT, relative);
  if (target !== ROOT && !target.startsWith(`${ROOT}${sep}`)) return null;
  if (!existsSync(target) || !statSync(target).isFile()) return null;
  return target;
}

function serveFile(response, pathname, { noStore = false, noIndex = false } = {}) {
  const target = resolveStaticFile(pathname);
  if (!target) return send(response, 404, "Not found.", { "Cache-Control": "no-store" });
  const body = readFileSync(target);
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES.get(extname(target).toLowerCase()) || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": noStore ? "no-store" : "public, max-age=0, must-revalidate",
    ...(noIndex ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
  });
  response.end(body);
}

export function createInMemoryBleadResponseStore() {
  const rows = new Map();
  const keyFor = ({ participantId, workbookId, exerciseId }) => (
    `${participantId}:${workbookId}:${exerciseId}`
  );
  return {
    async upsert(snapshot) {
      const key = keyFor(snapshot);
      const existing = rows.get(key);
      const timestamp = new Date().toISOString();
      const row = {
        participant_id: snapshot.participantId,
        workbook_id: snapshot.workbookId,
        exercise_id: snapshot.exerciseId,
        payload: snapshot.payload,
        created_at: existing?.created_at ?? timestamp,
        updated_at: timestamp,
        delete_after: BLEAD_DELETE_AFTER,
      };
      rows.set(key, row);
      return [row];
    },
    async listByParticipant(participantId) {
      return [...rows.values()]
        .filter((row) => row.participant_id === participantId)
        .sort((left, right) => left.exercise_id.localeCompare(right.exercise_id));
    },
    async listAll() {
      return [...rows.values()].sort((left, right) => (
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      ));
    },
    async deleteExpired(now) {
      const deleted = [];
      for (const [key, row] of rows) {
        if (new Date(row.delete_after).getTime() <= new Date(now).getTime()) {
          rows.delete(key);
          deleted.push({ participant_id: row.participant_id });
        }
      }
      return deleted;
    },
  };
}

export function createBleadPrototypeServer({
  password,
  secret,
  facilitatorPassword,
  facilitatorSecret,
  store = createInMemoryBleadResponseStore(),
}) {
  const participantHandlers = createParticipantResponseHandlers({ store });
  const facilitatorHandlers = createFacilitatorHandlers({ store });
  return createServer(async (request, response) => {
    try {
      if (!isLoopbackHost(request.headers.host)) {
        return send(response, 403, "Request not accepted.", { "Cache-Control": "no-store" });
      }
      const url = requestUrl(request);
      const isBlead = url.pathname === "/Blead" || url.pathname.startsWith("/Blead/");
      const isFacilitator = url.pathname === "/Blead/facilitator"
        || url.pathname.startsWith("/Blead/facilitator/");

      if (isFacilitator) {
        if (url.pathname === "/Blead/facilitator/access" || url.pathname === "/Blead/facilitator/access/") {
          const token = readCookie(request.headers.cookie, BLEAD_FACILITATOR_COOKIE_NAME);
          if (request.method === "GET" && await verifyBleadFacilitatorSession(token, facilitatorSecret)) {
            return redirect(response, "/Blead/facilitator/");
          }
          if (request.method === "GET") {
            return serveFile(response, "/Blead/facilitator/access/index.html", {
              noStore: true,
              noIndex: true,
            });
          }
          if (!sameOriginPost(request, url)) {
            return send(response, 403, "Request not accepted.", { "Cache-Control": "no-store" });
          }
          const form = await readForm(request);
          const returnTo = sanitizeBleadFacilitatorReturnTo(form.get("returnTo") || "");
          if (!(await securePasswordMatch(form.get("password") || "", facilitatorPassword))) {
            await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
            const search = new URLSearchParams({ error: "1", returnTo });
            return redirect(
              response,
              `/Blead/facilitator/access/?${search}#access-error-noscript`,
            );
          }
          const tokenValue = await signBleadFacilitatorSession({
            expiresAt: Date.now() + FACILITATOR_SESSION_MS,
            secret: facilitatorSecret,
          });
          return redirect(response, returnTo, {
            "Set-Cookie": serializeBleadFacilitatorSession(tokenValue, { secure: false }),
          });
        }

        if (url.pathname === "/Blead/facilitator/logout/" && sameOriginPost(request, url)) {
          return redirect(response, "/Blead/facilitator/access/", {
            "Set-Cookie": clearBleadFacilitatorSession({ secure: false }),
          });
        }

        const token = readCookie(request.headers.cookie, BLEAD_FACILITATOR_COOKIE_NAME);
        if (!(await verifyBleadFacilitatorSession(token, facilitatorSecret))) {
          const search = new URLSearchParams({ returnTo: url.pathname + url.search });
          return redirect(response, `/Blead/facilitator/access/?${search}`);
        }
        if (url.pathname === "/Blead/facilitator/api/responses") {
          return sendWebResponse(
            response,
            await facilitatorHandlers.GET(await toWebRequest(request, url)),
          );
        }
        if (url.pathname === "/Blead/facilitator/api/export.csv") {
          return sendWebResponse(
            response,
            await facilitatorHandlers.EXPORT(await toWebRequest(request, url)),
          );
        }
        return serveFile(response, url.pathname, { noStore: true, noIndex: true });
      }

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
          if (returnHash) search.set("returnHash", returnHash);
          return redirect(response, `/Blead/access/?${search}#access-error-noscript`);
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

      if (url.pathname === "/Blead/api/responses") {
        const webRequest = await toWebRequest(request, url);
        const webResponse = request.method === "GET"
          ? await participantHandlers.GET(webRequest)
          : await participantHandlers.POST(webRequest);
        return sendWebResponse(response, webResponse);
      }

      if (isBlead) {
        const token = readCookie(request.headers.cookie, BLEAD_COOKIE_NAME);
        if (!(await verifyBleadSession(token, secret))) {
          const search = new URLSearchParams({ returnTo: url.pathname + url.search });
          return redirect(response, `/Blead/access/?${search}`);
        }
        return serveFile(response, url.pathname, { noStore: true, noIndex: true });
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
  const facilitatorPassword = process.env.BLEAD_FACILITATOR_PASSWORD;
  const facilitatorSecret = process.env.BLEAD_FACILITATOR_SESSION_SECRET;
  if (
    !isValidBleadConfiguration(password, secret)
    || !isValidBleadConfiguration(facilitatorPassword, facilitatorSecret)
  ) {
    process.stderr.write("Blead participant and facilitator credentials are required.\n");
    process.exitCode = 1;
    return;
  }

  const requestedPort = Number(process.env.BLEAD_PORT || 4173);
  const server = createBleadPrototypeServer({
    password,
    secret,
    facilitatorPassword,
    facilitatorSecret,
  });
  server.listen(requestedPort, "127.0.0.1", () => {
    const address = server.address();
    process.stdout.write(`BLEAD_SERVER_READY http://127.0.0.1:${address.port}\n`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) start();
