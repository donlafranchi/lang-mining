/**
 * Is this form post from our own pages? Stops another site from submitting a sign-in form for you. Browsers always send
 * Origin on a form post, so a different Origin, or a cross-site fetch metadata header, is refused. Requests with neither
 * header (curl, tests) are allowed: they carry no browser cookies for an attacker to abuse.
 */
export function isSameOrigin(origin: string | null, host: string | null, fetchSite: string | null): boolean {
  if (fetchSite === "cross-site") return false;
  if (origin === null || origin === "") return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
