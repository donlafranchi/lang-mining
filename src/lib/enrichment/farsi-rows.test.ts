import { describe, expect, it } from "vitest";
import type { FarsiVerb, FarsiWord } from "./farsi-schema";
import { farsiParagraphRows } from "./farsi-rows";

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
