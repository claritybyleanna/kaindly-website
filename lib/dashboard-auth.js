import { createClerkClient } from "@clerk/backend";
import { parsePublishableKey } from "@clerk/shared/keys";

const APPROVED_DASHBOARD_EMAIL = "leanna.baker@kaindly.ai";
const MAX_SESSION_AGE_MS = 4 * 60 * 60 * 1000;
const HTTPS_ORIGIN = /^https:\/\/[^/?#]+$/u;
const CLERK_SECRET_KEY = /^sk_(test|live)_([A-Za-z0-9_-]{32,})$/u;
const ASCII_ONLY = /^[\x00-\x7F]*$/u;

export function normalizeEmail(value) {
  if (typeof value !== "string" || !ASCII_ONLY.test(value)) return "";
  return value.trim().toLowerCase();
}

function normalizeNow(value) {
  const resolved = typeof value === "function" ? value() : value;
  const timestamp = resolved instanceof Date ? resolved.getTime() : Number(resolved);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validateAuthorizedOrigins(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const origins = [];
  for (const candidate of value) {
    if (
      typeof candidate !== "string"
      || candidate !== candidate.trim()
      || candidate.includes("*")
      || !HTTPS_ORIGIN.test(candidate)
    ) {
      return null;
    }
    try {
      const url = new URL(candidate);
      if (url.origin !== candidate || url.username || url.password) return null;
    } catch {
      return null;
    }
    if (origins.includes(candidate)) return null;
    origins.push(candidate);
  }
  return origins;
}

export function parseAuthorizedOrigins(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const parts = value.split(",").map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) return null;
  return validateAuthorizedOrigins(parts);
}

export function resolveClerkPublishableKey(environment = process.env) {
  return environment.CLERK_PUBLISHABLE_KEY
    || environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export function validateClerkKeyPair(publishableKey, secretKey) {
  const parsedPublishableKey = parsePublishableKey(publishableKey);
  const secretMatch = typeof secretKey === "string" ? secretKey.match(CLERK_SECRET_KEY) : null;
  if (!parsedPublishableKey || !secretMatch) return null;

  const secretInstanceType = secretMatch[1] === "test" ? "development" : "production";
  if (parsedPublishableKey.instanceType !== secretInstanceType) return null;

  return Object.freeze({
    publishableKey,
    secretKey,
    instanceType: parsedPublishableKey.instanceType,
  });
}

export function createDashboardAuthorizer({
  authenticateRequest,
  getUser,
  getSession,
  now = Date.now,
  allowedEmail,
  authorizedOrigins,
} = {}) {
  const origins = validateAuthorizedOrigins(authorizedOrigins);
  const configuredEmail = normalizeEmail(allowedEmail);
  const validNowSource = typeof now === "function" || normalizeNow(now) !== null;
  const validConfiguration = typeof authenticateRequest === "function"
    && typeof getUser === "function"
    && typeof getSession === "function"
    && configuredEmail === APPROVED_DASHBOARD_EMAIL
    && origins !== null
    && validNowSource;

  return async function authorize(request) {
    if (!validConfiguration || !(request instanceof Request)) return null;

    try {
      const requestState = await authenticateRequest(request, { authorizedParties: origins });
      if (!requestState?.isAuthenticated || typeof requestState.toAuth !== "function") return null;

      const auth = requestState.toAuth();
      const userId = typeof auth?.userId === "string" ? auth.userId : "";
      const sessionId = typeof auth?.sessionId === "string" ? auth.sessionId : "";
      if (!userId || !sessionId) return null;

      const [user, session] = await Promise.all([getUser(userId), getSession(sessionId)]);
      if (user?.id !== userId || session?.id !== sessionId || session?.userId !== userId) return null;
      if (session.status !== "active") return null;

      const currentTime = normalizeNow(now);
      if (currentTime === null) return null;
      const createdAt = typeof session.createdAt === "number" ? session.createdAt : Number.NaN;
      const age = currentTime - createdAt;
      if (!Number.isFinite(createdAt) || age < 0 || age >= MAX_SESSION_AGE_MS) return null;

      if (typeof user.primaryEmailAddressId !== "string" || !user.primaryEmailAddressId) return null;
      if (!Array.isArray(user.emailAddresses)) return null;
      const primary = user.emailAddresses.find(({ id }) => id === user.primaryEmailAddressId);
      if (!primary || primary.verification?.status !== "verified") return null;
      if (normalizeEmail(primary.emailAddress) !== configuredEmail) return null;

      return Object.freeze({ userId, sessionId, email: configuredEmail });
    } catch {
      return null;
    }
  };
}

function productionConfiguration() {
  const publishableKey = resolveClerkPublishableKey();
  const secretKey = process.env.CLERK_SECRET_KEY;
  const allowedEmail = process.env.DASHBOARD_ALLOWED_EMAIL;
  const authorizedOrigins = parseAuthorizedOrigins(process.env.DASHBOARD_AUTHORIZED_ORIGINS);
  const keys = validateClerkKeyPair(publishableKey, secretKey);
  if (!keys) return null;
  if (normalizeEmail(allowedEmail) !== APPROVED_DASHBOARD_EMAIL) return null;
  if (!authorizedOrigins) return null;
  return { ...keys, allowedEmail, authorizedOrigins };
}

export async function authorizeDashboardRequest(request) {
  const configuration = productionConfiguration();
  if (!configuration) return null;

  try {
    const clerk = createClerkClient({
      secretKey: configuration.secretKey,
      publishableKey: configuration.publishableKey,
    });
    return createDashboardAuthorizer({
      authenticateRequest: clerk.authenticateRequest.bind(clerk),
      getUser: clerk.users.getUser.bind(clerk.users),
      getSession: clerk.sessions.getSession.bind(clerk.sessions),
      now: Date.now,
      allowedEmail: configuration.allowedEmail,
      authorizedOrigins: configuration.authorizedOrigins,
    })(request);
  } catch {
    return null;
  }
}
