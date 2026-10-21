import { z } from "zod";

export const DIALECTS = [
  "puerto_rican",
  "mexican",
  "caribbean_general",
  "rioplatense",
  "castilian",
  "neutral_latin_american",
] as const;

export type Dialect = (typeof DIALECTS)[number];

export const DIALECT_LABELS: Record<Dialect, string> = {
  puerto_rican: "Puerto Rican",
  mexican: "Mexican",
  caribbean_general: "Caribbean (general)",
  rioplatense: "Rioplatense",
  castilian: "Castilian (Spain)",
  neutral_latin_american: "Neutral Latin American",
};

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// Hard rule from CLAUDE.md: only short fragments are stored, never full lines
// or the whole source. These caps are what enforce it at the schema boundary.
export const MAX_FRAGMENT_CHARS = 140;
const fragment = z.string().min(1).max(MAX_FRAGMENT_CHARS);

const segmentSchema = z.object({
  spanish: fragment,
  english: fragment,
  start_sec: z.number().nullable().default(null),
  end_sec: z.number().nullable().default(null),
});

const vocabSchema = z.object({
  lemma: z.string().min(1),
  surface_form: z.string().min(1),
  part_of_speech: z.string().min(1),
  english: z.string().min(1),
  example_fragment: fragment,
  level: z.enum(LEVELS),
  dialect_tags: z.array(z.string()).default([]),
});

const idiomSchema = z.object({
  phrase: z.string().min(1).max(MAX_FRAGMENT_CHARS),
  literal_meaning: z.string().min(1),
  actual_meaning: z.string().min(1),
  region_tags: z.array(z.string()).default([]),
  register: z.string().min(1),
  similar_in_other_dialects: z.string().default(""),
});

const verbSchema = z.object({
  infinitive: z.string().min(1),
  form_in_source: z.string().min(1),
  tense: z.string().min(1),
  mood: z.string().min(1),
  person: z.string().min(1),
  conjugation_table: z.record(z.string(), z.string()),
  irregular: z.boolean(),
  dialect_note: z.string().default(""),
});

const quizSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  type: z.enum(["vocab", "idiom", "verb", "listening"]),
});

export const enrichmentSchema = z.object({
  summary: z.string().min(1),
  detected_dialect: z.enum(DIALECTS),
  segments: z.array(segmentSchema).default([]),
  vocab: z.array(vocabSchema),
  idioms: z.array(idiomSchema),
  verbs: z.array(verbSchema),
  grammar_notes: z.array(z.string()).default([]),
  quiz: z.array(quizSchema).default([]),
});

export type Enrichment = z.infer<typeof enrichmentSchema>;

export type ParseResult =
  | { ok: true; data: Enrichment }
  | { ok: false; error: string };

function stripFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : trimmed;
}

/** Parse and validate raw model output. Never throws. */
export function parseEnrichment(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(stripFence(raw));
  } catch {
    return { ok: false, error: "Output was not valid JSON." };
  }
  const result = enrichmentSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Schema validation failed: ${issues}` };
  }
  return { ok: true, data: result.data };
}
