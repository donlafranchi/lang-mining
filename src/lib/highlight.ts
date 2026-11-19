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

export type Mark = { start: number; end: number; id: string };

/** Where each pattern's quote sits in the paragraph. Quotes that cannot be found, and overlaps, are left out. */
export function locatePatternMarks(text: string, uses: { id: string; quote: string }[]): Mark[] {
  const lower = text.toLowerCase();
  const found: Mark[] = [];
  for (const u of uses) {
    const q = u.quote.trim().toLowerCase();
    if (!q) continue;
    const start = lower.indexOf(q);
    if (start < 0) continue;
    found.push({ start, end: start + q.length, id: u.id });
  }
  found.sort((a, b) => a.start - b.start);
  const out: Mark[] = [];
  for (const m of found) if (out.length === 0 || m.start >= out[out.length - 1].end) out.push(m);
  return out;
}

export type MarkedPart = { mark?: string; pieces: Piece[] };

/** Cut text at the marks, and cut each part again for the core words. Joining every piece gives back the text. */
export function splitMarked(text: string, forms: Record<string, number>, marks: Mark[]): MarkedPart[] {
  const parts: MarkedPart[] = [];
  let last = 0;
  for (const m of marks) {
    if (m.start > last) parts.push({ pieces: splitForHighlight(text.slice(last, m.start), forms) });
    parts.push({ mark: m.id, pieces: splitForHighlight(text.slice(m.start, m.end), forms) });
    last = m.end;
  }
  if (last < text.length || parts.length === 0) parts.push({ pieces: splitForHighlight(text.slice(last), forms) });
  return parts;
}
