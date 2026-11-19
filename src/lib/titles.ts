export const MAX_TITLE_CHARS = 120;

/** A title as typed: spaces tidied, never empty, never longer than the list can show. Returns the problem when invalid. */
export function cleanTitle(raw: unknown): { ok: true; title: string } | { ok: false; message: string } {
  if (typeof raw !== "string") return { ok: false, message: "Type a title first." };
  const title = raw.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!title) return { ok: false, message: "A title cannot be empty." };
  if (title.length > MAX_TITLE_CHARS) return { ok: false, message: `Keep the title under ${MAX_TITLE_CHARS} characters.` };
  return { ok: true, title };
}
