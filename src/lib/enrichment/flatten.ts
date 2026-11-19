import type { FarsiEnrichment, FarsiIdiom, FarsiVerb, FarsiWord } from "./farsi-schema";
import type { Enrichment, Idiom, Verb, Vocab } from "./schema";

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item).trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/** Whole-article lists for the Vocab, Idioms and Verbs tabs, built from every paragraph. First occurrence wins. */
export function allVocab(e: Enrichment): Vocab[] {
  return unique(e.paragraphs.flatMap((p) => p.vocab), (v) => v.lemma);
}

export function allIdioms(e: Enrichment): Idiom[] {
  return unique(e.paragraphs.flatMap((p) => p.idioms), (i) => i.phrase);
}

export function allVerbs(e: Enrichment): Verb[] {
  return unique(e.paragraphs.flatMap((p) => p.verbs), (v) => `${v.infinitive}|${v.form_in_source}`);
}

export function allFarsiWords(e: FarsiEnrichment): FarsiWord[] {
  return unique(e.paragraphs.flatMap((p) => p.words), (w) => w.lemma);
}

export function allFarsiIdioms(e: FarsiEnrichment): FarsiIdiom[] {
  return unique(e.paragraphs.flatMap((p) => p.idioms), (i) => i.phrase);
}

export function allFarsiVerbs(e: FarsiEnrichment): FarsiVerb[] {
  return unique(e.paragraphs.flatMap((p) => p.verbs), (v) => `${v.infinitive}|${v.form_in_source}`);
}

/**
 * A handful of words to show at the top of a lesson: words from the core 2,000 first (the ones worth learning), then
 * any others, each in the order they appear. One entry per dictionary form.
 */
export function keyWords(e: Enrichment, coreRanks: Record<string, number>, limit = 6): Vocab[] {
  const words = allVocab(e);
  const core = words.filter((v) => coreRanks[v.lemma]);
  const rest = words.filter((v) => !coreRanks[v.lemma]);
  return [...core, ...rest].slice(0, limit);
}
