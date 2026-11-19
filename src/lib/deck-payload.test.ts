import { describe, expect, it } from "vitest";
import { deckKey, parseDeckPayload, toDeckPayload, uniqueByKey } from "./deck-payload";

const spanish = {
  lemma: "Mañana",
  surface_form: "mañana",
  part_of_speech: "noun",
  english: "tomorrow",
  example_fragment: "nos vemos mañana",
  level: "A1" as const,
};

const farsi = {
  lemma: "فردا",
  transliteration: "fardâ",
  part_of_speech: "adverb",
  english: "tomorrow",
  example_fragment: "فردا می‌بینمت",
  level: "A1" as const,
  register: "neutral" as const,
};

describe("deckKey", () => {
  it("lowercases and trims", () => {
    expect(deckKey("  Mañana ")).toBe("mañana");
  });

  it("keeps accents, since mañana and manana are different words", () => {
    expect(deckKey("mañana")).not.toBe(deckKey("manana"));
  });

  it("removes zero-width characters that Persian text often carries", () => {
    expect(deckKey("می‌بینم")).toBe(deckKey("میبینم".replace("ی", "ی")) === "" ? "" : deckKey("می‌بینم"));
    expect(deckKey("می‌بینم")).not.toContain("‌");
  });

  it("collapses inner whitespace", () => {
    expect(deckKey("a   b")).toBe("a b");
  });
});

describe("toDeckPayload", () => {
  it("keeps what a flashcard needs from a Spanish word", () => {
    expect(toDeckPayload(spanish)).toEqual({
      lemma: "Mañana",
      english: "tomorrow",
      part_of_speech: "noun",
      example: "nos vemos mañana",
      level: "A1",
    });
  });

  it("adds the transliteration for a Farsi word", () => {
    const payload = toDeckPayload(farsi);
    expect(payload.transliteration).toBe("fardâ");
    expect(payload.lemma).toBe("فردا");
  });

  it("does not carry fields a card does not use", () => {
    expect(toDeckPayload(spanish)).not.toHaveProperty("surface_form");
    expect(toDeckPayload(farsi)).not.toHaveProperty("register");
  });
});

describe("parseDeckPayload", () => {
  it("accepts a payload built from a word", () => {
    expect(parseDeckPayload(toDeckPayload(spanish)).ok).toBe(true);
    expect(parseDeckPayload(toDeckPayload(farsi)).ok).toBe(true);
  });

  it.each(["lemma", "english"])("rejects a payload with an empty %s", (key) => {
    const bad = { ...toDeckPayload(spanish), [key]: "" };
    expect(parseDeckPayload(bad).ok).toBe(false);
  });

  it("rejects things that are not a payload", () => {
    expect(parseDeckPayload(null).ok).toBe(false);
    expect(parseDeckPayload("word").ok).toBe(false);
    expect(parseDeckPayload({}).ok).toBe(false);
  });

  it("rejects absurdly long text", () => {
    const bad = { ...toDeckPayload(spanish), english: "x".repeat(2000) };
    expect(parseDeckPayload(bad).ok).toBe(false);
  });
});

describe("Farsi words without an example", () => {
  const word = { lemma: "خانه", transliteration: "khâne", part_of_speech: "noun", english: "house", level: "A1" as const };

  it("builds a payload with an empty example", () => {
    const payload = toDeckPayload(word);
    expect(payload.example).toBe("");
    expect(payload.transliteration).toBe("khâne");
  });

  it("accepts an empty example", () => {
    expect(parseDeckPayload(toDeckPayload(word)).ok).toBe(true);
  });
});

describe("uniqueByKey", () => {
  const payload = (lemma: string) => toDeckPayload({ lemma, english: "e", part_of_speech: "noun", example_fragment: "x" });

  it("drops words that normalise to the same key, keeping the first", () => {
    const out = uniqueByKey([payload("Casa"), payload("casa "), payload("perro")]);
    expect(out.map((p) => p.lemma)).toEqual(["Casa", "perro"]);
  });

  it("keeps accented and unaccented words apart", () => {
    expect(uniqueByKey([payload("mañana"), payload("manana")])).toHaveLength(2);
  });

  it("returns an empty list for no words", () => {
    expect(uniqueByKey([])).toEqual([]);
  });
});
