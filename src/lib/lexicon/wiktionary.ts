// Reads a Wiktionary extract in the JSON-lines layout used by kaikki.org (one JSON entry per line). It gives us two
// things the lexicon needs: English senses for each dictionary word, and which inflected forms belong to which word.
// Written from the published layout and not yet run on a real download, so unexpected shapes are skipped, never fatal.

import type { Language } from "../languages";
import { lexiconKey, normalizePos, type FormRow, type LemmaRow } from "./model";

type Gloss = { glosses?: unknown; tags?: unknown; form_of?: unknown; alt_of?: unknown };
type Raw = { word?: unknown; pos?: unknown; senses?: unknown; forms?: unknown };

export type ParsedEntry = { lemma?: LemmaRow; forms: FormRow[] };

const MAX_SENSES = 5;
const MAX_GLOSS_CHARS = 80;
// Senses nobody needs on a beginner's card.
const SKIP_SENSE_TAGS = new Set(["obsolete", "archaic", "historical", "dated", "rare", "nonstandard", "vulgar"]);
// Entries that are not words a learner reads in a story.
const SKIP_POS = new Set(["name", "phrase", "prefix", "suffix", "infix", "affix", "character", "symbol", "proverb", "contraction"]);

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function formOfWord(sense: Gloss): string | null {
  for (const key of [sense.form_of, sense.alt_of]) {
    if (Array.isArray(key)) {
      const first = key.find((x): x is { word: string } => typeof x === "object" && x !== null && typeof (x as { word?: unknown }).word === "string");
      if (first) return first.word;
    }
  }
  return null;
}

function cleanGloss(g: string): string {
  const oneLine = g.replace(/\s+/g, " ").trim();
  return oneLine.length > MAX_GLOSS_CHARS ? `${oneLine.slice(0, MAX_GLOSS_CHARS - 1).trimEnd()}…` : oneLine;
}

/** One line of the extract to a lexicon row and/or inflected-form rows. Anything unusable gives null. */
export function parseWiktionaryLine(language: Language, line: string): ParsedEntry | null {
  let raw: Raw;
  try {
    raw = JSON.parse(line) as Raw;
  } catch {
    return null;
  }
  const word = typeof raw.word === "string" ? raw.word.trim() : "";
  const posRaw = typeof raw.pos === "string" ? raw.pos : "";
  if (!word || SKIP_POS.has(posRaw)) return null;
  // Single words for Spanish. Persian has real two-word verbs (کار کردن), so spaces are allowed there.
  if (language === "es" && /\s/.test(word)) return null;
  const pos = normalizePos(posRaw);
  if (pos === "other" && posRaw !== "particle") return null;

  const senses = Array.isArray(raw.senses) ? (raw.senses as Gloss[]) : [];
  if (senses.length === 0) return null;

  // An entry whose every sense is "form of" another word is an inflected form, not a dictionary word.
  const owners = senses.map(formOfWord);
  if (owners.every((o) => o !== null)) {
    const lemma = owners[0] as string;
    const tags = [...new Set(senses.flatMap((s) => strings(s.tags)))].filter((t) => t !== "form-of");
    return { forms: [{ language, form_key: lexiconKey(word), lemma_key: lexiconKey(lemma), pos, morph: tags.join(" "), uses: 0 }] };
  }

  const glosses: string[] = [];
  for (const s of senses) {
    if (formOfWord(s)) continue;
    if (strings(s.tags).some((t) => SKIP_SENSE_TAGS.has(t))) continue;
    const g = strings(s.glosses)[0];
    if (g && !glosses.some((x) => x.toLowerCase() === g.toLowerCase())) glosses.push(cleanGloss(g));
    if (glosses.length >= MAX_SENSES) break;
  }
  if (glosses.length === 0) return null;

  let transliteration: string | null = null;
  if (language === "fa" && Array.isArray(raw.forms)) {
    const roman = (raw.forms as { form?: unknown; tags?: unknown }[]).find((f) => strings(f.tags).includes("romanization") && typeof f.form === "string");
    transliteration = (roman?.form as string | undefined) ?? null;
  }

  const lemma: LemmaRow = {
    language,
    lemma: word,
    lemma_key: lexiconKey(word),
    pos,
    transliteration,
    level: null,
    core_rank: null,
    senses: glosses.map((english) => ({ english, count: 1 })),
    source: "dictionary",
    uses: 0,
  };

  // Many lemma entries also list their own inflected forms.
  const forms: FormRow[] = [];
  if (Array.isArray(raw.forms)) {
    for (const f of raw.forms as { form?: unknown; tags?: unknown }[]) {
      if (typeof f.form !== "string" || strings(f.tags).includes("romanization")) continue;
      const form = f.form.trim();
      if (!form || form === word || (language === "es" && /\s/.test(form))) continue;
      forms.push({ language, form_key: lexiconKey(form), lemma_key: lemma.lemma_key, pos, morph: strings(f.tags).join(" "), uses: 0 });
    }
  }
  return { lemma, forms };
}
