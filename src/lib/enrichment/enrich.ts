import { DEFAULT_LANGUAGE, type Language } from "../languages";
import { parseFarsiEnrichment, type FarsiEnrichment } from "./farsi-schema";
import { batchParagraphs, splitParagraphs, MAX_ARTICLE_CHARS, type NumberedParagraph } from "./paragraphs";
import { buildBatchUserPrompt, buildSystemPrompt, buildUserPrompt } from "./prompt";
import { mergeBatches, parseBatch, type BatchResult, type Enrichment, type ParseResult } from "./schema";

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

async function enrichSpanish(text: string, complete: CompleteFn): Promise<Enrichment> {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) throw new EnrichmentError("Input text is empty.");

  const system = buildSystemPrompt("es");
  const batches = batchParagraphs(paragraphs);
  const results: BatchResult[] = await mapLimit(batches, BATCH_CONCURRENCY, (batch: NumberedParagraph[]) =>
    completeValidated({
      system,
      messages: [{ role: "user", content: buildBatchUserPrompt(batch) }],
      complete,
      parse: (raw) =>
        parseBatch(
          raw,
          batch.map((p) => p.n),
        ),
    }),
  );
  return mergeBatches(paragraphs, results);
}

async function enrichFarsi(text: string, complete: CompleteFn): Promise<FarsiEnrichment> {
  return completeValidated({
    system: buildSystemPrompt("fa"),
    messages: [{ role: "user", content: buildUserPrompt(text.slice(0, MAX_INPUT_CHARS)) }],
    complete,
    parse: parseFarsiEnrichment,
  });
}

export async function enrichText(args: {
  text: string;
  language?: Language;
  complete: CompleteFn;
}): Promise<Lesson> {
  const text = args.text.trim();
  if (!text) throw new EnrichmentError("Input text is empty.");

  return (args.language ?? DEFAULT_LANGUAGE) === "fa"
    ? enrichFarsi(text, args.complete)
    : enrichSpanish(text, args.complete);
}
