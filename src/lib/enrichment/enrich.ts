import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { DEFAULT_LANGUAGE, type Language } from "../languages";
import { parseFarsiEnrichment, type FarsiEnrichment } from "./farsi-schema";
import { parseEnrichment, type Enrichment, type ParseResult } from "./schema";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** One model call. Swappable so tests and future engines share the same contract. */
export type CompleteFn = (args: {
  system: string;
  messages: ChatMessage[];
}) => Promise<string>;

export class EnrichmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnrichmentError";
  }
}

// Cap what we send so a huge page cannot run up a bill. Roughly 12k words.
export const MAX_INPUT_CHARS = 60_000;

export type Lesson = Enrichment | FarsiEnrichment;

function parserFor(language: Language): (raw: string) => ParseResult<Lesson> {
  return language === "fa" ? parseFarsiEnrichment : parseEnrichment;
}

export async function enrichText(args: {
  text: string;
  language?: Language;
  complete: CompleteFn;
}): Promise<Lesson> {
  const language = args.language ?? DEFAULT_LANGUAGE;
  const parse = parserFor(language);
  const text = args.text.trim();
  if (!text) throw new EnrichmentError("Input text is empty.");

  const system = buildSystemPrompt(language);
  const messages: ChatMessage[] = [
    { role: "user", content: buildUserPrompt(text.slice(0, MAX_INPUT_CHARS)) },
  ];

  const first = await args.complete({ system, messages });
  const firstResult = parse(first);
  if (firstResult.ok) return firstResult.data;

  // One retry, feeding the validation error back so the model can fix it.
  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: "assistant", content: first },
    {
      role: "user",
      content: `That response failed validation: ${firstResult.error} Return the corrected JSON only.`,
    },
  ];
  const second = await args.complete({ system, messages: retryMessages });
  const secondResult = parse(second);
  if (secondResult.ok) return secondResult.data;

  throw new EnrichmentError(
    `Enrichment failed after one retry. ${secondResult.error}`,
  );
}
