export const MAX_TITLE_CHARS = 250;

/** A title as typed: spaces tidied, never empty, never longer than the list can show. Returns the problem when invalid. */
export function cleanTitle(raw: unknown): { ok: true; title: string } | { ok: false; message: string } {
  if (typeof raw !== "string") return { ok: false, message: "Type a title first." };
  const title = raw.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!title) return { ok: false, message: "A title cannot be empty." };
  if (title.length > MAX_TITLE_CHARS) return { ok: false, message: `Keep the title under ${MAX_TITLE_CHARS} characters.` };
  return { ok: true, title };
}

/**
 * A page's title for the lesson: the site name tacked on the end ("... | Diario del Sur", "... - El País") is dropped when
 * what is left is still a real title, and nothing is cut short.
 */
export function pageTitleToLesson(raw: string): string {
  const title = raw.replace(/\s+/g, " ").trim();
  const m = /^(.{20,}?)\s+[|\u2013\u2014\u2015-]\s+[^|\u2013\u2014\u2015-]{2,40}$/.exec(title);
  return (m ? m[1] : title).slice(0, MAX_TITLE_CHARS);
}
