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

// Short examples (vocab example fragments, idiom phrases) stay short. Full paragraphs are stored
// since the transient-source hard rule was dropped (Nov 2026), see docs/tickets/006.
export const MAX_FRAGMENT_CHARS = 140;
const fragment = z.string().min(1).max(MAX_FRAGMENT_CHARS);

const vocabSchema = z.object({
  lemma: z.string().min(1),
  surface_form: z.string().min(1),
  part_of_speech: z.string().min(1),
  english: z.string().min(1),
  example_fragment: fragment,
  level: z.enum(LEVELS),
});

const idiomSchema = z.object({
  phrase: z.string().min(1).max(MAX_FRAGMENT_CHARS),
  literal_meaning: z.string().min(1),
  actual_meaning: z.string().min(1),
  region_tags: z.array(z.string()).default([]),
  register: z.string().min(1),
});

export const REFLEXIVE_KINDS = ["reflexive", "meaning_change", "reciprocal", "accidental", "impersonal"] as const;
export type ReflexiveKind = (typeof REFLEXIVE_KINDS)[number];

const reflexiveSchema = z.object({
  infinitive_reflexive: z.string().min(1),
  english: z.string().min(1),
  kind: z.enum(REFLEXIVE_KINDS),
  explanation: z.string().min(1),
});

const verbSchema = z.object({
  infinitive: z.string().min(1),
  english: z.string().min(1),
  form_in_source: z.string().min(1),
  form_english: z.string().min(1),
  tense: z.string().min(1),
  mood: z.string().min(1),
  person: z.string().min(1),
  conjugation_table: z.record(z.string(), z.string()),
  irregular: z.boolean(),
  // null when the verb is not used with se in the source.
  reflexive: reflexiveSchema.nullable(),
});

const quizSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  type: z.enum(["vocab", "idiom", "verb", "listening"]),
});

export type Vocab = z.infer<typeof vocabSchema>;
export type Idiom = z.infer<typeof idiomSchema>;
export type Verb = z.infer<typeof verbSchema>;

const keyPhraseSchema = z.object({
  spanish: z.string().min(1).max(300),
  english: z.string().min(1).max(300),
});

// What the model returns for one paragraph. The Spanish text is not here: code attaches the source paragraph.
const paragraphResultSchema = z.object({
  n: z.number().int().positive(),
  english: z.string().min(1).max(8000),
  key_phrase: keyPhraseSchema,
  verbs: z.array(verbSchema).max(6),
  vocab: z.array(vocabSchema).max(12),
  idioms: z.array(idiomSchema).max(6),
});

export const batchResultSchema = z.object({
  gist: z.string().min(1),
  paragraphs: z.array(paragraphResultSchema),
  grammar_notes: z.array(z.string()).default([]),
});

export type BatchResult = z.infer<typeof batchResultSchema>;

const lessonParagraphSchema = paragraphResultSchema.omit({ n: true }).extend({
  spanish: z.string().min(1).max(4000),
});

export type LessonParagraph = z.infer<typeof lessonParagraphSchema>;

export const enrichmentSchema = z.object({
  summary: z.string().min(1),
  paragraphs: z.array(lessonParagraphSchema),
  grammar_notes: z.array(z.string()).default([]),
  quiz: z.array(quizSchema).default([]),
});

export type Enrichment = z.infer<typeof enrichmentSchema>;

export type ParseResult<T = Enrichment> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function stripFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : trimmed;
}

/** The JSON object in the text, even if the model added a sentence before or after it. */
function extractJson(text: string): string {
  const t = stripFence(text);
  if (t.startsWith("{")) return t;
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

/** Why the output was not JSON, with enough of it shown to diagnose without logs. */
function describeBadOutput(raw: string): string {
  const t = stripFence(raw).replace(/\s+/g, " ").trim();
  const cutOff = t.includes("{") && !t.endsWith("}");
  const head = t.slice(0, 80);
  const tail = t.length > 200 ? t.slice(-80) : "";
  const shown = tail ? `starts "${head}", ends "${tail}"` : `starts "${head}"`;
  return `Output was not valid JSON${cutOff ? ". It looks cut off before the end" : ""} (${t.length} characters, ${shown}).`;
}

/** Parse and validate raw model output against any schema. Never throws. */
export function parseWith<T>(schema: z.ZodType<T>, raw: string): ParseResult<T> {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    return { ok: false, error: describeBadOutput(raw) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Schema validation failed: ${issues}` };
  }
  return { ok: true, data: result.data };
}

/** Parse and validate a Spanish enrichment. Never throws. */
export function parseEnrichment(raw: string): ParseResult {
  return parseWith(enrichmentSchema, raw);
}

/** The paragraph numbers a batch answer returned must be exactly the ones sent, each once. Returns the problem, or null. */
export function coverageError(got: number[], expected: number[]): string | null {
  const want = [...expected].sort((a, b) => a - b);
  const sorted = [...got].sort((a, b) => a - b);
  if (new Set(got).size !== got.length) {
    return `Paragraph numbers repeat. Return each of ${want.join(", ")} exactly once.`;
  }
  if (sorted.length !== want.length || sorted.some((n, i) => n !== want[i])) {
    return `Wrong paragraphs. Expected exactly ${want.join(", ")}, got ${sorted.join(", ") || "none"}.`;
  }
  return null;
}

/** Parse one batch response. It must cover exactly the paragraph numbers that were sent, each once. */
export function parseBatch(raw: string, expected: number[]): ParseResult<BatchResult> {
  const result = parseWith(batchResultSchema, raw);
  if (!result.ok) return result;
  const problem = coverageError(
    result.data.paragraphs.map((p) => p.n),
    expected,
  );
  return problem ? { ok: false, error: problem } : result;
}

const MAX_GRAMMAR_NOTES = 6;

/** Put the batches back together. The Spanish for each paragraph is the source text, never model output. */
export function mergeBatches(paragraphs: string[], batches: BatchResult[]): Enrichment {
  const byNumber = new Map<number, BatchResult["paragraphs"][number]>();
  for (const batch of batches) for (const p of batch.paragraphs) byNumber.set(p.n, p);

  const merged = paragraphs.map((spanish, i) => {
    const result = byNumber.get(i + 1);
    if (!result) throw new Error(`Paragraph ${i + 1} is missing from the model output.`);
    const { n: _n, ...rest } = result;
    void _n;
    return { spanish, ...rest };
  });

  return { ...joinBatchNotes(batches), paragraphs: merged, quiz: [] };
}

/** The lesson summary (the batch gists joined) and the grammar notes (deduped, capped). Shared by both languages. */
export function joinBatchNotes(batches: { gist: string; grammar_notes: string[] }[]): {
  summary: string;
  grammar_notes: string[];
} {
  const notes: string[] = [];
  for (const batch of batches) {
    for (const note of batch.grammar_notes) if (!notes.includes(note)) notes.push(note);
  }
  return { summary: batches.map((b) => b.gist.trim()).join(" "), grammar_notes: notes.slice(0, MAX_GRAMMAR_NOTES) };
}
