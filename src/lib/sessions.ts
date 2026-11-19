import { createAnthropicComplete } from "./anthropic";
import { explainSaveError, explainUsersError } from "./db-errors";
import { enrichText, type Lesson } from "./enrichment/enrich";
import { farsiEnrichmentSchema } from "./enrichment/farsi-schema";
import { enrichmentSchema, type Dialect } from "./enrichment/schema";
import { fetchArticleText, looksLikeUrl } from "./ingest/extract";
import type { HelpLevel } from "./help";
import { resolveLanguage, type Language } from "./languages";
import type { ModelId } from "./models";
import { db } from "./supabase";

export const MIN_TEXT_CHARS = 20;

export class UserFacingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}

// Spanish lessons are built once. The column stays (and is required by the database) but holds this fixed value.
export const LESSON_DIALECT: Dialect = "neutral_latin_american";

export type SessionRow = {
  id: string;
  source_type: "text" | "url";
  source_url: string | null;
  title: string;
  dialect: Dialect;
  language: Language;
  status: "processing" | "ready" | "failed";
  error: string | null;
  created_at: string;
};

// Rows are read with select("*") so the app keeps working before the language column exists (migration 0002).
function toSessionRow(raw: Record<string, unknown>): SessionRow {
  return {
    id: String(raw.id),
    source_type: raw.source_type === "url" ? "url" : "text",
    source_url: (raw.source_url as string | null) ?? null,
    title: String(raw.title),
    dialect: raw.dialect as Dialect,
    language: resolveLanguage(raw.language),
    status: raw.status as SessionRow["status"],
    error: (raw.error as string | null) ?? null,
    created_at: String(raw.created_at),
  };
}

function titleFor(text: string, url: string | null): string {
  if (url) return new URL(url).hostname.replace(/^www\./, "");
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 50 ? `${oneLine.slice(0, 50)}…` : oneLine;
}

async function saveEnrichment(sessionId: string, model: ModelId, data: Lesson) {
  const { error } = await db()
    .from("enrichments")
    .upsert(
      { session_id: sessionId, dialect: LESSON_DIALECT, json: data, model },
      { onConflict: "session_id,dialect" },
    );
  if (error) throw new Error(`Could not save the lesson: ${error.message}`);
}

/** Paste text or a URL. Saves the session and source text and returns at once; call buildSession in the background to make the lesson. */
export async function createSession(args: {
  input: string;
  language: Language;
  userId: string;
}): Promise<{ id: string; text: string }> {
  const input = args.input.trim();
  if (!input) throw new UserFacingError("Paste some text or a link first.");

  const isUrl = looksLikeUrl(input);
  let text = input;
  let sourceUrl: string | null = null;

  if (isUrl) {
    try {
      const fetched = await fetchArticleText(input);
      text = fetched.text;
      sourceUrl = fetched.finalUrl;
    } catch (err) {
      throw new UserFacingError(err instanceof Error ? err.message : "Could not read that link.");
    }
  } else if (text.length < MIN_TEXT_CHARS) {
    throw new UserFacingError("Paste at least a sentence or two.");
  }

  const { data: session, error: sessionError } = await db()
    .from("sessions")
    .insert({
      user_id: args.userId,
      source_type: isUrl ? "url" : "text",
      source_url: sourceUrl,
      title: titleFor(text, sourceUrl),
      dialect: LESSON_DIALECT,
      // Left out for Spanish so it works before migration 0002 adds the column.
      ...(args.language === "es" ? {} : { language: args.language }),
      status: "processing",
    })
    .select("id")
    .single();
  if (sessionError || !session) {
    const message = sessionError?.message ?? "no row returned";
    const explained = explainSaveError(message) ?? explainUsersError(message);
    if (explained) throw new UserFacingError(explained, 503);
    throw new Error(`Could not create the session: ${message}`);
  }

  const { error: sourceError } = await db()
    .from("source_texts")
    .insert({ session_id: session.id, text });
  if (sourceError) {
    // Do not leave a lesson with no source behind.
    await db().from("sessions").delete().eq("id", session.id);
    const explained = explainSaveError(sourceError.message);
    if (explained) throw new UserFacingError(explained, 503);
    throw new Error(`Could not store the source text: ${sourceError.message}`);
  }

  return { id: session.id, text };
}

/** Builds the lesson for a freshly created session. Never throws: failures are recorded on the row. */
export async function buildSession(args: { id: string; text: string; language: Language; help: HelpLevel; model: ModelId }): Promise<void> {
  try {
    const enrichment = await enrichText({
      text: args.text,
      language: args.language,
      help: args.help,
      complete: createAnthropicComplete(args.model),
    });
    await saveEnrichment(args.id, args.model, enrichment);
    await db().from("sessions").update({ status: "ready", error: null }).eq("id", args.id);
  } catch (err) {
    console.error("buildSession failed", err);
    const message = err instanceof Error ? err.message : "Enrichment failed.";
    await db().from("sessions").update({ status: "failed", error: message }).eq("id", args.id);
  }
}

/** Reads the stored source text and language for a re-run. Someone else's lesson is "not found". Throws a 410 if the source text is missing. */
export async function startRerun(id: string, userId: string): Promise<{ text: string; language: Language }> {
  // Check the owner first, so nothing about another person's lesson is read.
  const { data: session, error: sessionError } = await db()
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (sessionError) throw new Error(`Could not load the lesson: ${sessionError.message}`);
  if (!session) throw new UserFacingError("That lesson is already gone.", 404);

  const { data: source, error } = await db().from("source_texts").select("text").eq("session_id", id).maybeSingle();
  if (error) throw new Error(`Could not read the source text: ${error.message}`);
  if (!source) {
    throw new UserFacingError(
      "The source text for this lesson is not available. Paste it again to build a new lesson.",
      410,
    );
  }
  return { text: source.text, language: toSessionRow(session).language };
}

/** Rebuilds the lesson from stored text, in the background. A failure is logged and the lesson stays as it was. */
export async function finishRerun(args: { id: string; text: string; language: Language; help: HelpLevel; model: ModelId }): Promise<void> {
  try {
    const enrichment = await enrichText({
      text: args.text,
      language: args.language,
      help: args.help,
      complete: createAnthropicComplete(args.model),
    });
    await saveEnrichment(args.id, args.model, enrichment);
    await db().from("sessions").update({ status: "ready", error: null }).eq("id", args.id);
  } catch (err) {
    console.error("rerun failed", err);
  }
}

/** Deletes a lesson. The source text and enrichment rows go with it (foreign keys cascade). */
export async function deleteSession(id: string, userId: string): Promise<void> {
  const { data, error } = await db().from("sessions").delete().eq("id", id).eq("user_id", userId).select("id");
  if (error) throw new Error(`Could not delete the lesson: ${error.message}`);
  if (!data || data.length === 0) throw new UserFacingError("That lesson is already gone.", 404);
}

export async function listSessions(userId: string, limit = 20): Promise<SessionRow[]> {
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not list sessions: ${error.message}`);
  return (data ?? []).map(toSessionRow);
}

export type SessionDetail = {
  session: SessionRow;
  enrichment: Lesson | null;
  model: string | null;
  sourceAvailable: boolean;
};

export async function getSession(id: string, userId: string): Promise<SessionDetail | null> {
  const { data: session, error } = await db()
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the session: ${error.message}`);
  if (!session) return null;
  const sessionRow = toSessionRow(session);

  const [{ data: row }, { data: source }] = await Promise.all([
    db()
      .from("enrichments")
      .select("json, model")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db().from("source_texts").select("session_id").eq("session_id", id).maybeSingle(),
  ]);

  const schema = sessionRow.language === "fa" ? farsiEnrichmentSchema : enrichmentSchema;
  const parsed = row ? schema.safeParse(row.json) : null;
  return {
    session: sessionRow,
    enrichment: parsed?.success ? parsed.data : null,
    model: parsed?.success ? String(row?.model) : null,
    sourceAvailable: Boolean(source),
  };
}
