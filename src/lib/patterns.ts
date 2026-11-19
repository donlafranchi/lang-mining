// Grammar patterns that are built from more than one word, so they are taught once as a pattern, with examples
// across different verbs, instead of as a separate item for every verb. Written by hand, never by the model, so the
// teaching is the same every time. The model only says which pattern appears in a paragraph.
//
// To support another language: add a catalog file (patterns-xx.ts) with ids prefixed by the language, register it in
// CATALOGS below, and give that language's lesson prompt and schema the same `patterns` field.

import type { Language } from "./languages";
import { FARSI_PATTERNS } from "./patterns-fa";
import { SPANISH_PATTERNS } from "./patterns-es";

export type PatternExample = {
  /** The sentence in the language, in its own script. */
  text: string;
  /** Latin letters, for languages the learner cannot read yet. */
  translit?: string;
  english: string;
};

export type Pattern = {
  /** Unique across all languages, so progress can be stored without a language column. */
  id: string;
  title: string;
  /** The recipe, short enough to scan. */
  build: string;
  /** One or two plain sentences for an English speaker. */
  explanation: string;
  examples: PatternExample[];
  /** One line for the model, so it can recognise the pattern. */
  hint: string;
};

const CATALOGS: Record<Language, Pattern[]> = { es: SPANISH_PATTERNS, fa: FARSI_PATTERNS };

export function patternsFor(language: Language): Pattern[] {
  return CATALOGS[language];
}

const BY_ID = new Map(Object.values(CATALOGS).flatMap((list) => list.map((p) => [p.id, p] as const)));

export function patternById(id: string): Pattern | undefined {
  return BY_ID.get(id);
}

/** The pattern list as lines for the model prompt. */
export function patternPromptLines(language: Language): string {
  return patternsFor(language)
    .map((p) => `  - ${p.id}: ${p.hint}`)
    .join("\n");
}

export type PatternUse = { id: string; quote: string };

/** The patterns used anywhere in a lesson, each once, with every quote where it appears. Unknown ids are dropped. */
export function lessonPatterns(paragraphs: { patterns?: PatternUse[] }[]): { pattern: Pattern; quotes: string[] }[] {
  const found = new Map<string, string[]>();
  for (const p of paragraphs) {
    for (const use of p.patterns ?? []) {
      if (!BY_ID.has(use.id)) continue;
      const quotes = found.get(use.id) ?? [];
      if (use.quote.trim() && !quotes.includes(use.quote.trim())) quotes.push(use.quote.trim());
      found.set(use.id, quotes);
    }
  }
  return [...found].map(([id, quotes]) => ({ pattern: BY_ID.get(id)!, quotes }));
}
