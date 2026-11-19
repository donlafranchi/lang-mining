import { deckKey } from "./deck-payload";

/** A word is letters, marks and the Persian half-space (which sits inside words like می‌خوانم). */
const TOKEN = /[\p{L}\p{M}‌]+/gu;

/** Function words (the, of, and) would underline half of every sentence, so only content words are marked. */
const CONTENT = new Set(["noun", "verb", "adj", "adv", "num"]);

type CoreLike = { rank: number; lemma: string; part_of_speech: string };

export type Piece = { text: string; rank?: number };

export function tokens(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

/**
 * The written forms in these paragraphs that are core words, mapped to their rank. A form counts when it is the core
 * word itself, or when the lesson glossed it and gave a core word as its dictionary form (so "dado" counts for "dar").
 */
export function coreHighlightMap(
  core: CoreLike[],
  paragraphs: string[],
  glossed: { form: string; lemma: string }[],
): Record<string, number> {
  const byLemma = new Map<string, number>();
  for (const w of core) if (CONTENT.has(w.part_of_speech)) byLemma.set(deckKey(w.lemma), w.rank);

  const out: Record<string, number> = {};
  for (const text of paragraphs) {
    for (const t of tokens(text)) {
      const rank = byLemma.get(deckKey(t));
      if (rank) out[deckKey(t)] = rank;
    }
  }
  for (const g of glossed) {
    const rank = byLemma.get(deckKey(g.lemma));
    if (rank) out[deckKey(g.form)] = rank;
  }
  return out;
}

/** Cut text into pieces, tagging the words that are in the map. Joining the pieces gives back the exact text. */
export function splitForHighlight(text: string, forms: Record<string, number>): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const rank = forms[deckKey(m[0])];
    if (!rank) continue;
    const start = m.index ?? 0;
    if (start > last) pieces.push({ text: text.slice(last, start) });
    pieces.push({ text: m[0], rank });
    last = start + m[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}
