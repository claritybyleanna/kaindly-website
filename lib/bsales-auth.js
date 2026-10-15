import {
  signScopedSession,
  verifyScopedSession,
} from "./blead-auth.js";

export const BSALES_COOKIE_NAME = "kaindly_bsales_session";

export function signBsalesSession(options) {
  return signScopedSession({ ...options, scope: "bsales" });
}

export function verifyBsalesSession(token, secret, now = Date.now()) {
  return verifyScopedSession(token, secret, "bsales", now);
}

export function serializeBsalesSession(token, { secure = true, maxAge = 28_800 } = {}) {
  return [
    `${BSALES_COOKIE_NAME}=${token}`,
    "Path=/bsales/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function clearBsalesSession({ secure = true } = {}) {
  return serializeBsalesSession("", { secure, maxAge: 0 });
}

export function sanitizeBsalesReturnTo(value = "") {
  return /^\/bsales\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/u.test(value)
    ? value
    : "/bsales/";
}
