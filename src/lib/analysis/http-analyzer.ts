import type { Language } from "../languages";
import { analysisResponseSchema, conjugateResponseSchema, type Analyzer, type Conjugation, type ParagraphAnalysis, type VerbQuery } from "./contract";

const TIMEOUT_MS = 20_000;

/** Calls the analysis service over HTTP. */
export function httpAnalyzer(baseUrl: string, key: string, fetchImpl: typeof fetch = fetch): Analyzer {
  const url = `${baseUrl.replace(/\/+$/, "")}/analyze`;
  const post = (path: string, body: unknown) =>
    fetchImpl(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-analysis-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  return {
    async conjugate(language: Language, verbs: VerbQuery[]): Promise<(Conjugation | null)[]> {
      if (verbs.length === 0) return [];
      const res = await post("/conjugate", { language, verbs });
      if (!res.ok) throw new Error(`The analysis service answered ${res.status}.`);
      const parsed = conjugateResponseSchema.safeParse(await res.json());
      if (!parsed.success || parsed.data.verbs.length !== verbs.length) throw new Error("The analysis service sent something unexpected.");
      return parsed.data.verbs;
    },
    async analyze(language: Language, paragraphs: string[]): Promise<ParagraphAnalysis[]> {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-analysis-key": key },
        body: JSON.stringify({ language, paragraphs }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`The analysis service answered ${res.status}.`);
      const parsed = analysisResponseSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("The analysis service sent something unexpected.");
      if (parsed.data.paragraphs.length !== paragraphs.length) throw new Error("The analysis service skipped paragraphs.");
      return parsed.data.paragraphs;
    },
  };
}

/** The analyzer named by ANALYSIS_URL and ANALYSIS_KEY, or null when they are not set (the app then works without it). */
export function analyzerFromEnv(env: Record<string, string | undefined> = process.env): Analyzer | null {
  const url = env.ANALYSIS_URL?.trim();
  const key = env.ANALYSIS_KEY?.trim();
  return url && key ? httpAnalyzer(url, key) : null;
}
