import { batchLimits, defaultHelp, type HelpLevel } from "../help";
import { DEFAULT_LANGUAGE, type Language } from "../languages";
import { mergeFarsiBatches, parseFarsiBatch, type FarsiEnrichment } from "./farsi-schema";
import { batchParagraphs, splitParagraphs, MAX_ARTICLE_CHARS, type NumberedParagraph } from "./paragraphs";
import { buildBatchUserPrompt, buildSystemPrompt } from "./prompt";
import type { Analyzer, ParagraphAnalysis } from "../analysis/contract";
import { detectSpanishPatterns } from "../pattern-rules/detect-es";
import type { PatternUse } from "../patterns";
import { harvestAnalysis } from "../lexicon/harvest";
import { lexiconKey, normalizePos } from "../lexicon/model";
import { knownToFarsiWord, knownToVocab, lookupTokens, orderByAppearance, splitKnown, type KnownWord, type LemmaHint } from "../lexicon/lookup";
import type { LexiconStore } from "../lexicon/store";
import { tokens } from "../highlight";
import { mergeBatches, parseBatch, type Enrichment, type ParseResult } from "./schema";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** One model call. Swappable so tests and future engines share the same contract. */
export type CompleteFn = (args: {
  system: string;
  messages: ChatMessage[];
}) => Promise<string>;

/** The model hit its output limit mid-answer, so the JSON is incomplete. Thrown by a CompleteFn. */
export class OutputTruncatedError extends Error {
  constructor() {
    super("The model's answer was cut off at the output limit.");
    this.name = "OutputTruncatedError";
  }
}

export class EnrichmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnrichmentError";
  }
}

// Cap what we send so a huge page cannot run up a bill. Roughly 12k words.
export const MAX_INPUT_CHARS = MAX_ARTICLE_CHARS;

// How many batches run at once. Keeps long articles inside the time limit without flooding the API.
export const BATCH_CONCURRENCY = 3;

export type Lesson = Enrichment | FarsiEnrichment;

const SHORTER_NOTE =
  "\n\nNote: a previous attempt at this was cut off because the answer was too long. Keep every list shorter and every text brief, and return complete JSON.";

/** One model call, validated, with a single retry that feeds the problem back. */
async function completeValidated<T>(args: {
  system: string;
  messages: ChatMessage[];
  complete: CompleteFn;
  parse: (raw: string) => ParseResult<T>;
}): Promise<T> {
  let first: string;
  try {
    first = await args.complete({ system: args.system, messages: args.messages });
  } catch (err) {
    if (!(err instanceof OutputTruncatedError)) throw err;
    return retryShorter(args);
  }
  const firstResult = args.parse(first);
  if (firstResult.ok) return firstResult.data;

  const retryMessages: ChatMessage[] = [
    ...args.messages,
    { role: "assistant", content: first },
    {
      role: "user",
      content: `That response failed validation: ${firstResult.error} Return the corrected JSON only.`,
    },
  ];
  let second: string;
  try {
    second = await args.complete({ system: args.system, messages: retryMessages });
  } catch (err) {
    if (err instanceof OutputTruncatedError) throw new EnrichmentError(TOO_LONG);
    throw err;
  }
  const secondResult = args.parse(second);
  if (secondResult.ok) return secondResult.data;

  throw new EnrichmentError(`Enrichment failed after one retry. ${secondResult.error}`);
}

const TOO_LONG = "Enrichment failed: the answer was too long and was cut off twice. Try a shorter text.";

/** The first answer was cut off, so there is nothing to feed back. Ask again for a shorter one. */
async function retryShorter<T>(args: {
  system: string;
  messages: ChatMessage[];
  complete: CompleteFn;
  parse: (raw: string) => ParseResult<T>;
}): Promise<T> {
  const last = args.messages[args.messages.length - 1];
  const messages: ChatMessage[] = [...args.messages.slice(0, -1), { ...last, content: last.content + SHORTER_NOTE }];
  let raw: string;
  try {
    raw = await args.complete({ system: args.system, messages });
  } catch (err) {
    if (err instanceof OutputTruncatedError) throw new EnrichmentError(TOO_LONG);
    throw err;
  }
  const result = args.parse(raw);
  if (result.ok) return result.data;
  throw new EnrichmentError(`Enrichment failed after one retry. ${result.error}`);
}

/** Run async jobs with at most `limit` in flight. Results keep the input order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Split the source into paragraphs in code, mine them in batches a few at a time, and put the results back
 * together. The target-language text in the lesson is the source itself, never model output.
 */
async function enrichInBatches<R, L>(args: {
  text: string;
  language: Language;
  help: HelpLevel;
  complete: CompleteFn;
  parse: (raw: string, expected: number[]) => ParseResult<R>;
  merge: (paragraphs: string[], results: R[]) => L;
  lexicon?: LexiconStore;
  analyzer?: Analyzer | null;
  /** Adds the words the lexicon explained, and patterns found by rules, to the merged lesson. */
  inject?: (
    lesson: L,
    explained: Map<number, { token: string; word: KnownWord }[]>,
    paragraphs: string[],
    patterns: PatternUse[][] | null,
  ) => L;
  /** Finds grammar patterns from the analysis, so the model need not. */
  detectPatterns?: (analysis: ParagraphAnalysis, text: string) => PatternUse[];
}): Promise<L> {
  const paragraphs = splitParagraphs(args.text);
  if (paragraphs.length === 0) throw new EnrichmentError("Input text is empty.");

  // Language analysis, when the service is set up. If it is down the lesson is built without it.
  let analyses: ParagraphAnalysis[] | null = null;
  if (args.analyzer) {
    try {
      analyses = await args.analyzer.analyze(args.language, paragraphs);
    } catch (err) {
      console.error("analysis skipped", err instanceof Error ? err.message : err);
    }
  }

  // Words our own lexicon already knows are explained from it, and the model is told to leave them out.
  const skips = new Map<number, string[]>();
  const explained = new Map<number, { token: string; word: KnownWord }[]>();
  if (args.lexicon) {
    const hints = new Map<string, LemmaHint>();
    if (analyses) {
      for (const a of analyses) for (const t of a.tokens) if (t.is_word && t.lemma) hints.set(lexiconKey(t.text), { lemma: t.lemma, pos: normalizePos(t.pos) });
      await harvestAnalysis(args.lexicon, args.language, analyses).catch((e) => console.error("analysis harvest skipped", e instanceof Error ? e.message : e));
    }
    const known = await lookupTokens(args.lexicon, args.language, paragraphs.flatMap((p) => tokens(p)), hints);
    paragraphs.forEach((text, i) => {
      const split = splitKnown(text, known, args.help);
      skips.set(i + 1, split.skip);
      explained.set(i + 1, split.explain);
    });
  }

  // Patterns found by rules replace the model's, so it is not asked for them.
  const patternsByCode = analyses && args.detectPatterns ? analyses.map((a, i) => args.detectPatterns!(a, paragraphs[i])) : null;
  const system = buildSystemPrompt(args.language, args.help, { patterns: !patternsByCode });
  const batches = batchParagraphs(paragraphs, batchLimits(args.language, args.help));
  const results = await mapLimit(batches, BATCH_CONCURRENCY, (batch: NumberedParagraph[]) =>
    completeValidated({
      system,
      messages: [{ role: "user", content: buildBatchUserPrompt(batch, skips) }],
      complete: args.complete,
      parse: (raw) =>
        args.parse(
          raw,
          batch.map((p) => p.n),
        ),
    }),
  );
  const lesson = args.merge(paragraphs, results);
  return args.inject ? args.inject(lesson, explained, paragraphs, patternsByCode) : lesson;
}

export async function enrichText(args: {
  text: string;
  language?: Language;
  /** How many words the lesson glosses. Defaults to light for Spanish and full for Farsi. */
  help?: HelpLevel;
  complete: CompleteFn;
  /** Our own word list. Words it knows are explained from it, and the model only handles the rest. */
  lexicon?: LexiconStore;
  /** Language analysis (dictionary forms), when the analysis service is set up. */
  analyzer?: Analyzer | null;
}): Promise<Lesson> {
  const text = args.text.trim();
  if (!text) throw new EnrichmentError("Input text is empty.");

  const language = args.language ?? DEFAULT_LANGUAGE;
  const help = args.help ?? defaultHelp(language);

  const lexicon = args.lexicon;
  const analyzer = args.analyzer;
  if (language === "fa") {
    return enrichInBatches({
      text,
      language,
      help,
      complete: args.complete,
      parse: parseFarsiBatch,
      merge: mergeFarsiBatches,
      lexicon,
      analyzer,
      inject: (lesson, explained, paragraphs) => ({
        ...lesson,
        paragraphs: lesson.paragraphs.map((p, i) => ({
          ...p,
          words: orderByAppearance(
            paragraphs[i],
            [...(explained.get(i + 1) ?? []).map((x) => knownToFarsiWord(x.token, x.word)), ...p.words],
            (w) => w.surface,
          ),
        })),
      }),
    });
  }
  return enrichInBatches({
    text,
    language,
    help,
    complete: args.complete,
    parse: parseBatch,
    merge: mergeBatches,
    lexicon,
    analyzer,
    detectPatterns: (analysis, text) => detectSpanishPatterns(analysis.tokens, text),
    inject: (lesson, explained, paragraphs, patterns) => ({
      ...lesson,
      paragraphs: lesson.paragraphs.map((p, i) => ({
        ...p,
        ...(patterns ? { patterns: patterns[i] } : {}),
        vocab: orderByAppearance(
          paragraphs[i],
          [...(explained.get(i + 1) ?? []).map((x) => knownToVocab(x.token, x.word)), ...p.vocab],
          (v) => v.surface_form,
        ),
      })),
    }),
  });
}
