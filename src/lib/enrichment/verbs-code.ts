// Verb entries built in code: the dictionary form and meaning come from our own lexicon, the table from the analysis
// service's conjugator, and the label from the grammar features. The model is only asked about verbs this leaves out.

import type { AnalyzedToken, Conjugation, VerbQuery } from "../analysis/contract";
import { lexiconKey } from "../lexicon/model";
import type { KnownWord } from "../lexicon/lookup";
import type { Verb } from "./schema";

export type CodeVerbQuery = VerbQuery & { paragraph: number; form: string };

const CLITICS = new Set(["me", "te", "se", "nos", "os"]);

function feats(morph: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of morph.split(/[\s|]+/)) {
    const [k, v] = part.split("=");
    if (k && v) m.set(k, v);
  }
  return m;
}

/**
 * The verb forms the code can explain: finite forms, participles and gerunds of verbs the lexicon knows. The auxiliary
 * "haber" is left to the participle it helps. Verbs used with se, me, te, nos or os are left to the model, which
 * explains the reflexive side. At most `cap` forms per paragraph, each form once.
 */
export function codeVerbQueries(paragraphs: AnalyzedToken[][], known: Map<string, KnownWord>, cap: number): CodeVerbQuery[] {
  const out: CodeVerbQuery[] = [];
  paragraphs.forEach((tokens, p) => {
    const seen = new Set<string>();
    let count = 0;
    const words = tokens.filter((t) => t.is_word);
    words.forEach((t, i) => {
      if (count >= cap) return;
      if (t.pos !== "verb" && t.pos !== "aux") return;
      const f = feats(t.morph);
      const form = f.get("VerbForm");
      if (form !== "Fin" && form !== "Part" && form !== "Ger") return;
      const lemma = t.lemma.toLowerCase();
      if (!lemma || lemma === "haber") return;
      if (known.get(lexiconKey(t.text))?.pos !== "verb") return;
      const prev = words[i - 1]?.text.toLowerCase();
      if (prev && CLITICS.has(prev)) return;
      const key = `${lemma}|${t.text.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      count += 1;
      out.push({ lemma, morph: t.morph, paragraph: p, form: t.text });
    });
  });
  return out;
}

const PERSONS: Record<string, string> = {
  "1Sing": "yo",
  "2Sing": "tú",
  "3Sing": "él/ella/usted",
  "1Plur": "nosotros",
  "2Plur": "vosotros",
  "3Plur": "ellos/ellas/ustedes",
};

const INDICATIVE_TENSES: Record<string, string> = { Pres: "present", Past: "preterite", Imp: "imperfect", Fut: "future", Pqp: "pluperfect" };

/** Tense and mood in plain English, from the grammar features. */
function labels(morph: string): { tense: string; mood: string } {
  const f = feats(morph);
  const form = f.get("VerbForm");
  if (form === "Part") return { tense: "past participle", mood: "non-finite (table shows the present)" };
  if (form === "Ger") return { tense: "gerund", mood: "non-finite (table shows the present)" };
  const mood = f.get("Mood");
  if (mood === "Cnd") return { tense: "conditional", mood: "conditional" };
  if (mood === "Imp") return { tense: "command", mood: "imperative" };
  if (mood === "Sub") return { tense: f.get("Tense") === "Imp" ? "imperfect" : "present", mood: "subjunctive" };
  return { tense: INDICATIVE_TENSES[f.get("Tense") ?? ""] ?? "present", mood: "indicative" };
}

/** Verb entries for the queries the service could conjugate, in query order. */
export function buildCodeVerbs(queries: CodeVerbQuery[], conjugations: (Conjugation | null)[], known: Map<string, KnownWord>): Verb[] {
  return pairs(queries, conjugations, known).map((x) => x.verb);
}

function pairs(queries: CodeVerbQuery[], conjugations: (Conjugation | null)[], known: Map<string, KnownWord>): { paragraph: number; verb: Verb }[] {
  const out: { paragraph: number; verb: Verb }[] = [];
  queries.forEach((q, i) => {
    const c = conjugations[i];
    const k = known.get(lexiconKey(q.form));
    if (!c || !k || Object.keys(c.table).length === 0) return;
    const f = feats(q.morph);
    const { tense, mood } = labels(q.morph);
    const english = k.senses[0];
    const label = mood === "indicative" || mood === "subjunctive" ? `${tense} ${mood}` : tense;
    out.push({
      paragraph: q.paragraph,
      verb: {
        infinitive: q.lemma,
        english,
        form_in_source: q.form,
        form_english: `${label} of ${q.lemma} (${english})`,
        tense,
        mood,
        person: PERSONS[`${f.get("Person") ?? ""}${f.get("Number") ?? ""}`] ?? "no person",
        conjugation_table: c.table,
        irregular: c.irregular,
        reflexive: null,
      },
    });
  });
  return out;
}

/** The code-built verbs for each of `count` paragraphs. */
export function codeVerbsByParagraph(count: number, queries: CodeVerbQuery[], conjugations: (Conjugation | null)[], known: Map<string, KnownWord>): Verb[][] {
  const out: Verb[][] = Array.from({ length: count }, () => []);
  for (const x of pairs(queries, conjugations, known)) out[x.paragraph].push(x.verb);
  return out;
}
