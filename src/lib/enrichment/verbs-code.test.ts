import { describe, expect, it } from "vitest";
import type { AnalyzedToken, Conjugation } from "../analysis/contract";
import type { KnownWord } from "../lexicon/lookup";
import { codeVerbQueries, buildCodeVerbs } from "./verbs-code";

const tok = (text: string, lemma: string, pos: string, morph: string, start = 0): AnalyzedToken => ({ text, start, end: start + text.length, lemma, pos, morph, is_word: true });
const known = (lemma: string, english: string): KnownWord => ({ lemma, pos: "verb", senses: [english], transliteration: null, level: "A1", core_rank: 50 });
const table = (lemma: string): Conjugation => ({ lemma, irregular: lemma === "dar", mood: "indicativo", tense: "presente", table: { yo: "doy", tú: "das" } });

const dado = tok("dado", "dar", "verb", "Tense=Past VerbForm=Part");
const ha = tok("ha", "haber", "aux", "Mood=Ind Number=Sing Person=3 Tense=Pres VerbForm=Fin");
const habla = tok("habla", "hablar", "verb", "Mood=Ind Number=Sing Person=3 Tense=Pres VerbForm=Fin");
const knownMap = new Map<string, KnownWord>([["dado", known("dar", "to give")], ["habla", known("hablar", "to speak")], ["ha", known("haber", "to have")]]);

describe("codeVerbQueries", () => {
  it("picks finite verbs, participles and gerunds the lexicon knows, never the auxiliary haber", () => {
    const q = codeVerbQueries([[ha, dado, habla]], knownMap, 10);
    expect(q.map((x) => x.lemma)).toEqual(["dar", "hablar"]);
  });
  it("leaves verbs used with se to the model, and unknown verbs", () => {
    const se = tok("se", "él", "pron", "");
    expect(codeVerbQueries([[se, habla]], knownMap, 10)).toEqual([]);
    expect(codeVerbQueries([[habla]], new Map(), 10)).toEqual([]);
  });
  it("lists a form once and respects the cap", () => {
    expect(codeVerbQueries([[habla, habla]], knownMap, 10)).toHaveLength(1);
    expect(codeVerbQueries([[dado, habla]], knownMap, 1)).toHaveLength(1);
  });
});

describe("buildCodeVerbs", () => {
  it("builds a verb entry with a code-made label, and names the non-finite forms plainly", () => {
    const queries = codeVerbQueries([[ha, dado, habla]], knownMap, 10);
    const verbs = buildCodeVerbs(queries, [table("dar"), table("hablar")], knownMap);
    expect(verbs[0]).toMatchObject({
      infinitive: "dar",
      english: "to give",
      form_in_source: "dado",
      form_english: "past participle of dar (to give)",
      tense: "past participle",
      irregular: true,
      reflexive: null,
      conjugation_table: { yo: "doy", tú: "das" },
    });
    expect(verbs[1]).toMatchObject({ form_english: "present indicative of hablar (to speak)", tense: "present", mood: "indicative", person: "él/ella/usted" });
  });
  it("skips verbs the service could not conjugate", () => {
    const queries = codeVerbQueries([[habla]], knownMap, 10);
    expect(buildCodeVerbs(queries, [null], knownMap)).toEqual([]);
  });
});
