import {
  signScopedSession,
  verifyScopedSession,
} from "./blead-auth.js";

export const MCLENDON_COOKIE_NAME = "kaindly_mclendon_session";
const MCLENDON_SCOPE = "mclendon-participant";
const encoder = new TextEncoder();

export function isValidMclendonSessionSecret(secret, { reservedSecrets = [] } = {}) {
  const value = String(secret ?? "");
  return encoder.encode(value).byteLength >= 32
    && !reservedSecrets.some((reserved) => reserved && value === String(reserved));
}

export function signMclendonSession(options) {
  return signScopedSession({ ...options, scope: MCLENDON_SCOPE });
}

export function verifyMclendonSession(token, secret, now = Date.now()) {
  const expiresAt = Number(String(token ?? "").split(".")[2]);
  const currentTime = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(currentTime) || expiresAt <= currentTime) {
    return false;
  }
  return verifyScopedSession(token, secret, MCLENDON_SCOPE, currentTime);
}

export function serializeMclendonSession(token, { maxAge = 28_800 } = {}) {
  return [
    `${MCLENDON_COOKIE_NAME}=${token}`,
    "Path=/McLendon/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    "Secure",
  ].join("; ");
}
