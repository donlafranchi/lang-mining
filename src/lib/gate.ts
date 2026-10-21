// Single-user passcode gate. The cookie holds a hash of the passcode, never the passcode itself.
export const GATE_COOKIE = "lm_gate";

export async function gateToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`lang-mining:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
