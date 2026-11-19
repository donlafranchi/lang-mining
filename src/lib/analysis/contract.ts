import { z } from "zod";
import type { Language } from "../languages";

// The one contract between the app and whatever does language analysis. Today that is the Python service in
// /analysis (spaCy for Spanish, Hazm for Persian). Anything that returns this shape can replace it.

export const analyzedTokenSchema = z.object({
  text: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  /** Dictionary form. */
  lemma: z.string(),
  /** noun, verb, adj, adv, prep, pron, conj, det, num, interj or other. Empty when the engine could not tell. */
  pos: z.string(),
  /** Grammar features, for example "Tense=Past VerbForm=Part". Empty when none. */
  morph: z.string(),
  is_word: z.boolean(),
});
export type AnalyzedToken = z.infer<typeof analyzedTokenSchema>;

export const analysisResponseSchema = z.object({
  paragraphs: z.array(z.object({ tokens: z.array(analyzedTokenSchema) })),
});

export type ParagraphAnalysis = { tokens: AnalyzedToken[] };

export interface Analyzer {
  /** One analysis per paragraph, in order. Throws when the engine cannot be reached. */
  analyze(language: Language, paragraphs: string[]): Promise<ParagraphAnalysis[]>;
}
