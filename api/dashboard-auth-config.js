const CLERK_PUBLISHABLE_KEY = /^pk_(?:test|live)_[^\s]+$/u;

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
  if (!CLERK_PUBLISHABLE_KEY.test(String(publishableKey ?? ""))) {
    return json({ error: "Authentication is temporarily unavailable." }, 503);
  }
  return json({ publishableKey }, 200);
}
