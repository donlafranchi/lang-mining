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
