// The shared library: an article that someone has already turned into a lesson is copied to the next person who adds
// it, instead of paying for another model run. Only articles from a link are shared (pasted text may be private), and
// only when the language and help level match, so a copy is exactly what would have been built. Each person gets their
// own copy, so lessons stay theirs to rename, delete and study. Nothing about the first person travels with it.
// Everything here is best effort: if the library cannot be read, the lesson is simply built as usual.

import type { HelpLevel } from "./help";
import type { Language } from "./languages";
import { db } from "./supabase";

/** Bump when lessons are built noticeably better, so older copies stop being reused. */
export const LIBRARY_VERSION = 1;

const TRACKING = /^(utm_.*|fbclid|gclid|mc_cid|mc_eid|igshid|ref|ref_src|cmpid)$/i;

/** The same article reached by different links gets one address: no tracking, no fragment, no trailing slash. */
export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key);
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  const text = url.toString();
  return url.pathname === "/" && !url.search ? text.replace(/\/$/, "") : text;
}

export function libraryKey(sourceUrl: string, language: Language, help: HelpLevel): string {
  return `v${LIBRARY_VERSION}|${language}|${help}|${normalizeUrl(sourceUrl)}`;
}

/** Copies a shared lesson onto a new session. Returns the model's title for it, or null when there is nothing to reuse. */
export async function reuseFromLibrary(sessionId: string, key: string): Promise<{ title?: string } | null> {
  try {
    const { data: donor, error } = await db().from("sessions").select("id").eq("library_key", key).eq("status", "ready").limit(1).maybeSingle();
    if (error || !donor) return null;
    const { data: found, error: readError } = await db().from("enrichments").select("json, model").eq("session_id", donor.id).limit(1).maybeSingle();
    if (readError || !found) return null;
    const { error: copyError } = await db()
      .from("enrichments")
      .upsert({ session_id: sessionId, dialect: "neutral_latin_american", json: found.json, model: found.model }, { onConflict: "session_id,dialect" });
    if (copyError) return null;
    const { error: doneError } = await db().from("sessions").update({ status: "ready", error: null, library_key: key }).eq("id", sessionId);
    if (doneError) return null;
    const title = (found.json as { title?: unknown }).title;
    return { title: typeof title === "string" ? title : undefined };
  } catch (err) {
    console.error("library skipped", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Marks a finished lesson as available to the next person who adds the same article. Never throws. */
export async function shareLesson(sessionId: string, key: string): Promise<void> {
  try {
    const { error } = await db().from("sessions").update({ library_key: key }).eq("id", sessionId);
    if (error) console.error("could not share the lesson", error.message);
  } catch (err) {
    console.error("could not share the lesson", err instanceof Error ? err.message : err);
  }
}

/** Takes a lesson out of the library, for example after a re-run changed it. Never throws. */
export async function unshareLesson(sessionId: string): Promise<void> {
  try {
    await db().from("sessions").update({ library_key: null }).eq("id", sessionId);
  } catch (err) {
    console.error("could not unshare the lesson", err instanceof Error ? err.message : err);
  }
}
