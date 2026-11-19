import type { FormRow, LemmaRow } from "../lib/lexicon/model";
import type { LexiconStore } from "../lib/lexicon/store";

/** An in-memory lexicon for tests. */
export function memoryStore() {
  const lemmas = new Map<string, LemmaRow>();
  const forms = new Map<string, FormRow>();
  const store: LexiconStore = {
    async getLemmas(language, keys) {
      return [...lemmas.values()].filter((r) => r.language === language && keys.includes(r.lemma_key));
    },
    async getForms(language, keys) {
      return [...forms.values()].filter((f) => f.language === language && keys.includes(f.form_key));
    },
    async upsertLemmas(rows) {
      for (const r of rows) lemmas.set(`${r.language}|${r.lemma_key}|${r.pos}`, structuredClone(r));
    },
    async upsertForms(rows) {
      for (const f of rows) forms.set(`${f.language}|${f.form_key}|${f.lemma_key}|${f.pos}`, structuredClone(f));
    },
  };
  return { store, lemmas, forms };
}
