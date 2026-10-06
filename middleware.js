import { next } from "@vercel/functions";
import {
  BLEAD_COOKIE_NAME,
  clearBleadSession,
  readCookie,
  sanitizeBleadReturnTo,
  securePasswordMatch,
  serializeBleadSession,
  signBleadSession,
  verifyBleadSession,
} from "./lib/blead-auth.js";

const FULL_SITE_ENVIRONMENTS = new Set(["production", "preview", "development"]);
const BLEAD_SESSION_MS = 8 * 60 * 60 * 1000;

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
    return redirect(accessUrl);
  }

  const token = await signBleadSession({ expiresAt: now + BLEAD_SESSION_MS, secret });
  const destination = `${returnTo.split("#", 1)[0]}${returnHash || returnTo.match(/#[a-z0-9-]+$/iu)?.[0] || ""}`;
  return redirect(destination, {
    "Set-Cookie": serializeBleadSession(token, { secure: url.protocol === "https:" }),
  });
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
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (url.pathname === "/Blead/access/" || url.pathname === "/Blead/access") {
    if (request.method === "POST") return handleBleadAccess(request, { password, secret });
    const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
    return (await verifyBleadSession(token, secret)) ? redirect("/Blead/") : next();
  }

  if (url.pathname === "/Blead/logout/" && isSameOriginPost(request, url)) {
    return redirect("/Blead/access/", {
      "Set-Cookie": clearBleadSession({ secure: url.protocol === "https:" }),
    });
  }

  const token = readCookie(request.headers.get("cookie"), BLEAD_COOKIE_NAME);
  if (await verifyBleadSession(token, secret)) return next();

  const accessUrl = new URL("/Blead/access/", url);
  accessUrl.searchParams.set("returnTo", url.pathname + url.search);
  return redirect(accessUrl);
}
