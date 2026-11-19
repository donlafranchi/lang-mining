const MAX_NAME_LENGTH = 40;

/** The form of a name used to tell two names apart: ignores case, outer spaces and repeated spaces. */
export function nameKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** A message if the name is not acceptable, otherwise null. */
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Type a name.";
  if (trimmed.length > MAX_NAME_LENGTH) return `Keep the name to ${MAX_NAME_LENGTH} characters or fewer.`;
  if (/[\u0000-\u001F\u007F]/.test(name)) return "That name has characters that are not allowed.";
  return null;
}
