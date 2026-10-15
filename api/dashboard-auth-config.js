import { validateClerkKeyPair } from "../lib/dashboard-auth.js";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function GET() {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  const keys = validateClerkKeyPair(publishableKey, process.env.CLERK_SECRET_KEY);
  if (!keys) {
    return json({ error: "Authentication is temporarily unavailable." }, 503);
  }
  return json({ publishableKey }, 200);
}
