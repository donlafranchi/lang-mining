import { describe, expect, it } from "vitest";
import { allFarsiIdioms, allFarsiVerbs, allFarsiWords, allIdioms, allVerbs, allVocab } from "./flatten";
import type { FarsiEnrichment } from "./farsi-schema";
import type { Enrichment } from "./schema";

const vocab = (lemma: string) => ({
  lemma,
  surface_form: lemma,
  part_of_speech: "noun",
  english: lemma,
  example_fragment: lemma,
  level: "A1" as const,
});
const verb = (infinitive: string, form: string) => ({
  infinitive,
  english: "to x",
  form_in_source: form,
  form_english: "x",
  tense: "present",
  mood: "indicative",
  person: "1sg",
  conjugation_table: {},
  irregular: false,
  reflexive: null,
});
const idiom = (phrase: string) => ({
  phrase,
  literal_meaning: "l",
  actual_meaning: "a",
  region_tags: [],
  register: "neutral",
});
const paragraph = (over: Partial<Enrichment["paragraphs"][number]>) => ({
  spanish: "x",
  english: "y",
  key_phrase: { spanish: "a", english: "b" },
  verbs: [],
  vocab: [],
  idioms: [],
  ...over,
});
const lesson = (paragraphs: Enrichment["paragraphs"]): Enrichment => ({
  summary: "s",
  paragraphs,
  grammar_notes: [],
  quiz: [],
});

describe("flatten", () => {
  it("collects vocab from every paragraph in order, dropping repeats by lemma", () => {
    const e = lesson([
      paragraph({ vocab: [vocab("casa"), vocab("perro")] }),
      paragraph({ vocab: [vocab("Casa"), vocab("gato")] }),
    ]);
    expect(allVocab(e).map((v) => v.lemma)).toEqual(["casa", "perro", "gato"]);
  });

  it("collects idioms without repeats", () => {
    const e = lesson([paragraph({ idioms: [idiom("a")] }), paragraph({ idioms: [idiom("A"), idiom("b")] })]);
    expect(allIdioms(e).map((i) => i.phrase)).toEqual(["a", "b"]);
  });

  it("keeps the same verb in different forms but drops the identical form", () => {
    const e = lesson([
      paragraph({ verbs: [verb("ver", "vemos")] }),
      paragraph({ verbs: [verb("ver", "vemos"), verb("ver", "vi")] }),
    ]);
    expect(allVerbs(e).map((v) => v.form_in_source)).toEqual(["vemos", "vi"]);
  });

  it("returns empty lists when there is nothing", () => {
    const e = lesson([paragraph({})]);
    expect(allVocab(e)).toEqual([]);
    expect(allIdioms(e)).toEqual([]);
    expect(allVerbs(e)).toEqual([]);
  });
});

describe("flatten (Farsi)", () => {
  const word = (lemma: string) => ({
    lemma,
    surface: lemma,
    transliteration: "t",
    part_of_speech: "noun",
    english: "e",
    level: "A1" as const,
    register: "neutral" as const,
  });
  const farsiVerb = (infinitive: string, form: string) => ({
    infinitive,
    transliteration: "t",
    english: "to x",
    form_in_source: form,
    form_transliteration: "t",
    form_english: "x",
    tense: "present",
    mood: "indicative",
    person: "1sg",
    conjugation_table: {},
    irregular: false,
    compound: null,
  });
  const farsiIdiom = (phrase: string) => ({
    phrase,
    transliteration: "t",
    literal_meaning: "l",
    actual_meaning: "a",
    register: "neutral" as const,
  });
  const para = (over: Partial<FarsiEnrichment["paragraphs"][number]>) => ({
    persian: "پ",
    transliteration: "p",
    english: "e",
    key_phrase: { persian: "ک", transliteration: "k", english: "k" },
    words: [],
    verbs: [],
    idioms: [],
    ...over,
  });
  const lesson = (paragraphs: FarsiEnrichment["paragraphs"]): FarsiEnrichment => ({
    summary: "s",
    paragraphs,
    grammar_notes: [],
    quiz: [],
  });

  it("collects words from every paragraph in order, dropping repeats by dictionary form", () => {
    const e = lesson([para({ words: [word("خانه"), word("سگ")] }), para({ words: [word("خانه"), word("گربه")] })]);
    expect(allFarsiWords(e).map((w) => w.lemma)).toEqual(["خانه", "سگ", "گربه"]);
  });

  it("collects idioms and verbs without repeats", () => {
    const e = lesson([
      para({ idioms: [farsiIdiom("الف")], verbs: [farsiVerb("دیدن", "دیدم")] }),
      para({ idioms: [farsiIdiom("الف"), farsiIdiom("ب")], verbs: [farsiVerb("دیدن", "دیدم"), farsiVerb("دیدن", "دیدی")] }),
    ]);
    expect(allFarsiIdioms(e).map((i) => i.phrase)).toEqual(["الف", "ب"]);
    expect(allFarsiVerbs(e).map((v) => v.form_in_source)).toEqual(["دیدم", "دیدی"]);
  });

  it("returns empty lists when there is nothing", () => {
    const e = lesson([para({})]);
    expect(allFarsiWords(e)).toEqual([]);
    expect(allFarsiIdioms(e)).toEqual([]);
    expect(allFarsiVerbs(e)).toEqual([]);
  });
});
