import { describe, expect, it } from "vitest";
import type { WordRow } from "./enrichment/rows";
import { answerVariants, isCorrect, normalizeAnswer, pickQuestions } from "./test-me";

describe("answers", () => {
  it("ignores case, 'to', articles and punctuation", () => {
    expect(normalizeAnswer("To Have!")).toBe("have");
    expect(normalizeAnswer("the house")).toBe("house");
  });
  it("accepts any listed meaning", () => {
    const a = answerVariants("to have; to own (a thing)", "hold");
    expect(isCorrect("own", a)).toBe(true);
    expect(isCorrect("have", a)).toBe(true);
    expect(isCorrect("hold", a)).toBe(true);
    expect(isCorrect("eat", a)).toBe(false);
    expect(isCorrect("  ", a)).toBe(false);
  });
});

describe("pickQuestions", () => {
  const word = (lemma: string, english: string): WordRow => ({
    kind: "word",
    vocab: { lemma, surface_form: lemma, part_of_speech: "noun", english, example_fragment: "", level: "A1" },
  });
  it("puts core words first and caps the count", () => {
    const rows = [word("rareza", "rarity"), word("casa", "house"), word("perro", "dog")];
    const qs = pickQuestions(rows, { perro: 300 }, 2);
    expect(qs.map((q) => q.lemma)).toEqual(["perro", "rareza"]);
  });
});
