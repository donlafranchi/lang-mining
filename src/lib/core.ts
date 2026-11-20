// The 2,000 most common words of a language, in frequency order. Know these and you can get by; the rest comes from
// reading. The lists live in src/data/core as tab-separated text (one word per line, most common first).

import { CORE_ES_1 } from "../data/core/es-1";
import { CORE_ES_2 } from "../data/core/es-2";
import { CORE_ES_3 } from "../data/core/es-3";
import { CORE_ES_4 } from "../data/core/es-4";
import { CORE_FA_1 } from "../data/core/fa-1";
import { CORE_FA_2 } from "../data/core/fa-2";
import { CORE_FA_3 } from "../data/core/fa-3";
import { CORE_FA_4 } from "../data/core/fa-4";
import { deckKey, type DeckPayload } from "./deck-payload";
import type { Language } from "./languages";

export const CORE_SIZE = 2000;

export type CoreWord = {
  /** 1 is the most common word. */
  rank: number;
  lemma: string;
  part_of_speech: string;
  english: string;
  /** Latin spelling, for Farsi. */
  transliteration?: string;
};

/** Turn tab-separated lines into words. Spanish lines are lemma, pos, english. Farsi lines add a transliteration second. */
export function parseCore(language: Language, chunks: string[]): CoreWord[] {
  const words: CoreWord[] = [];
  for (const chunk of chunks) {
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      const f = line.split("\t");
      if (language === "fa") {
        const [lemma, transliteration, part_of_speech, english] = f;
        words.push({ rank: words.length + 1, lemma, transliteration, part_of_speech, english });
      } else {
        const [lemma, part_of_speech, english] = f;
        words.push({ rank: words.length + 1, lemma, part_of_speech, english });
      }
    }
  }
  return words;
}

const cache = new Map<Language, CoreWord[]>();

export function coreWords(language: Language): CoreWord[] {
  let words = cache.get(language);
  if (!words) {
    words =
      language === "fa"
        ? parseCore("fa", [CORE_FA_1, CORE_FA_2, CORE_FA_3, CORE_FA_4])
        : parseCore("es", [CORE_ES_1, CORE_ES_2, CORE_ES_3, CORE_ES_4]);
    cache.set(language, words);
  }
  return words;
}

/** Rank of each lemma on the core list, for the lemmas given. Words not on the list are left out. */
export function coreRanksFor(language: Language, lemmas: string[]): Record<string, number> {
  const byKey = new Map(coreWords(language).map((w) => [deckKey(w.lemma), w.rank]));
  const out: Record<string, number> = {};
  for (const lemma of lemmas) {
    const rank = byKey.get(deckKey(lemma));
    if (rank) out[lemma] = rank;
  }
  return out;
}

export type CoreProgress = {
  total: number;
  /** Core words already in the person's deck. */
  inDeck: number;
  /** The most common core words not yet in the deck, in order. */
  next: CoreWord[];
};

export function coreProgress(words: CoreWord[], deckKeys: Set<string>, nextCount = 20): CoreProgress {
  const missing = words.filter((w) => !deckKeys.has(deckKey(w.lemma)));
  return { total: words.length, inDeck: words.length - missing.length, next: missing.slice(0, nextCount) };
}

export function coreToPayload(w: CoreWord): DeckPayload {
  const payload: DeckPayload = { lemma: w.lemma, english: w.english, part_of_speech: w.part_of_speech, example: "" };
  if (w.transliteration) payload.transliteration = w.transliteration;
  return payload;
}

/** Words worth learning first: nouns, verbs, adjectives and adverbs. Prepositions, articles and pronouns come along anyway. */
const CONTENT_POS = new Set(["noun", "verb", "adj", "adv", "num"]);

export type CoreBatch = {
  words: CoreWord[];
  /** The rank to start the following batch from, or null when this one reaches the end of the list. */
  nextStart: number | null;
  /** The rank to start the previous batch from, or null when nothing earlier is left to offer. */
  prevStart: number | null;
};

/**
 * The next few core words to offer, from a rank onward, skipping words already in the deck. Content words only by
 * default, so the first screen is not twenty prepositions. `nextStart` lets the learner skip a batch without adding it.
 */
export function coreBatch(
  words: CoreWord[],
  deckKeys: Set<string>,
  options: { start?: number; size?: number; contentOnly?: boolean } = {},
): CoreBatch {
  const { start = 1, size = 20, contentOnly = true } = options;
  const offered = words.filter((w) => !deckKeys.has(deckKey(w.lemma)) && (!contentOnly || CONTENT_POS.has(w.part_of_speech)));
  const candidates = offered.filter((w) => w.rank >= start);
  const earlier = offered.filter((w) => w.rank < start);
  const batch = candidates.slice(0, size);
  const nextStart = candidates.length > size ? batch[batch.length - 1].rank + 1 : null;
  const prevStart = earlier.length > 0 ? earlier[Math.max(0, earlier.length - size)].rank : null;
  return { words: batch, nextStart, prevStart };
}
