import { createAnthropicComplete, MODEL } from "./anthropic";
import { enrichText } from "./enrichment/enrich";
import { DIALECTS, enrichmentSchema, type Dialect, type Enrichment } from "./enrichment/schema";
import { fetchArticleText, looksLikeUrl } from "./ingest/extract";
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

async function saveEnrichment(sessionId: string, dialect: Dialect, data: Enrichment) {
  const { error } = await db()
    .from("enrichments")
    .upsert(
      { session_id: sessionId, dialect, json: data, model: MODEL },
      { onConflict: "session_id,dialect" },
    );
  if (error) throw new Error(`Could not save the lesson: ${error.message}`);
}

/** Paste text or a URL, get back a session id. The lesson is built before this returns. */
export async function createSession(args: { input: string; dialect: Dialect }): Promise<{ id: string; status: SessionRow["status"] }> {
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

  try {
    const enrichment = await enrichText({ text, dialect: args.dialect, complete: createAnthropicComplete() });
    await saveEnrichment(session.id, args.dialect, enrichment);
    await db().from("sessions").update({ status: "ready", error: null }).eq("id", session.id);
    return { id: session.id, status: "ready" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed.";
    await db().from("sessions").update({ status: "failed", error: message }).eq("id", session.id);
    return { id: session.id, status: "failed" };
  }
}

/** Re-run enrichment for another dialect from the stored source text, with no re-fetch. */
export async function rerunSession(id: string, dialect: Dialect): Promise<void> {
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

  const enrichment = await enrichText({ text: source.text, dialect, complete: createAnthropicComplete() });
  await saveEnrichment(id, dialect, enrichment);
  await db().from("sessions").update({ dialect, status: "ready", error: null }).eq("id", id);
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
    db().from("enrichments").select("dialect, json").eq("session_id", id),
    db().from("source_texts").select("session_id").eq("session_id", id).maybeSingle(),
  ]);

  const enrichments: Partial<Record<Dialect, Enrichment>> = {};
  for (const row of rows ?? []) {
    const parsed = enrichmentSchema.safeParse(row.json);
    if (parsed.success && isDialect(row.dialect)) enrichments[row.dialect] = parsed.data;
  }
  return { session: session as SessionRow, enrichments, sourceAvailable: Boolean(source) };
}
