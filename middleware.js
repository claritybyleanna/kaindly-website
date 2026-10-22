import { handlePassphraseLogin, handlePassphraseLogout } from "./lib/dashboard-passphrase.js";
import { next } from "@vercel/functions";
import { handleExecutiveAlpha } from "./lib/owref2026.js";
import { authorizeDashboardRequest } from "./lib/dashboard-auth.js";
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
} from "./lib/blead-auth.js";
import {
  BSALES_COOKIE_NAME,
  clearBsalesSession,
  sanitizeBsalesReturnTo,
  serializeBsalesSession,
  signBsalesSession,
  verifyBsalesSession,
} from "./lib/bsales-auth.js";
import {
  MCLENDON_COOKIE_NAME,
  isValidMclendonSessionSecret,
  serializeMclendonSession,
  signMclendonSession,
  verifyMclendonSession,
} from "./lib/mclendon-auth.js";
import {
  OWR_COOKIE_NAME,
  clearOwrSession,
  sanitizeOwrReturnTo,
  serializeOwrSession,
  signOwrSession,
  verifyOwrSession,
} from "./lib/owr-auth.js";

const FULL_SITE_ENVIRONMENTS = new Set(["production", "preview", "development"]);
const BLEAD_SESSION_MS = 8 * 60 * 60 * 1000;
const BLEAD_FACILITATOR_SESSION_MS = 4 * 60 * 60 * 1000;
const BSALES_SESSION_MS = 8 * 60 * 60 * 1000;
const MCLENDON_SESSION_MS = 8 * 60 * 60 * 1000;
const OWR_SESSION_MS = 8 * 60 * 60 * 1000;

export function isFullSiteEnvironment(value = process.env.VERCEL_TARGET_ENV ?? process.env.VERCEL_ENV) {
  return FULL_SITE_ENVIRONMENTS.has(value);
}

const maintenanceDocument = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KAINDLY | Site Update</title>
  <meta name="description" content="The KAINDLY website is being thoughtfully updated.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,600;1,300&amp;family=Jost:wght@600;700&amp;family=Urbanist:wght@400;500;600&amp;display=swap" rel="stylesheet">
  <style>
    :root {
      --violet: #634cc8;
      --violet-deep: #4d39a6;
      --periwinkle: #8c6efc;
      --periwinkle-25: #e2dbfe;
      --honeydew-50: #eafac4;
      --charcoal: #242424;
      --muted: #686670;
      --white: #ffffff;
      --shadow: 0 28px 80px rgba(48, 35, 107, 0.16);
    }

    * { box-sizing: border-box; }

    body {
      min-width: 320px;
      min-height: 100vh;
      margin: 0;
      background: var(--periwinkle-25);
      color: var(--charcoal);
      font-family: "Urbanist", "Avenir Next", Avenir, sans-serif;
      line-height: 1.45;
    }

    .maintenance-shell {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 40px 24px;
    }

    .maintenance-card {
      width: min(720px, 100%);
      padding: clamp(38px, 7vw, 72px);
      border: 1px solid rgba(99, 76, 200, 0.2);
      border-radius: 8px;
      background: var(--white);
      box-shadow: var(--shadow);
      text-align: center;
    }

    .maintenance-logo {
      width: min(210px, 62vw);
      height: auto;
      margin: 0 auto 34px;
    }

    .maintenance-accent {
      width: 58px;
      height: 4px;
      margin: 0 auto 30px;
      border-radius: 999px;
      background: var(--periwinkle);
    }

    .eyebrow {
      margin: 0 0 16px;
      color: var(--muted);
      font-family: "Archivo", "Helvetica Neue", Arial, sans-serif;
      font-size: 0.76rem;
      font-style: italic;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 24px;
      color: var(--violet);
      font-family: "Jost", "Avenir Next", Avenir, sans-serif;
      font-size: clamp(2.6rem, 7vw, 4.8rem);
      line-height: 0.95;
      letter-spacing: -0.045em;
    }

    .message {
      max-width: 560px;
      margin: 0 auto 28px;
      color: var(--muted);
      font-size: clamp(1.05rem, 2vw, 1.25rem);
    }

    .contact {
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      margin: 0 0 34px;
      padding: 12px 16px;
      border-radius: 5px;
      background: var(--honeydew-50);
      font-weight: 600;
    }

    .contact a {
      color: var(--violet-deep);
      text-underline-offset: 3px;
    }

    .contact a:focus-visible {
      outline: 3px solid var(--periwinkle);
      outline-offset: 4px;
    }

    .tagline {
      margin: 0;
      color: var(--violet);
      font-family: "Jost", "Avenir Next", Avenir, sans-serif;
      font-weight: 700;
    }

    @media (max-width: 600px) {
      .maintenance-shell { padding: 18px; }
      .maintenance-card { padding: 38px 24px; }
      .maintenance-logo { margin-bottom: 28px; }
      .contact { display: block; }
      .contact a { display: block; margin-top: 3px; }
    }
  </style>
</head>
<body>
  <main class="maintenance-shell">
    <section class="maintenance-card" aria-labelledby="maintenance-title">
      <img class="maintenance-logo" src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY">
      <div class="maintenance-accent" aria-hidden="true"></div>
      <p class="eyebrow">A Thoughtful Update Is Underway</p>
      <h1 id="maintenance-title">Our site is being updated.</h1>
      <p class="message">Thank you for your patience while we make thoughtful improvements to the KAINDLY experience. We&rsquo;ll be back soon.</p>
      <p class="contact">Need to reach us? <a href="mailto:hello@kaindly.ai">hello@kaindly.ai</a></p>
      <p class="tagline">Lead AI. Don&rsquo;t Chase It.</p>
    </section>
  </main>
</body>
</html>`;

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!assets/).*)"],
};

function maintenanceResponse() {
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

export function isProtectedBleadPath(pathname) {
  return pathname === "/Blead" || pathname.startsWith("/Blead/");
}

export function isFacilitatorPath(pathname) {
  return pathname === "/Blead/facilitator" || pathname.startsWith("/Blead/facilitator/");
}

export function isProtectedBsalesPath(pathname) {
  return pathname === "/bsales" || pathname.startsWith("/bsales/");
}

export function isMclendonEntryPath(pathname) {
  return pathname === "/McLendon" || pathname === "/McLendon/";
}

export function isProtectedOwrPath(pathname) {
  return pathname === "/OWR" || pathname.startsWith("/OWR/");
}

export function isProtectedDashboardPath(pathname) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isDashboardPublicPath(pathname) {
  return pathname === "/dashboard/access"
    || pathname === "/dashboard/access/"
    || pathname === "/dashboard/verify"
    || pathname === "/dashboard/verify/"
    || pathname === "/dashboard/api/auth-config"
    || pathname === "/dashboard/api/auth-config/";
}

export function isDashboardFunctionPath(pathname) {
  return pathname === "/dashboard/api/owr-help"
    || pathname === "/dashboard/api/owr-help/"
    || pathname === "/dashboard/api/responses"
    || pathname === "/dashboard/api/responses/"
    || pathname === "/dashboard/api/export.csv"
    || pathname === "/dashboard/api/export.csv/";
}

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: String(location),
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function permanentRedirect(location) {
  return new Response(null, {
    status: 308,
    headers: {
      Location: String(location),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function nextProtected() {
  const response = next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function sanitizeDashboardReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/dashboard")) return "/dashboard/";
  if (value.startsWith("//") || /[\r\n]/u.test(value)) return "/dashboard/";
  return value;
}

export async function handleDashboardRoute(
  request,
  { authorize = authorizeDashboardRequest } = {},
) {
  const url = new URL(request.url);
  if (isDashboardPublicPath(url.pathname) || isDashboardFunctionPath(url.pathname)) {
    return nextProtected();
  }

  let identity = null;
  try {
    identity = await authorize(request);
  } catch {
    identity = null;
  }
  if (identity) return nextProtected();

  const accessUrl = new URL("/dashboard/access/", url);
  accessUrl.searchParams.set("returnTo", sanitizeDashboardReturnTo(url.pathname + url.search));
  const response = redirect(accessUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function isSameOriginPost(request, url) {
  return request.method === "POST" && request.headers.get("origin") === url.origin;
}

function safeReturnHash(value) {
  return /^#week-[0-9]{2}$/u.test(value) ? value : "";
}

export async function handleBleadAccess(
  request,
  { password, secret, now = Date.now(), failureDelayMs = 350 } = {},
) {
  const url = new URL(request.url);
  if (!isSameOriginPost(request, url)) {
    return new Response("Request not accepted.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const formData = await request.formData();
  const candidate = String(formData.get("password") ?? "");
  const returnTo = sanitizeBleadReturnTo(String(formData.get("returnTo") ?? ""));
  const returnHash = safeReturnHash(String(formData.get("returnHash") ?? ""));

  if (!(await securePasswordMatch(candidate, password))) {
    await new Promise((resolve) => setTimeout(resolve, failureDelayMs));
    const accessUrl = new URL("/Blead/access/", url);
    accessUrl.searchParams.set("error", "1");
    accessUrl.searchParams.set("returnTo", returnTo);
    if (returnHash) accessUrl.searchParams.set("returnHash", returnHash);
    accessUrl.hash = "access-error-noscript";
    return redirect(accessUrl);
  }

  const token = await signBleadSession({ expiresAt: now + BLEAD_SESSION_MS, secret });
  const destination = `${returnTo.split("#", 1)[0]}${returnHash || returnTo.match(/#[a-z0-9-]+$/iu)?.[0] || ""}`;
  return redirect(destination, {
    "Set-Cookie": serializeBleadSession(token, { secure: url.protocol === "https:" }),
  });
}

export async function handleBleadFacilitatorAccess(
  request,
  { password, secret, now = Date.now(), failureDelayMs = 350 } = {},
) {
  const url = new URL(request.url);
  if (!isSameOriginPost(request, url)) {
    return new Response("Request not accepted.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const formData = await request.formData();
  const candidate = String(formData.get("password") ?? "");
  const returnTo = sanitizeBleadFacilitatorReturnTo(String(formData.get("returnTo") ?? ""));

  if (!(await securePasswordMatch(candidate, password))) {
    await new Promise((resolve) => setTimeout(resolve, failureDelayMs));
    const accessUrl = new URL("/Blead/facilitator/access/", url);
    accessUrl.searchParams.set("error", "1");
    accessUrl.searchParams.set("returnTo", returnTo);
    accessUrl.hash = "access-error-noscript";
    return redirect(accessUrl);
  }

  const token = await signBleadFacilitatorSession({
    expiresAt: now + BLEAD_FACILITATOR_SESSION_MS,
    secret,
  });
  return redirect(returnTo, {
    "Set-Cookie": serializeBleadFacilitatorSession(token, {
      secure: url.protocol === "https:",
    }),
  });
}

export async function handleBsalesAccess(
  request,
  { password, secret, now = Date.now(), failureDelayMs = 350 } = {},
) {
  const url = new URL(request.url);
  if (!isSameOriginPost(request, url)) {
    return new Response("Request not accepted.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const formData = await request.formData();
  const candidate = String(formData.get("password") ?? "");
  const returnTo = sanitizeBsalesReturnTo(String(formData.get("returnTo") ?? ""));
  if (!(await securePasswordMatch(candidate, password))) {
    await new Promise((resolve) => setTimeout(resolve, failureDelayMs));
    const accessUrl = new URL("/bsales/access/", url);
    accessUrl.searchParams.set("error", "1");
    accessUrl.searchParams.set("returnTo", returnTo);
    accessUrl.hash = "access-error-noscript";
    return redirect(accessUrl);
  }

  const token = await signBsalesSession({ expiresAt: now + BSALES_SESSION_MS, secret });
  return redirect(returnTo, {
    "Set-Cookie": serializeBsalesSession(token, { secure: url.protocol === "https:" }),
  });
}

export async function handleOwrAccess(
  request,
  { password, secret, now = Date.now(), failureDelayMs = 350 } = {},
) {
  const url = new URL(request.url);
  if (!isSameOriginPost(request, url)) {
    return new Response("Request not accepted.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const formData = await request.formData();
  const candidate = String(formData.get("password") ?? "");
  const returnTo = sanitizeOwrReturnTo(String(formData.get("returnTo") ?? ""));
  if (!(await securePasswordMatch(candidate, password))) {
    await new Promise((resolve) => setTimeout(resolve, failureDelayMs));
    const accessUrl = new URL("/OWR/access/", url);
    accessUrl.searchParams.set("error", "1");
    accessUrl.searchParams.set("returnTo", returnTo);
    accessUrl.hash = "access-error-noscript";
    return redirect(accessUrl);
  }

  const token = await signOwrSession({ expiresAt: now + OWR_SESSION_MS, secret });
  return redirect(returnTo, {
    "Set-Cookie": serializeOwrSession(token, { secure: url.protocol === "https:" }),
  });
}

function unavailable(message) {
  return new Response(message, {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export default async function maintenanceMiddleware(
  request = new Request("https://www.kaindly.ai/"),
) {
  if (!isFullSiteEnvironment()) return maintenanceResponse();

  const url = new URL(request.url);
  if (url.pathname === "/owref2026" || url.pathname === "/owref2026/" || url.pathname === "/owref2026/index.html") {
    return handleExecutiveAlpha(request);
  }
  if (
    url.pathname === "/Blead/facilitator"
    || url.pathname === "/Blead/facilitator/"
    || url.pathname === "/Blead/facilitator/access"
    || url.pathname === "/Blead/facilitator/access/"
  ) {
    return permanentRedirect("/dashboard/");
  }
  if (url.pathname === "/dashboard/logout/" && request.method === "POST") return handlePassphraseLogout(request);
  if (url.pathname === "/dashboard/access/" && request.method === "POST") return handlePassphraseLogin(request);
  if (isProtectedDashboardPath(url.pathname)) {
    return handleDashboardRoute(request);
  }
  if (request.method === "GET" && isMclendonEntryPath(url.pathname)) {
    const secret = process.env.MCLENDON_SESSION_SECRET;
    if (!isValidMclendonSessionSecret(secret, {
      reservedSecrets: [
        process.env.BLEAD_SESSION_SECRET,
        process.env.BLEAD_FACILITATOR_SESSION_SECRET,
        process.env.BSALES_SESSION_SECRET,
      ],
    })) {
      return unavailable("This workbook is temporarily unavailable.");
    }

    const token = readCookie(request.headers.get("cookie"), MCLENDON_COOKIE_NAME);
    if (await verifyMclendonSession(token, secret)) return nextProtected();

    const nextResponse = nextProtected();
    const signed = await signMclendonSession({
      expiresAt: Date.now() + MCLENDON_SESSION_MS,
      secret,
    });
    nextResponse.headers.set("Set-Cookie", serializeMclendonSession(signed));
    return nextResponse;
  }

  if (isProtectedOwrPath(url.pathname)) {
    const password = process.env.OWR_PASSWORD;
    const secret = process.env.OWR_SESSION_SECRET;
    if (!isValidBleadConfiguration(password, secret)) {
      return unavailable("This workshop workbook is temporarily unavailable.");
    }

    if (url.pathname === "/OWR/access/" || url.pathname === "/OWR/access") {
      if (request.method === "POST") return handleOwrAccess(request, { password, secret });
      const token = readCookie(request.headers.get("cookie"), OWR_COOKIE_NAME);
      return (await verifyOwrSession(token, secret)) ? redirect("/OWR/") : nextProtected();
    }

    if (url.pathname === "/OWR/logout/" && isSameOriginPost(request, url)) {
      return redirect("/OWR/access/", {
        "Set-Cookie": clearOwrSession({ secure: url.protocol === "https:" }),
      });
    }

    const token = readCookie(request.headers.get("cookie"), OWR_COOKIE_NAME);
    if (await verifyOwrSession(token, secret)) return nextProtected();

    const accessUrl = new URL("/OWR/access/", url);
    accessUrl.searchParams.set("returnTo", sanitizeOwrReturnTo(url.pathname + url.search));
    return redirect(accessUrl);
  }

  if (isProtectedBsalesPath(url.pathname)) {
    const password = process.env.BSALES_PASSWORD;
    const secret = process.env.BSALES_SESSION_SECRET;
    if (!isValidBleadConfiguration(password, secret)) {
      return unavailable("This session hub is temporarily unavailable.");
    }

    if (url.pathname === "/bsales/access/" || url.pathname === "/bsales/access") {
      if (request.method === "POST") return handleBsalesAccess(request, { password, secret });
      const token = readCookie(request.headers.get("cookie"), BSALES_COOKIE_NAME);
      return (await verifyBsalesSession(token, secret)) ? redirect("/bsales/") : nextProtected();
    }

    if (url.pathname === "/bsales/logout/" && isSameOriginPost(request, url)) {
      return redirect("/bsales/access/", {
        "Set-Cookie": clearBsalesSession({ secure: url.protocol === "https:" }),
      });
    }

    const token = readCookie(request.headers.get("cookie"), BSALES_COOKIE_NAME);
    if (await verifyBsalesSession(token, secret)) return nextProtected();

    const accessUrl = new URL("/bsales/access/", url);
    accessUrl.searchParams.set("returnTo", url.pathname + url.search);
    return redirect(accessUrl);
  }

  if (!isProtectedBleadPath(url.pathname)) return next();

  if (isFacilitatorPath(url.pathname)) {
    const facilitatorPassword = process.env.BLEAD_FACILITATOR_PASSWORD;
    const facilitatorSecret = process.env.BLEAD_FACILITATOR_SESSION_SECRET;
    if (!isValidBleadConfiguration(facilitatorPassword, facilitatorSecret)) {
      return unavailable("Facilitator access is temporarily unavailable.");
    }

    const isAccessPath = url.pathname === "/Blead/facilitator/access/"
      || url.pathname === "/Blead/facilitator/access";
    if (isAccessPath) {
      if (request.method === "POST") {
        return handleBleadFacilitatorAccess(request, {
          password: facilitatorPassword,
          secret: facilitatorSecret,
        });
      }
      const token = readCookie(
        request.headers.get("cookie"),
        BLEAD_FACILITATOR_COOKIE_NAME,
      );
      return (await verifyBleadFacilitatorSession(token, facilitatorSecret))
        ? redirect("/Blead/facilitator/")
        : nextProtected();
    }

    if (url.pathname === "/Blead/facilitator/logout/" && isSameOriginPost(request, url)) {
      return redirect("/Blead/facilitator/access/", {
        "Set-Cookie": clearBleadFacilitatorSession({ secure: url.protocol === "https:" }),
      });
    }

    const token = readCookie(
      request.headers.get("cookie"),
      BLEAD_FACILITATOR_COOKIE_NAME,
    );
    if (await verifyBleadFacilitatorSession(token, facilitatorSecret)) return nextProtected();

    const accessUrl = new URL("/Blead/facilitator/access/", url);
    accessUrl.searchParams.set("returnTo", url.pathname + url.search);
    return redirect(accessUrl);
  }

  const password = process.env.BLEAD_PASSWORD;
  const secret = process.env.BLEAD_SESSION_SECRET;
  if (!isValidBleadConfiguration(password, secret)) {
    return unavailable("This learning hub is temporarily unavailable.");
  }

  if (url.pathname === "/Blead/access/" || url.pathname === "/Blead/access") {
    if (request.method === "POST") return handleBleadAccess(request, { password, secret });
    const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
    return (await verifyBleadSession(token, secret)) ? redirect("/Blead/") : nextProtected();
  }

  if (url.pathname === "/Blead/logout/" && isSameOriginPost(request, url)) {
    return redirect("/Blead/access/", {
      "Set-Cookie": clearBleadSession({ secure: url.protocol === "https:" }),
    });
  }

  const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
  if (await verifyBleadSession(token, secret)) return nextProtected();

  const accessUrl = new URL("/Blead/access/", url);
  accessUrl.searchParams.set("returnTo", url.pathname + url.search);
  return redirect(accessUrl);
}
