import { z } from "zod";
import {
  coverageError,
  joinBatchNotes,
  LEVELS,
  MAX_FRAGMENT_CHARS,
  parseWith,
  patternUseSchema,
  type ParseResult,
} from "./schema";

export const REGISTERS = ["formal", "neutral", "colloquial"] as const;

// One entry per word the lesson glosses. No example sentence: the word is in the paragraph shown right above it.
const wordSchema = z.object({
  lemma: z.string().min(1),
  // The form as written in the paragraph (plural, attached pronoun, conjugated), when it differs from the lemma.
  surface: z.string().min(1),
  transliteration: z.string().min(1),
  part_of_speech: z.string().min(1),
  english: z.string().min(1),
  level: z.enum(LEVELS),
  register: z.enum(REGISTERS),
  // Every common meaning from our lexicon. The learner works out which fits from the context.
  senses: z.array(z.string()).max(8).optional(),
});

export type FarsiWord = z.infer<typeof wordSchema>;

const idiomSchema = z.object({
  phrase: z.string().min(1).max(MAX_FRAGMENT_CHARS),
  transliteration: z.string().min(1),
  literal_meaning: z.string().min(1),
  actual_meaning: z.string().min(1),
  register: z.enum(REGISTERS),
});

export type FarsiIdiom = z.infer<typeof idiomSchema>;

// Models sometimes return the pieces as a list. Accept either and store one string, so the lesson never fails over it.
const partsSchema = z
  .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
  .transform((v) => (Array.isArray(v) ? v.join(" + ") : v));

const compoundSchema = z.object({
  parts: partsSchema,
  explanation: z.string().min(1),
});

const verbSchema = z.object({
  infinitive: z.string().min(1),
  transliteration: z.string().min(1),
  english: z.string().min(1),
  form_in_source: z.string().min(1),
  form_transliteration: z.string().min(1),
  form_english: z.string().min(1),
  tense: z.string().min(1),
  mood: z.string().min(1),
  person: z.string().min(1),
  conjugation_table: z.record(z.string(), z.string()),
  irregular: z.boolean(),
  // null unless the verb is a noun or adjective plus a light verb, like kar kardan.
  compound: compoundSchema.nullable(),
});

export type FarsiVerb = z.infer<typeof verbSchema>;

const quizSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  type: z.enum(["vocab", "idiom", "verb", "listening"]),
});

const keyPhraseSchema = z.object({
  persian: z.string().min(1).max(300),
  transliteration: z.string().min(1).max(300),
  english: z.string().min(1).max(300),
});

// What the model returns for one paragraph. The Persian text is not here: code attaches the source paragraph.
const paragraphResultSchema = z.object({
  n: z.number().int().positive(),
  transliteration: z.string().min(1).max(8000),
  english: z.string().min(1).max(8000),
  key_phrase: keyPhraseSchema,
  words: z.array(wordSchema).max(80),
  verbs: z.array(verbSchema).max(10),
  idioms: z.array(idiomSchema).max(6),
  // Older lessons were built without patterns, so they read as none.
  patterns: z.array(patternUseSchema).max(8).default([]),
});

export const farsiBatchResultSchema = z.object({
  gist: z.string().min(1),
  title: z.string().max(200).optional(),
  paragraphs: z.array(paragraphResultSchema),
  grammar_notes: z.array(z.string()).default([]),
});

export type FarsiBatchResult = z.infer<typeof farsiBatchResultSchema>;

const lessonParagraphSchema = paragraphResultSchema.omit({ n: true }).extend({
  persian: z.string().min(1).max(4000),
});

export const farsiEnrichmentSchema = z.object({
  summary: z.string().min(1),
  title: z.string().max(200).optional(),
  paragraphs: z.array(lessonParagraphSchema),
  grammar_notes: z.array(z.string()).default([]),
  quiz: z.array(quizSchema).default([]),
});

export type FarsiEnrichment = z.infer<typeof farsiEnrichmentSchema>;

/** Parse one Farsi batch response. It must cover exactly the paragraph numbers that were sent, each once. */
export function parseFarsiBatch(raw: string, expected: number[]): ParseResult<FarsiBatchResult> {
  const result = parseWith(farsiBatchResultSchema, raw);
  if (!result.ok) return result;
  const problem = coverageError(
    result.data.paragraphs.map((p) => p.n),
    expected,
  );
  return problem ? { ok: false, error: problem } : result;
}

/** Put the batches back together. The Persian for each paragraph is the source text, never model output. */
export function mergeFarsiBatches(paragraphs: string[], batches: FarsiBatchResult[]): FarsiEnrichment {
  const byNumber = new Map<number, FarsiBatchResult["paragraphs"][number]>();
  for (const batch of batches) for (const p of batch.paragraphs) byNumber.set(p.n, p);

  const merged = paragraphs.map((persian, i) => {
    const result = byNumber.get(i + 1);
    if (!result) throw new Error(`Paragraph ${i + 1} is missing from the model output.`);
    const { n: _n, ...rest } = result;
    void _n;
    return { persian, ...rest };
  });

  return { ...joinBatchNotes(batches), paragraphs: merged, quiz: [] };
}

/** Validate a stored Farsi lesson. */
export function parseFarsiEnrichment(raw: string): ParseResult<FarsiEnrichment> {
  return parseWith(farsiEnrichmentSchema, raw);
}
