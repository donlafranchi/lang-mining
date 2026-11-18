import { createAnthropicComplete } from "./anthropic";
import { enrichText } from "./enrichment/enrich";
import { enrichmentSchema, type Dialect, type Enrichment } from "./enrichment/schema";
import { fetchArticleText, looksLikeUrl } from "./ingest/extract";
import type { ModelId } from "./models";
import { deleteAfter, retentionDays } from "./retention";
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
  status: "processing" | "ready" | "failed";
  error: string | null;
  created_at: string;
};

function titleFor(text: string, url: string | null): string {
  if (url) return new URL(url).hostname.replace(/^www\./, "");
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 50 ? `${oneLine.slice(0, 50)}…` : oneLine;
}

async function saveEnrichment(sessionId: string, model: ModelId, data: Enrichment) {
  const { error } = await db()
    .from("enrichments")
    .upsert(
      { session_id: sessionId, dialect: LESSON_DIALECT, json: data, model },
      { onConflict: "session_id,dialect" },
    );
  if (error) throw new Error(`Could not save the lesson: ${error.message}`);
}

/** Paste text or a URL. Saves the session and source text and returns at once; call buildSession in the background to make the lesson. */
export async function createSession(args: { input: string }): Promise<{ id: string; text: string }> {
  const input = args.input.trim();
  if (!input) throw new UserFacingError("Paste some Spanish text or a link first.");

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
    throw new UserFacingError("Paste at least a sentence or two of Spanish.");
  }

  const { data: session, error: sessionError } = await db()
    .from("sessions")
    .insert({
      source_type: isUrl ? "url" : "text",
      source_url: sourceUrl,
      title: titleFor(text, sourceUrl),
      dialect: LESSON_DIALECT,
      status: "processing",
    })
    .select("id")
    .single();
  if (sessionError || !session) throw new Error(`Could not create the session: ${sessionError?.message}`);

  const { error: sourceError } = await db()
    .from("source_texts")
    .insert({
      session_id: session.id,
      text,
      delete_after: deleteAfter(new Date(), retentionDays(process.env.RETENTION_DAYS)).toISOString(),
    });
  if (sourceError) throw new Error(`Could not store the source text: ${sourceError.message}`);

  return { id: session.id, text };
}

/** Builds the lesson for a freshly created session. Never throws: failures are recorded on the row. */
export async function buildSession(args: { id: string; text: string; model: ModelId }): Promise<void> {
  try {
    const enrichment = await enrichText({ text: args.text, complete: createAnthropicComplete(args.model) });
    await saveEnrichment(args.id, args.model, enrichment);
    await db().from("sessions").update({ status: "ready", error: null }).eq("id", args.id);
  } catch (err) {
    console.error("buildSession failed", err);
    const message = err instanceof Error ? err.message : "Enrichment failed.";
    await db().from("sessions").update({ status: "failed", error: message }).eq("id", args.id);
  }
}

/** Reads the stored source text for a re-run. Throws a 410 if the retention job already deleted it. */
export async function startRerun(id: string): Promise<string> {
  const { data: source, error } = await db()
    .from("source_texts")
    .select("text")
    .eq("session_id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the source text: ${error.message}`);
  if (!source) {
    throw new UserFacingError(
      "The source text was deleted after the retention window. Paste it again to build a new lesson.",
      410,
    );
  }
  return source.text;
}

/** Rebuilds the lesson from stored text, in the background. A failure is logged and the lesson stays as it was. */
export async function finishRerun(args: { id: string; text: string; model: ModelId }): Promise<void> {
  try {
    const enrichment = await enrichText({ text: args.text, complete: createAnthropicComplete(args.model) });
    await saveEnrichment(args.id, args.model, enrichment);
    await db().from("sessions").update({ status: "ready", error: null }).eq("id", args.id);
  } catch (err) {
    console.error("rerun failed", err);
  }
}

/** Deletes a lesson. The source text and enrichment rows go with it (foreign keys cascade). */
export async function deleteSession(id: string): Promise<void> {
  const { data, error } = await db().from("sessions").delete().eq("id", id).select("id");
  if (error) throw new Error(`Could not delete the lesson: ${error.message}`);
  if (!data || data.length === 0) throw new UserFacingError("That lesson is already gone.", 404);
}

export async function listSessions(limit = 20): Promise<SessionRow[]> {
  const { data, error } = await db()
    .from("sessions")
    .select("id, source_type, source_url, title, dialect, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not list sessions: ${error.message}`);
  return (data ?? []) as SessionRow[];
}

export type SessionDetail = {
  session: SessionRow;
  enrichment: Enrichment | null;
  model: string | null;
  sourceAvailable: boolean;
};

export async function getSession(id: string): Promise<SessionDetail | null> {
  const { data: session, error } = await db()
    .from("sessions")
    .select("id, source_type, source_url, title, dialect, status, error, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the session: ${error.message}`);
  if (!session) return null;

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

  const parsed = row ? enrichmentSchema.safeParse(row.json) : null;
  return {
    session: session as SessionRow,
    enrichment: parsed?.success ? parsed.data : null,
    model: parsed?.success ? String(row?.model) : null,
    sourceAvailable: Boolean(source),
  };
}
