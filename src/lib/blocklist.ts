// "Not part of the article": the owner can remove a paragraph from a lesson, and the line is remembered for that site so
// later articles from it are cleaned the same way, with no model. Lines are matched on a key with the numbers made
// generic, so "Fecha de publicación 4 horas" also catches "... 12 horas".

import { db } from "./supabase";

export class BlocklistError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "BlocklistError";
  }
}

/** Longer than this is a real paragraph, not furniture: removed from one lesson, never taught to the site. */
const MAX_LEARNED_CHARS = 200;

export function lineKey(text: string): string {
  return text.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, MAX_LEARNED_CHARS);
}

/** The site a link belongs to: its host without "www". Null when there is no usable link. */
export function siteOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** The article text without the lines this site has taught us to skip. Never empties the article. */
export function filterBlocked(text: string, keys: Set<string>): string {
  if (keys.size === 0) return text;
  const kept = text.split(/\n[ \t]*\n/).filter((p) => !keys.has(lineKey(p)));
  return kept.length > 0 ? kept.join("\n\n") : text;
}

/** What this site has taught us to skip. A failure (for example the table is not there yet) means nothing is skipped. */
export async function blockedKeysFor(site: string | null): Promise<Set<string>> {
  if (!site) return new Set();
  try {
    const { data, error } = await db().from("site_blocklist").select("line_key").eq("site", site);
    if (error || !data) return new Set();
    return new Set((data as { line_key: string }[]).map((r) => r.line_key));
  } catch {
    return new Set();
  }
}

const paragraphText = (p: unknown): string => {
  const r = p as { spanish?: unknown; persian?: unknown };
  return typeof r.spanish === "string" ? r.spanish : typeof r.persian === "string" ? r.persian : "";
};

/**
 * Takes paragraph number `index` (from 0) out of one of the person's own lessons, and out of its stored source text, and
 * remembers a short line for the site. Someone else's lesson is "not found".
 */
export async function removeParagraph(sessionId: string, userId: string, index: number): Promise<{ remembered: boolean; site: string | null }> {
  const { data: session, error } = await db().from("sessions").select("id, source_url, language").eq("id", sessionId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Could not load the lesson: ${error.message}`);
  if (!session) throw new BlocklistError("That lesson is already gone.", 404);

  const { data: row } = await db().from("enrichments").select("json").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const lesson = row?.json as { paragraphs?: unknown[] } | undefined;
  if (!lesson?.paragraphs || !Number.isInteger(index) || index < 0 || index >= lesson.paragraphs.length) {
    throw new BlocklistError("That paragraph is not there.", 400);
  }
  if (lesson.paragraphs.length === 1) throw new BlocklistError("A lesson needs at least one paragraph.", 400);
  const removed = paragraphText(lesson.paragraphs[index]);

  const next = { ...lesson, paragraphs: lesson.paragraphs.filter((_, i) => i !== index) };
  const { error: saveError } = await db().from("enrichments").update({ json: next }).eq("session_id", sessionId);
  if (saveError) throw new Error(`Could not save the lesson: ${saveError.message}`);

  // Keep the stored source text in step, so a re-run does not bring the paragraph back.
  const { data: source } = await db().from("source_texts").select("text").eq("session_id", sessionId).maybeSingle();
  if (source?.text && removed) {
    const kept = String(source.text).split(/\n[ \t]*\n/).filter((p) => p.trim() !== removed.trim());
    if (kept.length > 0 && kept.length < String(source.text).split(/\n[ \t]*\n/).length) {
      await db().from("source_texts").update({ text: kept.join("\n\n") }).eq("session_id", sessionId);
    }
  }

  const site = siteOf((session.source_url as string | null) ?? null);
  const learnable = Boolean(site) && removed.trim().length > 0 && removed.trim().length <= MAX_LEARNED_CHARS;
  if (!learnable || !site) return { remembered: false, site };
  const { error: blockError } = await db().from("site_blocklist").upsert({ site, line_key: lineKey(removed), example: removed.trim() }, { onConflict: "site,line_key" });
  if (blockError) {
    console.error("could not remember the line", blockError.message);
    return { remembered: false, site };
  }
  return { remembered: true, site };
}
