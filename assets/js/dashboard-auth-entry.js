export const EMAIL_CODE_CONFIRMATION = "If that address can access this dashboard, a six-digit code is on its way.";
const CODE_INVALID = "That code didn’t work. Check the six digits and try again.";
const AUTH_UNAVAILABLE = "Sign-in is temporarily unavailable. Please try again shortly.";

export async function renewExpiredDashboardSession(clerk, now = Date.now()) {
  const session = clerk.session;
  const createdAt = session?.createdAt instanceof Date ? session.createdAt.getTime() : Number(session?.createdAt);
  if (session?.id && Number.isFinite(createdAt) && now - createdAt >= 4 * 60 * 60 * 1000) {
    // Re-authenticate this browser under the existing four-hour server policy.
    // The callback prevents navigation before the new sign-in request begins.
    await clerk.signOut(async () => {}, { sessionId: session.id });
  }
}

export async function requestDashboardEmailCode({ clerk, identifier }) {
  await renewExpiredDashboardSession(clerk);
  const signInAttempt = await clerk.client.signIn.create({ identifier });
  const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
    (factor) => factor.strategy === "email_code" && typeof factor.emailAddressId === "string",
  );
  if (!emailCodeFactor) throw new Error("Email-code sign-in is unavailable");
  await signInAttempt.prepareFirstFactor({
    strategy: "email_code",
    emailAddressId: emailCodeFactor.emailAddressId,
  });
  return signInAttempt;
}

export async function verifyDashboardEmailCode({
  clerk,
  signInAttempt,
  code,
  redirectTo = (url) => window.location.assign(url),
  returnTo = "/dashboard/",
}) {
  const normalizedCode = String(code ?? "").trim();
  if (!signInAttempt || !/^\d{6}$/u.test(normalizedCode)) {
    throw new Error("A six-digit email code is required");
  }
  const result = await signInAttempt.attemptFirstFactor({
    strategy: "email_code",
    code: normalizedCode,
  });
  if (result.status !== "complete" || typeof result.createdSessionId !== "string") {
    throw new Error("Email-code sign-in is incomplete");
  }
  await clerk.setActive({ session: result.createdSessionId });
  redirectTo(/^\/dashboard\/(?:[a-z0-9-]+\/)*$/iu.test(returnTo) ? returnTo : "/dashboard/");
  return result;
}

export async function submitDashboardEmailCodeRequest({
  clerk,
  identifier,
  status,
  button,
}) {
  button.disabled = true;
  let signInAttempt = null;
  try {
    signInAttempt = await requestDashboardEmailCode({ clerk, identifier });
  } catch {
    // Keep the confirmation identical so the page cannot reveal account membership.
  } finally {
    status.textContent = EMAIL_CODE_CONFIRMATION;
    button.disabled = false;
  }
  return signInAttempt;
}

function showUnavailable(documentRef) {
  const status = documentRef.querySelector("[data-dashboard-auth-status]")
    ?? documentRef.querySelector("[data-dashboard-verification-status]");
  if (status) status.textContent = AUTH_UNAVAILABLE;
}

export async function initializeDashboardAuth({
  documentRef = document,
  locationRef = window.location,
  fetchImpl = window.fetch.bind(window),
  ClerkClass,
} = {}) {
  const response = await fetchImpl("/dashboard/api/auth-config", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Authentication configuration unavailable");
  const configuration = await response.json();
  if (configuration?.mode === "passphrase") {
    documentRef.querySelector("[data-dashboard-sign-out]")?.addEventListener("click", async () => {
      const response = await fetchImpl("/dashboard/logout/", { method: "POST", credentials: "same-origin" });
      if (response.ok) locationRef.assign("/dashboard/access/");
    });
    return null;
  }
  if (typeof configuration?.publishableKey !== "string") {
    throw new Error("Authentication configuration unavailable");
  }

  const ResolvedClerkClass = ClerkClass ?? (await import("@clerk/clerk-js")).Clerk;
  const clerk = new ResolvedClerkClass(configuration.publishableKey);
  await clerk.load();

  const form = documentRef.querySelector("[data-dashboard-auth-form]");
  const email = documentRef.querySelector("[data-dashboard-auth-email]");
  const codeForm = documentRef.querySelector("[data-dashboard-auth-code-form]");
  const code = documentRef.querySelector("[data-dashboard-auth-code]");
  const status = documentRef.querySelector("[data-dashboard-auth-status]");
  const button = form?.querySelector("button[type='submit']");
  const codeButton = codeForm?.querySelector("button[type='submit']");
  const resend = documentRef.querySelector("[data-dashboard-auth-resend]");
  const changeEmail = documentRef.querySelector("[data-dashboard-auth-change-email]");
  let signInAttempt = null;
  let identifier = "";

  if (form && email && codeForm && code && status && button && codeButton) {
    button.disabled = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      identifier = email.value;
      signInAttempt = await submitDashboardEmailCodeRequest({
        clerk,
        identifier,
        status,
        button,
      });
      form.hidden = true;
      codeForm.hidden = false;
      code.focus();
    });

    codeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      codeButton.disabled = true;
      status.textContent = "Checking your code…";
      try {
        await verifyDashboardEmailCode({
          clerk,
          signInAttempt,
          code: code.value,
          returnTo: new URLSearchParams(locationRef.search ?? "").get("returnTo") ?? "/dashboard/",
          redirectTo: (url) => locationRef.assign(url),
        });
      } catch {
        status.textContent = CODE_INVALID;
        codeButton.disabled = false;
      }
    });

    resend?.addEventListener("click", async () => {
      resend.disabled = true;
      const nextAttempt = await submitDashboardEmailCodeRequest({
        clerk,
        identifier,
        status,
        button: resend,
      });
      if (nextAttempt) signInAttempt = nextAttempt;
      code.focus();
    });

    changeEmail?.addEventListener("click", () => {
      signInAttempt = null;
      code.value = "";
      codeForm.hidden = true;
      form.hidden = false;
      status.textContent = "";
      email.focus();
    });
  }

  const signOut = documentRef.querySelector("[data-dashboard-sign-out]");
  signOut?.addEventListener("click", async () => {
    signOut.disabled = true;
    try {
      await clerk.signOut({ redirectUrl: "/dashboard/access/" });
    } catch {
      signOut.disabled = false;
    }
  });

  return clerk;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  initializeDashboardAuth().catch(() => showUnavailable(document));
}
