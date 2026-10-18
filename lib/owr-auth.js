import {
  signScopedSession,
  verifyScopedSession,
} from "./blead-auth.js";

export const OWR_COOKIE_NAME = "kaindly_owr_session";

export function signOwrSession(options) {
  return signScopedSession({ ...options, scope: "owr" });
}

export function verifyOwrSession(token, secret, now = Date.now()) {
  return verifyScopedSession(token, secret, "owr", now);
}

export function serializeOwrSession(token, { secure = true, maxAge = 28_800 } = {}) {
  return [
    `${OWR_COOKIE_NAME}=${token}`,
    "Path=/OWR/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function clearOwrSession({ secure = true } = {}) {
  return serializeOwrSession("", { secure, maxAge: 0 });
}

export function sanitizeOwrReturnTo(value = "") {
  return /^\/OWR\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/iu.test(value)
    ? value
    : "/OWR/";
}
