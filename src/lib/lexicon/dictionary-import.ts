import type { Language } from "../languages";
import { mergeLemma, type FormRow, type LemmaRow } from "./model";
import type { LexiconStore } from "./store";
import { parseWiktionaryLine } from "./wiktionary";

export type ImportCounts = { lines: number; lemmas: number; forms: number; skipped: number };

const BATCH = 400;

/** Write one batch. Existing words keep their core rank and level and gain the dictionary's senses; forms never lose their use counts. */
async function flush(store: LexiconStore, language: Language, lemmas: Map<string, LemmaRow>, forms: Map<string, FormRow>): Promise<void> {
  if (lemmas.size > 0) {
    const rows = [...lemmas.values()];
    const existing = await store.getLemmas(language, rows.map((r) => r.lemma_key));
    const byId = new Map(existing.map((r) => [`${r.lemma_key}|${r.pos}`, r]));
    await store.upsertLemmas(rows.map((r) => mergeLemma(byId.get(`${r.lemma_key}|${r.pos}`), r)));
  }
  if (forms.size > 0) {
    const rows = [...forms.values()];
    const existing = await store.getForms(language, rows.map((f) => f.form_key));
    const byId = new Map(existing.map((f) => [`${f.form_key}|${f.lemma_key}|${f.pos}`, f]));
    await store.upsertForms(rows.map((f) => byId.get(`${f.form_key}|${f.lemma_key}|${f.pos}`) ?? f));
  }
}

/** Import dictionary lines (any async source of lines) into the lexicon. Stops after `limit` lines when given. */
export async function importDictionary(
  store: LexiconStore,
  language: Language,
  lines: AsyncIterable<string>,
  options: { limit?: number; onProgress?: (counts: ImportCounts) => void } = {},
): Promise<ImportCounts> {
  const counts: ImportCounts = { lines: 0, lemmas: 0, forms: 0, skipped: 0 };
  let lemmas = new Map<string, LemmaRow>();
  let forms = new Map<string, FormRow>();

  const write = async () => {
    await flush(store, language, lemmas, forms);
    lemmas = new Map();
    forms = new Map();
    options.onProgress?.(counts);
  };

  for await (const line of lines) {
    if (!line.trim()) continue;
    counts.lines += 1;
    const parsed = parseWiktionaryLine(language, line);
    if (!parsed) {
      counts.skipped += 1;
    } else {
      if (parsed.lemma) {
        const id = `${parsed.lemma.lemma_key}|${parsed.lemma.pos}`;
        const have = lemmas.get(id);
        lemmas.set(id, have ? mergeLemma(have, parsed.lemma) : parsed.lemma);
        counts.lemmas += 1;
      }
      for (const f of parsed.forms) {
        forms.set(`${f.form_key}|${f.lemma_key}|${f.pos}`, f);
        counts.forms += 1;
      }
    }
    if (lemmas.size + forms.size >= BATCH) await write();
    if (options.limit && counts.lines >= options.limit) break;
  }
  await write();
  return counts;
}
