import { deckKey } from "../deck-payload";
import type { Language } from "../languages";

export type Sense = { english: string; count: number };
export type LexiconSource = "llm" | "core" | "dictionary" | "analyzer" | "user";

export type LemmaRow = {
  language: Language;
  lemma: string;
  lemma_key: string;
  pos: string;
  transliteration: string | null;
  level: string | null;
  core_rank: number | null;
  senses: Sense[];
  source: LexiconSource;
  uses: number;
};

export type FormRow = {
  language: Language;
  form_key: string;
  lemma_key: string;
  pos: string;
  morph: string;
  uses: number;
};

export const MAX_SENSES = 8;

const POS_NAMES: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adj: "adj",
  adjective: "adj",
  adv: "adv",
  adverb: "adv",
  prep: "prep",
  preposition: "prep",
  postposition: "prep",
  pron: "pron",
  pronoun: "pron",
  conj: "conj",
  conjunction: "conj",
  det: "det",
  determiner: "det",
  article: "det",
  num: "num",
  numeral: "num",
  number: "num",
  interj: "interj",
  interjection: "interj",
  intj: "interj",
  particle: "other",
};

/** The model writes parts of speech in its own words ("adjective", "noun (masculine)"). Bring them to one short list. */
export function normalizePos(raw: string): string {
  const first = raw.toLowerCase().match(/[a-z]+/)?.[0] ?? "";
  return POS_NAMES[first] ?? "other";
}

export function lexiconKey(text: string): string {
  return deckKey(text);
}

function senseKey(english: string): string {
  return english.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Add glosses to a word's senses. A gloss seen again counts up, a new one is added, and the rarest are dropped past the cap. */
export function mergeSenses(existing: Sense[], incoming: string[], max = MAX_SENSES): Sense[] {
  const merged = existing.map((s) => ({ ...s }));
  for (const raw of incoming) {
    const english = raw.replace(/\s+/g, " ").trim();
    if (!english) continue;
    const found = merged.find((s) => senseKey(s.english) === senseKey(english));
    if (found) found.count += 1;
    else merged.push({ english, count: 1 });
  }
  // Stable: ties keep their order, so older senses win over newer ones.
  return merged
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.count - a.s.count || a.i - b.i)
    .slice(0, max)
    .map(({ s }) => s);
}

/** Combine what we already know about a word with what one lesson says about it. */
export function mergeLemma(existing: LemmaRow | undefined, incoming: LemmaRow): LemmaRow {
  if (!existing) return incoming;
  return {
    ...existing,
    // Keep what was filled first: a core or dictionary entry is not overwritten by a model's guess.
    transliteration: existing.transliteration ?? incoming.transliteration,
    level: existing.level ?? incoming.level,
    core_rank: existing.core_rank ?? incoming.core_rank,
    senses: mergeSenses(
      existing.senses,
      incoming.senses.flatMap((s) => Array<string>(s.count).fill(s.english)),
    ),
    uses: existing.uses + incoming.uses,
  };
}
