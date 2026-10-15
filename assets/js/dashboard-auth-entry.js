export const MAGIC_LINK_CONFIRMATION = "If that address can access this dashboard, a secure sign-in link is on its way.";
const AUTH_UNAVAILABLE = "Sign-in is temporarily unavailable. Please try again shortly.";

export async function requestDashboardEmailLink({ clerk, identifier, redirectUrl }) {
  const signInAttempt = await clerk.client.signIn.create({ identifier });
  const emailLinkFactor = signInAttempt.supportedFirstFactors?.find(
    (factor) => factor.strategy === "email_link" && typeof factor.emailAddressId === "string",
  );
  if (!emailLinkFactor) throw new Error("Email-link sign-in is unavailable");
  const { startEmailLinkFlow } = signInAttempt.createEmailLinkFlow();
  await startEmailLinkFlow({
    emailAddressId: emailLinkFactor.emailAddressId,
    redirectUrl,
  });
}

export function completeDashboardEmailLink(clerk) {
  return clerk.handleEmailLinkVerification({ redirectUrlComplete: "/dashboard/" });
}

export async function submitDashboardEmailLink({
  clerk,
  identifier,
  redirectUrl,
  status,
  button,
}) {
  button.disabled = true;
  try {
    await requestDashboardEmailLink({ clerk, identifier, redirectUrl });
  } catch {
    // Keep the confirmation identical so the page cannot reveal account membership.
  } finally {
    status.textContent = MAGIC_LINK_CONFIRMATION;
    button.disabled = false;
  }
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
  if (typeof configuration?.publishableKey !== "string") {
    throw new Error("Authentication configuration unavailable");
  }

  const ResolvedClerkClass = ClerkClass ?? (await import("@clerk/clerk-js")).Clerk;
  const clerk = new ResolvedClerkClass(configuration.publishableKey);
  await clerk.load();

  if (documentRef.querySelector("[data-dashboard-auth-verify]")) {
    await completeDashboardEmailLink(clerk);
    return clerk;
  }

  const form = documentRef.querySelector("[data-dashboard-auth-form]");
  const email = documentRef.querySelector("[data-dashboard-auth-email]");
  const status = documentRef.querySelector("[data-dashboard-auth-status]");
  const button = form?.querySelector("button[type='submit']");
  if (form && email && status && button) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitDashboardEmailLink({
        clerk,
        identifier: email.value,
        redirectUrl: new URL("/dashboard/verify/", locationRef.href).toString(),
        status,
        button,
      });
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
