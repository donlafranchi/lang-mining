import { coreWords } from "../core";
import type { FarsiEnrichment } from "../enrichment/farsi-schema";
import type { Enrichment } from "../enrichment/schema";
import type { Language } from "../languages";
import { lexiconKey, mergeLemma, normalizePos, type FormRow, type LemmaRow } from "./model";
import type { LexiconStore } from "./store";

type Collected = { lemmas: Map<string, LemmaRow>; forms: Map<string, FormRow> };

function addEntry(
  c: Collected,
  language: Language,
  e: { lemma: string; pos: string; english: string; level?: string; transliteration?: string; form?: string; morph?: string },
): void {
  const lemma = e.lemma.trim();
  if (!lemma || !e.english.trim()) return;
  const pos = normalizePos(e.pos);
  const lemma_key = lexiconKey(lemma);
  const id = `${lemma_key}|${pos}`;

  const row: LemmaRow = {
    language,
    lemma,
    lemma_key,
    pos,
    transliteration: e.transliteration?.trim() || null,
    level: e.level ?? null,
    core_rank: null,
    senses: [{ english: e.english.trim(), count: 1 }],
    source: "llm",
    uses: 1,
  };
  const have = c.lemmas.get(id);
  c.lemmas.set(id, have ? mergeLemma(have, row) : row);

  if (e.form?.trim()) {
    const form_key = lexiconKey(e.form);
    const fid = `${form_key}|${lemma_key}|${pos}`;
    const morph = e.morph ?? "";
    const f = c.forms.get(fid);
    if (f) f.uses += 1;
    else c.forms.set(fid, { language, form_key, lemma_key, pos, morph, uses: 1 });
  }
}

const morphOf = (v: { tense: string; mood: string; person: string }) => [v.tense, v.mood, v.person].filter(Boolean).join("|");

/** What one finished lesson tells us about words: dictionary forms, glosses, levels, and which written forms point to which. */
export function collectFromLesson(language: Language, lesson: Enrichment | FarsiEnrichment): Collected {
  const c: Collected = { lemmas: new Map(), forms: new Map() };
  if (language === "fa") {
    for (const p of (lesson as FarsiEnrichment).paragraphs) {
      for (const w of p.words) {
        addEntry(c, language, { lemma: w.lemma, pos: w.part_of_speech, english: w.english, level: w.level, transliteration: w.transliteration, form: w.surface });
      }
      for (const v of p.verbs) {
        addEntry(c, language, { lemma: v.infinitive, pos: "verb", english: v.english, transliteration: v.transliteration, form: v.form_in_source, morph: morphOf(v) });
      }
    }
  } else {
    for (const p of (lesson as Enrichment).paragraphs) {
      for (const w of p.vocab) {
        addEntry(c, language, { lemma: w.lemma, pos: w.part_of_speech, english: w.english, level: w.level, form: w.surface_form });
      }
      for (const v of p.verbs) {
        addEntry(c, language, { lemma: v.infinitive, pos: "verb", english: v.english, form: v.form_in_source, morph: morphOf(v) });
      }
    }
  }
  return c;
}

const CHUNK = 400;
function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function writeMerged(store: LexiconStore, language: Language, c: Collected): Promise<void> {
  for (const part of chunks([...c.lemmas.values()])) {
    const existing = await store.getLemmas(language, part.map((r) => r.lemma_key));
    const byId = new Map(existing.map((r) => [`${r.lemma_key}|${r.pos}`, r]));
    await store.upsertLemmas(part.map((r) => mergeLemma(byId.get(`${r.lemma_key}|${r.pos}`), r)));
  }
  for (const part of chunks([...c.forms.values()])) {
    const existing = await store.getForms(language, part.map((f) => f.form_key));
    const byId = new Map(existing.map((f) => [`${f.form_key}|${f.lemma_key}|${f.pos}`, f]));
    await store.upsertForms(
      part.map((f) => {
        const have = byId.get(`${f.form_key}|${f.lemma_key}|${f.pos}`);
        return have ? { ...have, morph: have.morph || f.morph, uses: have.uses + f.uses } : f;
      }),
    );
  }
}

/** Save what a lesson taught us. A failure here must never fail the lesson, so callers use harvestSafely. */
export async function harvestLesson(store: LexiconStore, language: Language, lesson: Enrichment | FarsiEnrichment): Promise<void> {
  await writeMerged(store, language, collectFromLesson(language, lesson));
}

/** Load the core 2,000 words into the lexicon with their rank. Safe to run again. */
export async function seedCore(store: LexiconStore, language: Language): Promise<number> {
  const c: Collected = { lemmas: new Map(), forms: new Map() };
  for (const w of coreWords(language)) {
    const pos = normalizePos(w.part_of_speech);
    const lemma_key = lexiconKey(w.lemma);
    c.lemmas.set(`${lemma_key}|${pos}`, {
      language,
      lemma: w.lemma,
      lemma_key,
      pos,
      transliteration: w.transliteration ?? null,
      level: null,
      core_rank: w.rank,
      senses: [{ english: w.english, count: 1 }],
      source: "core",
      uses: 0,
    });
  }
  // Seeding twice must not count the same gloss twice, so rows that already exist are left as they are.
  let added = 0;
  for (const part of chunks([...c.lemmas.values()])) {
    const existing = await store.getLemmas(language, part.map((r) => r.lemma_key));
    const have = new Set(existing.map((r) => `${r.lemma_key}|${r.pos}`));
    const rows = part.filter((r) => !have.has(`${r.lemma_key}|${r.pos}`));
    // Words a lesson saw first get their core rank added, without touching their senses.
    const rank = existing
      .filter((r) => r.core_rank === null)
      .map((r) => ({ ...r, core_rank: c.lemmas.get(`${r.lemma_key}|${r.pos}`)?.core_rank ?? null }))
      .filter((r) => r.core_rank !== null);
    await store.upsertLemmas([...rows, ...rank]);
    added += rows.length;
  }
  return added;
}

/** Harvest without ever throwing: the lexicon is a bonus, and a missing table must not break a lesson. */
export async function harvestSafely(store: LexiconStore, language: Language, lesson: Enrichment | FarsiEnrichment): Promise<void> {
  try {
    await harvestLesson(store, language, lesson);
  } catch (err) {
    console.error("lexicon harvest skipped", err instanceof Error ? err.message : err);
  }
}
