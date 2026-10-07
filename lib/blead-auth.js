export const BLEAD_COOKIE_NAME = "kaindly_blead_session";

const encoder = new TextEncoder();

export function isValidBleadConfiguration(password, secret) {
  const passwordValue = String(password ?? "");
  const secretValue = String(secret ?? "");
  return passwordValue.length > 0
    && encoder.encode(secretValue).byteLength >= 32
    && passwordValue !== secretValue;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value) {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function importHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

export async function securePasswordMatch(candidate = "", expected = "") {
  if (!candidate || !expected) return false;
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function signBleadSession({ expiresAt, secret }) {
  if (encoder.encode(String(secret ?? "")).byteLength < 32) {
    throw new Error("BLEAD_SESSION_SECRET must be at least 32 bytes");
  }
  const payload = `v1.${Number(expiresAt)}`;
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyBleadSession(token, secret, now = Date.now()) {
  try {
    if (!token || !secret) return false;
    const [version, expiresText, signatureText, extra] = token.split(".");
    if (version !== "v1" || extra !== undefined) return false;
    const expiresAt = Number(expiresText);
    if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
    const key = await importHmacKey(secret, ["verify"]);
    return crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureText),
      encoder.encode(`${version}.${expiresText}`),
    );
  } catch {
    return false;
  }
}

export function readCookie(cookieHeader = "", name) {
  for (const item of String(cookieHeader ?? "").split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

export function serializeBleadSession(token, { secure = true, maxAge = 28_800 } = {}) {
  return [
    `${BLEAD_COOKIE_NAME}=${token}`,
    "Path=/Blead/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function clearBleadSession({ secure = true } = {}) {
  return serializeBleadSession("", { secure, maxAge: 0 });
}

export function sanitizeBleadReturnTo(value = "") {
  return /^\/Blead\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/i.test(value)
    ? value
    : "/Blead/";
}
