import { createAnthropicComplete } from "./anthropic";
import { enrichText } from "./enrichment/enrich";
import { DIALECTS, enrichmentSchema, type Dialect, type Enrichment } from "./enrichment/schema";
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

export function isDialect(value: unknown): value is Dialect {
  return typeof value === "string" && (DIALECTS as readonly string[]).includes(value);
}

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

async function saveEnrichment(sessionId: string, dialect: Dialect, model: ModelId, data: Enrichment) {
  const { error } = await db()
    .from("enrichments")
    .upsert(
      { session_id: sessionId, dialect, json: data, model },
      { onConflict: "session_id,dialect" },
    );
  if (error) throw new Error(`Could not save the lesson: ${error.message}`);
}

/** Paste text or a URL. Saves the session and source text and returns at once; call buildSession in the background to make the lesson. */
export async function createSession(args: { input: string; dialect: Dialect }): Promise<{ id: string; text: string }> {
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
      dialect: args.dialect,
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
export async function buildSession(args: { id: string; text: string; dialect: Dialect; model: ModelId }): Promise<void> {
  try {
    const enrichment = await enrichText({ text: args.text, dialect: args.dialect, complete: createAnthropicComplete(args.model) });
    await saveEnrichment(args.id, args.dialect, args.model, enrichment);
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

/** Builds another dialect from stored text, in the background. A failure is logged and the lesson stays as it was. */
export async function finishRerun(args: { id: string; text: string; dialect: Dialect; model: ModelId }): Promise<void> {
  try {
    const enrichment = await enrichText({ text: args.text, dialect: args.dialect, complete: createAnthropicComplete(args.model) });
    await saveEnrichment(args.id, args.dialect, args.model, enrichment);
    await db().from("sessions").update({ dialect: args.dialect, status: "ready", error: null }).eq("id", args.id);
  } catch (err) {
    console.error("rerun failed", err);
  }
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
  enrichments: Partial<Record<Dialect, Enrichment>>;
  models: Partial<Record<Dialect, string>>;
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

  const [{ data: rows }, { data: source }] = await Promise.all([
    db().from("enrichments").select("dialect, json, model").eq("session_id", id),
    db().from("source_texts").select("session_id").eq("session_id", id).maybeSingle(),
  ]);

  const enrichments: Partial<Record<Dialect, Enrichment>> = {};
  const models: Partial<Record<Dialect, string>> = {};
  for (const row of rows ?? []) {
    const parsed = enrichmentSchema.safeParse(row.json);
    if (parsed.success && isDialect(row.dialect)) {
      enrichments[row.dialect] = parsed.data;
      models[row.dialect] = String(row.model);
    }
  }
  return { session: session as SessionRow, enrichments, models, sourceAvailable: Boolean(source) };
}
