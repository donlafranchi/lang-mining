import { tokens } from "../highlight";
import type { Language } from "../languages";
import type { FarsiWord } from "../enrichment/farsi-schema";
import type { Vocab } from "../enrichment/schema";
import { lexiconKey, type FormRow, type LemmaRow } from "./model";
import type { LexiconStore } from "./store";

/** A word the lexicon already knows: its dictionary form, and every sense we have collected for it. */
export type KnownWord = {
  lemma: string;
  pos: string;
  senses: string[];
  transliteration: string | null;
  level: string | null;
  core_rank: number | null;
};

/** Rough CEFR level from how common a core word is. A stored level always wins over this. */
export function levelFromRank(rank: number | null): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  if (rank === null) return "B1";
  if (rank <= 300) return "A1";
  if (rank <= 800) return "A2";
  if (rank <= 1500) return "B1";
  return "B2";
}

const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
export function levelOf(k: KnownWord): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  return k.level && LEVELS.has(k.level) ? (k.level as ReturnType<typeof levelFromRank>) : levelFromRank(k.core_rank);
}

const best = <T extends { uses: number }>(items: T[]) => items.reduce((a, b) => (b.uses > a.uses ? b : a));

/**
 * Look each written form up: first as a known inflected form of some word, then as a dictionary form itself. Where a
 * form could belong to several words the most used one wins, and its senses are all listed, so nothing is decided for
 * the learner. A storage failure means nothing is known, never an error.
 */
export type LemmaHint = { lemma: string; pos: string };

/** Only content words are resolved by the analyzer's dictionary form. Function words ("lo", "se") keep their own entry. */
const HINT_POS = new Set(["noun", "verb", "adj", "adv"]);

export async function lookupTokens(
  store: LexiconStore,
  language: Language,
  words: string[],
  /** Dictionary forms from the language analyzer, by written form. They beat guessing from stored forms. */
  hints: Map<string, LemmaHint> = new Map(),
): Promise<Map<string, KnownWord>> {
  const out = new Map<string, KnownWord>();
  try {
    const keys = [...new Set(words.map(lexiconKey))].filter(Boolean);
    if (keys.length === 0) return out;

    const forms = await store.getForms(language, keys);
    const formsByKey = new Map<string, FormRow[]>();
    for (const f of forms) formsByKey.set(f.form_key, [...(formsByKey.get(f.form_key) ?? []), f]);

    const hintKeys = [...hints.values()].map((h) => lexiconKey(h.lemma));
    const lemmaKeys = [...new Set([...keys, ...forms.map((f) => f.lemma_key), ...hintKeys])];
    const lemmas = await store.getLemmas(language, lemmaKeys);
    const lemmasByKey = new Map<string, LemmaRow[]>();
    for (const l of lemmas) lemmasByKey.set(l.lemma_key, [...(lemmasByKey.get(l.lemma_key) ?? []), l]);

    for (const key of keys) {
      let row: LemmaRow | undefined;
      const hint = hints.get(key);
      if (hint && HINT_POS.has(hint.pos)) {
        const candidates = lemmasByKey.get(lexiconKey(hint.lemma)) ?? [];
        row = candidates.find((l) => l.pos === hint.pos) ?? candidates[0];
      }
      const viaForm = row ? undefined : formsByKey.get(key);
      if (viaForm) {
        const f = best(viaForm);
        row = lemmasByKey.get(f.lemma_key)?.find((l) => l.pos === f.pos);
      }
      if (!row) {
        const same = lemmasByKey.get(key);
        // A core word is the likelier reading, then the most used.
        if (same) row = same.reduce((a, b) => ((b.core_rank !== null ? 1e6 : 0) + b.uses > (a.core_rank !== null ? 1e6 : 0) + a.uses ? b : a));
      }
      if (row && row.senses.length > 0) {
        out.set(key, {
          lemma: row.lemma,
          pos: row.pos,
          senses: row.senses.map((s) => s.english),
          transliteration: row.transliteration,
          level: row.level,
          core_rank: row.core_rank,
        });
      }
    }
  } catch (err) {
    console.error("lexicon lookup skipped", err instanceof Error ? err.message : err);
    return new Map();
  }
  return out;
}

export const CONTENT_POS = new Set(["noun", "verb", "adj", "adv", "num"]);

export type HelpPolicy = "full" | "medium" | "light";

/**
 * Which known words the app explains itself, and which the model is told to leave out. At full help every known word
 * is explained here. At medium only content words are, and the model is told to skip all known words, since it skips
 * the basic small ones anyway. At light the model chooses a few key words freely, so nothing is injected.
 */
export function splitKnown(
  paragraph: string,
  known: Map<string, KnownWord>,
  help: HelpPolicy,
): { explain: { token: string; word: KnownWord }[]; skip: string[] } {
  if (help === "light") return { explain: [], skip: [] };
  const seen = new Set<string>();
  const explain: { token: string; word: KnownWord }[] = [];
  const skip: string[] = [];
  for (const token of tokens(paragraph)) {
    const key = lexiconKey(token);
    if (seen.has(key)) continue;
    seen.add(key);
    const word = known.get(key);
    if (!word) continue;
    skip.push(token);
    if (help === "full" || CONTENT_POS.has(word.pos)) explain.push({ token, word });
  }
  return { explain, skip };
}

export function knownToVocab(token: string, k: KnownWord): Vocab {
  return {
    lemma: k.lemma,
    surface_form: token,
    part_of_speech: k.pos,
    english: k.senses[0],
    example_fragment: "",
    level: levelOf(k),
    ...(k.senses.length > 1 ? { senses: k.senses.slice(0, 8) } : {}),
  };
}

export function knownToFarsiWord(token: string, k: KnownWord): FarsiWord {
  return {
    lemma: k.lemma,
    surface: token,
    transliteration: k.transliteration ?? k.lemma,
    part_of_speech: k.pos,
    english: k.senses[0],
    level: levelOf(k),
    register: "neutral",
    ...(k.senses.length > 1 ? { senses: k.senses.slice(0, 8) } : {}),
  };
}

/** Put entries in the order their words first appear in the paragraph, one per dictionary form. Unplaceable ones go last. */
export function orderByAppearance<T extends { lemma: string }>(paragraph: string, entries: T[], formOf: (e: T) => string): T[] {
  const lower = paragraph.toLowerCase();
  const seen = new Set<string>();
  const placed = entries
    .filter((e) => {
      const key = lexiconKey(e.lemma);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((e, i) => {
      const at = lower.indexOf(formOf(e).toLowerCase());
      return { e, at: at < 0 ? Number.MAX_SAFE_INTEGER : at, i };
    });
  return placed.sort((a, b) => a.at - b.at || a.i - b.i).map((x) => x.e);
}
