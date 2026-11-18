import { describe, expect, it } from "vitest";
import { allIdioms, allVerbs, allVocab } from "./flatten";
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
