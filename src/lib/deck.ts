import { explainDeckError } from "./db-errors";
import type { DeckPayload } from "./deck-payload";
import { deckKey } from "./deck-payload";
import { resolveLanguage, type Language } from "./languages";
import { schedule, type Rating } from "./srs";
import { db } from "./supabase";
import { UserFacingError } from "./sessions";

export type DeckItem = {
  id: string;
  language: Language;
  payload: DeckPayload;
  box: number;
  reps: number;
  lapses: number;
  next_review_at: string;
  created_at: string;
};

export const QUIZ_SIZE = 20;

function toItem(raw: Record<string, unknown>): DeckItem {
  return {
    id: String(raw.id),
    language: resolveLanguage(raw.language),
    payload: raw.payload as DeckPayload,
    box: Number(raw.box ?? 0),
    reps: Number(raw.reps ?? 0),
    lapses: Number(raw.lapses ?? 0),
    next_review_at: String(raw.next_review_at),
    created_at: String(raw.created_at),
  };
}

/** A missing table is a setup step, not a bug: say which migration to run. */
function fail(action: string, message: string): never {
  const explained = explainDeckError(message);
  if (explained) throw new UserFacingError(explained, 503);
  throw new Error(`${action}: ${message}`);
}

/** Save a word. Saving the same word twice does nothing. Returns whether a new card was made. */
export async function addToDeck(args: {
  language: Language;
  payload: DeckPayload;
  sessionId: string | null;
}): Promise<{ created: boolean }> {
  const { data, error } = await db()
    .from("deck_items")
    .upsert(
      {
        kind: "vocab",
        language: args.language,
        key: deckKey(args.payload.lemma),
        payload: args.payload,
        session_id: args.sessionId,
      },
      { onConflict: "language,kind,key", ignoreDuplicates: true },
    )
    .select("id");
  if (error) fail("Could not save the word", error.message);
  return { created: (data?.length ?? 0) > 0 };
}

export async function listDeck(language: Language, limit = 500): Promise<DeckItem[]> {
  const { data, error } = await db()
    .from("deck_items")
    .select("*")
    .eq("language", language)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("Could not load the deck", error.message);
  return (data ?? []).map(toItem);
}

/** Cards due now, longest overdue first. */
export async function listDue(language: Language, now: Date = new Date(), limit = QUIZ_SIZE): Promise<DeckItem[]> {
  const { data, error } = await db()
    .from("deck_items")
    .select("*")
    .eq("language", language)
    .lte("next_review_at", now.toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);
  if (error) fail("Could not load the quiz", error.message);
  return (data ?? []).map(toItem);
}

export type DeckSummary = { total: number; due: number };

export async function deckSummary(language: Language, now: Date = new Date()): Promise<DeckSummary> {
  const [all, due] = await Promise.all([
    db().from("deck_items").select("id", { count: "exact", head: true }).eq("language", language),
    db()
      .from("deck_items")
      .select("id", { count: "exact", head: true })
      .eq("language", language)
      .lte("next_review_at", now.toISOString()),
  ]);
  if (all.error) fail("Could not count the deck", all.error.message);
  if (due.error) fail("Could not count the deck", due.error.message);
  return { total: all.count ?? 0, due: due.count ?? 0 };
}

/** Record a rating and move the card to its next box. */
export async function reviewCard(id: string, rating: Rating, now: Date = new Date()): Promise<void> {
  const { data, error } = await db().from("deck_items").select("*").eq("id", id).maybeSingle();
  if (error) fail("Could not load the card", error.message);
  if (!data) throw new UserFacingError("That card is already gone.", 404);

  const card = toItem(data);
  const next = schedule(card, rating, now);
  const { error: updateError } = await db().from("deck_items").update(next).eq("id", id);
  if (updateError) fail("Could not save the review", updateError.message);
}

export async function removeCard(id: string): Promise<void> {
  const { data, error } = await db().from("deck_items").delete().eq("id", id).select("id");
  if (error) fail("Could not delete the card", error.message);
  if (!data || data.length === 0) throw new UserFacingError("That card is already gone.", 404);
}
