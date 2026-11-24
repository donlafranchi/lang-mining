import type { FarsiVerb, FarsiWord } from "./farsi-schema";

export type FarsiRow = { kind: "word"; word: FarsiWord } | { kind: "verb"; verb: FarsiVerb; senses?: string[] };

const PROPER = /proper|propn|name/i;
const strip = (s: string) => s.replace(/[\u064B-\u065F\u200C\u200F]/g, "").trim();

/**
 * Words and verbs for one Farsi paragraph as one list in the order they appear in the text, like the Spanish side.
 * A verb also listed as a word shows once, as a verb. Names of people and places are not vocabulary.
 */
export function farsiParagraphRows(text: string, wordsAll: FarsiWord[], verbs: FarsiVerb[]): FarsiRow[] {
  const words = wordsAll.filter((w) => !PROPER.test(w.part_of_speech));
  const verbLemmas = new Set(verbs.map((v) => strip(v.infinitive)));
  const sensesByLemma = new Map(words.filter((w) => w.senses && w.senses.length > 1).map((w) => [strip(w.lemma), w.senses!]));
  const entries: { row: FarsiRow; form: string }[] = [
    ...words.filter((w) => !verbLemmas.has(strip(w.lemma))).map((w) => ({ row: { kind: "word", word: w } as FarsiRow, form: w.surface })),
    ...verbs.map((v) => {
      const senses = sensesByLemma.get(strip(v.infinitive));
      return { row: { kind: "verb", verb: v, ...(senses ? { senses } : {}) } as FarsiRow, form: v.form_in_source };
    }),
  ];
  const plain = strip(text);
  return entries
    .map((e, i) => {
      const at = plain.indexOf(strip(e.form));
      return { e, i, at: at < 0 ? Number.MAX_SAFE_INTEGER : at };
    })
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((x) => x.e.row);
}

/** What a tapped word shows: how it is written, how to say it, what it means, and what to save. */
export type Gloss = {
  written: string;
  translit: string;
  meaning: string;
  pos: string;
  lemma: string;
  save: { lemma: string; english: string; part_of_speech: string; transliteration: string; example_fragment: string };
};

/** The form of a word used to match it to the text: no vowel marks, joiners or punctuation. */
export function glossKey(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u200C\u200D\u200E\u200F]/g, "")
    .replace(/[\s.,;:!?"'()[\]{}«»“”‘’…،؛؟\-–—]/g, "")
    .toLowerCase();
}

/** Every word and verb of a paragraph by the form it takes in the text, so a tap can show its meaning. */
export function farsiGlosses(rows: FarsiRow[]): Map<string, Gloss> {
  const out = new Map<string, Gloss>();
  for (const r of rows) {
    if (r.kind === "word") {
      const w = r.word;
      const key = glossKey(w.surface);
      if (key && !out.has(key))
        out.set(key, {
          written: w.surface,
          translit: w.transliteration,
          meaning: w.senses && w.senses.length > 1 ? w.senses.slice(0, 4).join(", ") : w.english,
          pos: w.part_of_speech,
          lemma: w.lemma,
          save: { lemma: w.lemma, english: w.english, part_of_speech: w.part_of_speech, transliteration: w.transliteration, example_fragment: "" },
        });
    } else {
      const v = r.verb;
      const key = glossKey(v.form_in_source);
      if (key && !out.has(key))
        out.set(key, {
          written: v.form_in_source,
          translit: v.form_transliteration,
          meaning: v.form_english,
          pos: "verb",
          lemma: v.infinitive,
          save: { lemma: v.infinitive, english: v.english, part_of_speech: "verb", transliteration: v.transliteration, example_fragment: "" },
        });
    }
  }
  return out;
}

/** The first short meaning of a gloss: "to go, to leave" becomes "go". Long glosses are cut so a column stays narrow. */
export function shortGloss(meaning: string, max = 16): string {
  const first = meaning.split(/[;,/]/)[0].replace(/\([^)]*\)/g, "").replace(/^(to|the|a|an) /i, "").trim();
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

export type InterlinearWord = { word: string; gloss: string | null };

/** A sentence cut into its words, each with its short English meaning when the lesson has one, in reading order. */
export function interlinear(text: string, glosses: Map<string, Gloss>): InterlinearWord[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const g = glosses.get(glossKey(word));
      return { word, gloss: g ? shortGloss(g.meaning) || null : null };
    });
}
