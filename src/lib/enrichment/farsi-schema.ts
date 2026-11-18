import { z } from "zod";
import { LEVELS, MAX_FRAGMENT_CHARS, parseWith, type ParseResult } from "./schema";

// Same hard rule as Spanish: only short fragments are stored, never full lines.
const fragment = z.string().min(1).max(MAX_FRAGMENT_CHARS);

export const REGISTERS = ["formal", "neutral", "colloquial"] as const;

const segmentSchema = z.object({
  persian: fragment,
  transliteration: fragment,
  english: fragment,
});

const vocabSchema = z.object({
  lemma: z.string().min(1),
  transliteration: z.string().min(1),
  part_of_speech: z.string().min(1),
  english: z.string().min(1),
  example_fragment: fragment,
  level: z.enum(LEVELS),
  register: z.enum(REGISTERS),
});

const idiomSchema = z.object({
  phrase: z.string().min(1).max(MAX_FRAGMENT_CHARS),
  transliteration: z.string().min(1),
  literal_meaning: z.string().min(1),
  actual_meaning: z.string().min(1),
  register: z.enum(REGISTERS),
});

const compoundSchema = z.object({
  parts: z.string().min(1),
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

const quizSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  type: z.enum(["vocab", "idiom", "verb", "listening"]),
});

export const farsiEnrichmentSchema = z.object({
  summary: z.string().min(1),
  segments: z.array(segmentSchema).default([]),
  vocab: z.array(vocabSchema),
  idioms: z.array(idiomSchema),
  verbs: z.array(verbSchema),
  grammar_notes: z.array(z.string()).default([]),
  quiz: z.array(quizSchema).default([]),
});

export type FarsiEnrichment = z.infer<typeof farsiEnrichmentSchema>;

export function parseFarsiEnrichment(raw: string): ParseResult<FarsiEnrichment> {
  return parseWith(farsiEnrichmentSchema, raw);
}
