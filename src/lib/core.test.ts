import { describe, expect, it } from "vitest";
import { CORE_SIZE, coreProgress, coreRanksFor, coreToPayload, coreWords, parseCore } from "./core";
import { deckKey } from "./deck-payload";

describe("parseCore", () => {
  it("reads Spanish lines as lemma, part of speech, English, ranked in order across chunks", () => {
    const words = parseCore("es", ["de\tprep\tof, from\nser\tverb\tto be\n", "casa\tnoun\thouse"]);
    expect(words.map((w) => [w.rank, w.lemma, w.part_of_speech, w.english])).toEqual([
      [1, "de", "prep", "of, from"],
      [2, "ser", "verb", "to be"],
      [3, "casa", "noun", "house"],
    ]);
  });

  it("reads Farsi lines with the transliteration second", () => {
    const [w] = parseCore("fa", ["بودن\tbudan\tverb\tto be"]);
    expect(w).toMatchObject({ rank: 1, lemma: "بودن", transliteration: "budan", part_of_speech: "verb", english: "to be" });
  });
});

describe("coreProgress", () => {
  const words = parseCore("es", ["de\tprep\tof\nser\tverb\tto be\ncasa\tnoun\thouse\nperro\tnoun\tdog"]);

  it("counts what is in the deck and lists the most common words still missing", () => {
    const p = coreProgress(words, new Set([deckKey("ser")]), 2);
    expect(p.total).toBe(4);
    expect(p.inDeck).toBe(1);
    expect(p.next.map((w) => w.lemma)).toEqual(["de", "casa"]);
  });

  it("matches the deck by the same key saving uses, so case and spacing do not matter", () => {
    const p = coreProgress(words, new Set([deckKey("  DE ")]));
    expect(p.inDeck).toBe(1);
  });
});

describe("coreToPayload", () => {
  it("makes a deck card with no example, carrying the transliteration for Farsi", () => {
    const [w] = parseCore("fa", ["بودن\tbudan\tverb\tto be"]);
    expect(coreToPayload(w)).toEqual({ lemma: "بودن", english: "to be", part_of_speech: "verb", example: "", transliteration: "budan" });
  });
});

describe("coreRanksFor", () => {
  it("returns ranks only for lemmas on the list", () => {
    const es = coreWords("es");
    const first = es[0].lemma;
    expect(coreRanksFor("es", [first, "zzzz-not-a-word"])).toEqual({ [first]: 1 });
  });
});

describe.each(["es", "fa"] as const)("the %s list", (language) => {
  const words = coreWords(language);
  it(`has exactly ${CORE_SIZE} complete, unique entries`, () => {
    expect(words.length).toBe(CORE_SIZE);
    expect(new Set(words.map((w) => deckKey(w.lemma))).size).toBe(CORE_SIZE);
    for (const w of words) {
      expect(w.lemma && w.english && w.part_of_speech).toBeTruthy();
      if (language === "fa") expect(w.transliteration).toBeTruthy();
    }
  });
  it("uses only known parts of speech", () => {
    const allowed = new Set(["noun", "verb", "adj", "adv", "prep", "pron", "conj", "det", "num", "interj"]);
    for (const w of words) expect(allowed.has(w.part_of_speech)).toBe(true);
  });
});
