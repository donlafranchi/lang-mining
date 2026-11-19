import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const MIN_PASSCODE_LENGTH = 6;
const MAX_PASSCODE_LENGTH = 200;

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

function derive(passcode: string, salt: Buffer, n: number, r: number, p: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(passcode.normalize("NFC"), salt, length, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/** A salted scrypt hash, written as scrypt, N, r, p, salt, hash joined by dollar signs. The passcode itself is never stored. */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(passcode, salt, N, R, P, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

/** True only for the right passcode. A malformed stored value is a mismatch, never a crash. */
export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
    // Refuse settings that could be used to make the server do huge amounts of work.
    if (![n, r, p].every(Number.isInteger) || n < 2 || n > 2 ** 17 || r < 1 || r > 16 || p < 1 || p > 4) return false;
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (salt.length === 0 || expected.length === 0) return false;
    const actual = await derive(passcode, salt, n, r, p, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** A message if the password is not acceptable, otherwise null. */
export function validatePasscode(passcode: string): string | null {
  if (passcode.trim() === "") return "Pick a password.";
  if (passcode.length < MIN_PASSCODE_LENGTH) return `The password needs at least ${MIN_PASSCODE_LENGTH} characters.`;
  if (passcode.length > MAX_PASSCODE_LENGTH) return "That password is too long.";
  return null;
}
