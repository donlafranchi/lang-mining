import type { WordRow } from "./enrichment/rows";

export type Question = { prompt: string; lemma: string; pos: string; answers: string[] };

/** Split an English gloss like "to have; to own (a thing)" into the short answers a learner might type. */
export function answerVariants(...glosses: (string | undefined)[]): string[] {
  const out = new Set<string>();
  for (const g of glosses) {
    if (!g) continue;
    for (const part of g.split(/[;,/]|\bor\b/)) {
      const n = normalizeAnswer(part);
      if (n) out.add(n);
    }
  }
  return [...out];
}

/** Lowercase, drop brackets, punctuation, a leading "to", "the", "a" or "an", and extra spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(to|the|a|an) /, "")
    .trim();
}

/** Right when the typed English matches any known meaning, ignoring case, "to", articles and punctuation. */
export function isCorrect(typed: string, answers: string[]): boolean {
  const t = normalizeAnswer(typed);
  return t.length > 0 && answers.includes(t);
}

/** Up to `count` questions from one paragraph's word rows, core-2000 words first, then the rest in order of appearance. */
export function pickQuestions(rows: WordRow[], coreRanks: Record<string, number>, count = 5): Question[] {
  const all: { q: Question; rank: number }[] = [];
  for (const r of rows) {
    if (r.kind === "word") {
      const v = r.vocab;
      all.push({
        q: { prompt: v.surface_form, lemma: v.lemma, pos: v.part_of_speech, answers: answerVariants(v.english, ...(v.senses ?? [])) },
        rank: coreRanks[v.lemma] ?? Number.MAX_SAFE_INTEGER,
      });
    } else {
      const v = r.verb;
      all.push({
        q: { prompt: v.form_in_source, lemma: v.infinitive, pos: "verb", answers: answerVariants(v.form_english, v.english, ...(r.senses ?? [])) },
        rank: coreRanks[v.infinitive] ?? Number.MAX_SAFE_INTEGER,
      });
    }
  }
  const usable = all.filter((x) => x.q.answers.length > 0);
  const core = usable.filter((x) => x.rank !== Number.MAX_SAFE_INTEGER);
  const rest = usable.filter((x) => x.rank === Number.MAX_SAFE_INTEGER);
  return [...core, ...rest].slice(0, count).map((x) => x.q);
}
