import { lexiconKey } from "../lexicon/model";
import type { Verb, Vocab } from "./schema";

/** One line of a lesson's word list: a plain word, or a verb that opens to show its conjugation. */
export type WordRow = { kind: "word"; vocab: Vocab } | { kind: "verb"; verb: Verb; senses?: string[] };

/**
 * Words and verbs for one paragraph as a single list, in the order they appear in the text. A verb that is also
 * listed as a word shows once, as a verb, and keeps the word's other meanings.
 */
const PROPER = /proper|propn|nombre propio/i;

export function paragraphRows(text: string, vocabAll: Vocab[], verbs: Verb[]): WordRow[] {
  // Names of people, places and organizations are not vocabulary.
  const vocab = vocabAll.filter((v) => !PROPER.test(v.part_of_speech));
  const verbLemmas = new Set(verbs.map((v) => lexiconKey(v.infinitive)));
  const sensesByLemma = new Map(vocab.filter((v) => v.senses && v.senses.length > 1).map((v) => [lexiconKey(v.lemma), v.senses!]));
  const entries: { row: WordRow; form: string }[] = [
    ...vocab.filter((v) => !verbLemmas.has(lexiconKey(v.lemma))).map((v) => ({ row: { kind: "word", vocab: v } as WordRow, form: v.surface_form })),
    ...verbs.map((v) => {
      const senses = sensesByLemma.get(lexiconKey(v.infinitive));
      return { row: { kind: "verb", verb: v, ...(senses ? { senses } : {}) } as WordRow, form: v.form_in_source };
    }),
  ];
  const lower = text.toLowerCase();
  return entries
    .map((e, i) => {
      const at = lower.indexOf(e.form.toLowerCase());
      return { e, i, at: at < 0 ? Number.MAX_SAFE_INTEGER : at };
    })
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((x) => x.e.row);
}
