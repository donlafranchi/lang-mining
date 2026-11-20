import type { FarsiRow } from "./enrichment/farsi-rows";
import type { WordRow } from "./enrichment/rows";

export type Question = {
  prompt: string;
  lemma: string;
  pos: string;
  answers: string[];
  /** Latin spelling, for Farsi. */ translit?: string;
};

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

/** Strip a plural, -ing or -ed ending so "houses", "running" and "walked" meet "house", "run" and "walk". */
function stem(word: string): string {
  return word
    .split(" ")
    .map((w) =>
      w.length > 4
        ? w.replace(/(ing|ed|es|s)$/, "").replace(/e$/, "").replace(/(.)\1$/, "$1")
        : w,
    )
    .join(" ");
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length)
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] &&
        a[i + 1] === b[i] &&
        a.slice(i + 2) === b.slice(i + 2))
    );
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  return long.slice(i + 1) === short.slice(i);
}

/**
 * "exact": matches a stored meaning once case, "to", articles and punctuation are ignored.
 * "close": same word with a different ending (houses/house, running/run) or one typo in a long word (6+ letters), since in short words one letter makes a different word (horse/house).
 * "wrong": anything else. Two short words one letter apart (dog/dot) are different words, so they stay wrong.
 */
export function checkAnswer(
  typed: string,
  answers: string[],
): "exact" | "close" | "wrong" {
  const t = normalizeAnswer(typed);
  if (t.length === 0) return "wrong";
  if (answers.includes(t)) return "exact";
  const st = stem(t);
  for (const a of answers) {
    if (stem(a) === st) return "close";
    if (Math.min(t.length, a.length) >= 6 && withinOneEdit(t, a)) return "close";
  }
  return "wrong";
}

/** Right (exactly or closely) for the purposes of scoring. */
export function isCorrect(typed: string, answers: string[]): boolean {
  return checkAnswer(typed, answers) !== "wrong";
}

/** Up to `count` questions from one paragraph's word rows, core-2000 words first, then the rest in order of appearance. */
export function pickQuestions(
  rows: WordRow[],
  coreRanks: Record<string, number>,
  count = 5,
): Question[] {
  const all: { q: Question; rank: number }[] = [];
  for (const r of rows) {
    if (r.kind === "word") {
      const v = r.vocab;
      all.push({
        q: {
          prompt: v.surface_form,
          lemma: v.lemma,
          pos: v.part_of_speech,
          answers: answerVariants(v.english, ...(v.senses ?? [])),
        },
        rank: coreRanks[v.lemma] ?? Number.MAX_SAFE_INTEGER,
      });
    } else {
      const v = r.verb;
      all.push({
        q: {
          prompt: v.form_in_source,
          lemma: v.infinitive,
          pos: "verb",
          answers: answerVariants(
            v.form_english,
            v.english,
            ...(r.senses ?? []),
          ),
        },
        rank: coreRanks[v.infinitive] ?? Number.MAX_SAFE_INTEGER,
      });
    }
  }
  const usable = all.filter((x) => x.q.answers.length > 0);
  const core = usable.filter((x) => x.rank !== Number.MAX_SAFE_INTEGER);
  const rest = usable.filter((x) => x.rank === Number.MAX_SAFE_INTEGER);
  return [...core, ...rest].slice(0, count).map((x) => x.q);
}

/** The same quiz for a Farsi paragraph: the Persian word is the prompt, with how to say it. */
export function pickFarsiQuestions(
  rows: FarsiRow[],
  coreRanks: Record<string, number>,
  count = 5,
): Question[] {
  const all: { q: Question; rank: number }[] = rows.map((r) => {
    if (r.kind === "word") {
      const w = r.word;
      return {
        q: {
          prompt: w.surface,
          lemma: w.lemma,
          pos: w.part_of_speech,
          translit: w.transliteration,
          answers: answerVariants(w.english, ...(w.senses ?? [])),
        },
        rank: coreRanks[w.lemma] ?? Number.MAX_SAFE_INTEGER,
      };
    }
    const v = r.verb;
    return {
      q: {
        prompt: v.form_in_source,
        lemma: v.infinitive,
        pos: "verb",
        translit: v.form_transliteration,
        answers: answerVariants(v.form_english, v.english, ...(r.senses ?? [])),
      },
      rank: coreRanks[v.infinitive] ?? Number.MAX_SAFE_INTEGER,
    };
  });
  const usable = all.filter((x) => x.q.answers.length > 0);
  const core = usable.filter((x) => x.rank !== Number.MAX_SAFE_INTEGER);
  const rest = usable.filter((x) => x.rank === Number.MAX_SAFE_INTEGER);
  return [...core, ...rest].slice(0, count).map((x) => x.q);
}
