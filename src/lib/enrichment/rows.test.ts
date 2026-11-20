import { describe, expect, it } from "vitest";
import { paragraphRows } from "./rows";
import type { Verb, Vocab } from "./schema";

const vocab = (lemma: string, surface: string, senses?: string[]): Vocab => ({
  lemma, surface_form: surface, part_of_speech: "noun", english: senses?.[0] ?? lemma, example_fragment: "", level: "A1", ...(senses ? { senses } : {}),
});
const verb = (infinitive: string, form: string): Verb => ({
  infinitive, english: `to ${infinitive}`, form_in_source: form, form_english: "x", tense: "present", mood: "indicative", person: "yo",
  conjugation_table: { yo: form }, irregular: false, reflexive: null,
});

describe("paragraphRows", () => {
  const text = "La casa se desplomó cuando llegó Ana.";
  it("puts words and verbs in one list, in the order they appear in the text", () => {
    const rows = paragraphRows(text, [vocab("Ana", "Ana"), vocab("casa", "casa")], [verb("desplomarse", "se desplomó"), verb("llegar", "llegó")]);
    expect(rows.map((r) => (r.kind === "verb" ? r.verb.form_in_source : r.vocab.surface_form))).toEqual(["casa", "se desplomó", "llegó", "Ana"]);
  });
  it("shows a verb once: the verb row wins over a word with the same dictionary form, and keeps its other meanings", () => {
    const rows = paragraphRows(text, [vocab("llegar", "llegó", ["to arrive", "to reach"])], [verb("llegar", "llegó")]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "verb", senses: ["to arrive", "to reach"] });
  });
  it("leaves proper nouns out of the list, however the model labels them", () => {
    const names = [
      { ...vocab("Reuters", "Reuters"), part_of_speech: "proper noun" },
      { ...vocab("Ana", "Ana"), part_of_speech: "propn" },
      { ...vocab("Madrid", "Madrid"), part_of_speech: "Proper Noun" },
      { ...vocab("casa", "casa") },
    ];
    expect(paragraphRows(text, names, []).map((r) => (r.kind === "word" ? r.vocab.lemma : ""))).toEqual(["casa"]);
  });
  it("puts entries it cannot place in the text last, in their original order", () => {
    const rows = paragraphRows(text, [vocab("zorro", "zorro"), vocab("casa", "casa")], []);
    expect(rows.map((r) => (r.kind === "word" ? r.vocab.lemma : ""))).toEqual(["casa", "zorro"]);
  });
});
