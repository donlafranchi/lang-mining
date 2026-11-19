// Signed session cookie: base64url(payload).base64url(HMAC-SHA256). Uses Web Crypto only, so the same code runs
// in the passcode gate (edge) and in server routes (node).

export const SESSION_COOKIE = "lm_session";
export const SESSION_DAYS = 365;

export type SessionPayload = { userId: string; version: number; exp: number };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

/** Compares without stopping at the first difference. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(
  payload: { userId: string; version: number },
  secret: string,
  now: Date = new Date(),
  days: number = SESSION_DAYS,
): Promise<string> {
  if (!secret) throw new Error("SESSION_SECRET must be set.");
  const exp = now.getTime() + days * 24 * 60 * 60 * 1000;
  const body = toBase64Url(encoder.encode(JSON.stringify({ u: payload.userId, v: payload.version, exp })));
  return `${body}.${await sign(secret, body)}`;
}

/** The payload if the token is genuine and not expired, otherwise null. Never throws. */
export async function verifySession(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, sig] = parts;

  try {
    if (!sameText(await sign(secret, body), sig)) return null;
    const bytes = fromBase64Url(body);
    if (!bytes) return null;
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { u?: unknown; v?: unknown; exp?: unknown };
    if (typeof parsed.u !== "string" || !Number.isInteger(parsed.v) || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= now.getTime()) return null;
    return { userId: parsed.u, version: parsed.v as number, exp: parsed.exp };
  } catch {
    return null;
  }
}
