import { describe, expect, it } from "vitest";
import type { FarsiVerb, FarsiWord } from "./farsi-schema";
import { farsiGlosses, farsiParagraphRows, glossKey, interlinear, shortGloss } from "./farsi-rows";

const word = (lemma: string, pos = "noun"): FarsiWord => ({ lemma, surface: lemma, transliteration: "x", part_of_speech: pos, english: "e", level: "A1", register: "neutral" });
const verb = (infinitive: string, form: string): FarsiVerb => ({
  infinitive, transliteration: "x", english: "to go", form_in_source: form, form_transliteration: "x", form_english: "goes",
  tense: "present", mood: "indicative", person: "3sg", conjugation_table: {}, irregular: false, compound: null,
});

describe("farsiParagraphRows", () => {
  it("orders by appearance, merges a verb listed as a word, drops proper nouns", () => {
    const rows = farsiParagraphRows("کتاب می‌رود خانه", [word("خانه"), word("کتاب"), word("رفتن", "verb"), word("تهران", "proper noun")], [verb("رفتن", "می‌رود")]);
    expect(rows.map((r) => (r.kind === "word" ? r.word.lemma : r.verb.infinitive))).toEqual(["کتاب", "رفتن", "خانه"]);
  });
});

describe("farsiGlosses", () => {
  it("matches a form in the text despite punctuation, vowel marks and joiners", () => {
    expect(glossKey("«کتابِ»،")).toBe(glossKey("کتاب"));
    expect(glossKey("می‌رود")).toBe(glossKey("میرود"));
  });
  it("maps words and verbs by their written form", () => {
    const g = farsiGlosses(farsiParagraphRows("کتاب می‌رود", [word("کتاب")], [verb("رفتن", "می‌رود")]));
    expect(g.get(glossKey("کتاب"))?.lemma).toBe("کتاب");
    expect(g.get(glossKey("می‌رود"))?.meaning).toBe("goes");
  });
});

describe("word by word", () => {
  it("shortens a gloss to its first meaning", () => {
    expect(shortGloss("to go, to leave")).toBe("go");
    expect(shortGloss("the book (printed)")).toBe("book");
    expect(shortGloss("a very long explanation of something", 10)).toBe("very long…");
  });
  it("lists each word of the sentence in order with its meaning, or none", () => {
    const g = farsiGlosses(farsiParagraphRows("این کتاب می‌رود", [word("کتاب")], [verb("رفتن", "می‌رود")]));
    const out = interlinear("این کتاب، می‌رود", g);
    expect(out.map((o) => o.word)).toEqual(["این", "کتاب،", "می‌رود"]);
    expect(out.map((o) => o.gloss)).toEqual([null, "e", "goes"]);
  });
});
