import { describe, expect, it } from "vitest";
import { coreHighlightMap, splitForHighlight, tokens } from "./highlight";

const core = [
  { rank: 1, lemma: "de", part_of_speech: "prep" },
  { rank: 20, lemma: "casa", part_of_speech: "noun" },
  { rank: 30, lemma: "dar", part_of_speech: "verb" },
  { rank: 500, lemma: "کتاب", part_of_speech: "noun" },
];

describe("coreHighlightMap", () => {
  it("marks core content words found in the text and skips function words", () => {
    const map = coreHighlightMap(core, ["La casa de mi abuela."], []);
    expect(map).toEqual({ casa: 20 });
  });

  it("marks an inflected form the lesson glossed back to a core lemma", () => {
    const map = coreHighlightMap(core, ["Ella ha dado un libro."], [{ form: "dado", lemma: "dar" }]);
    expect(map.dado).toBe(30);
  });

  it("ignores glossed forms whose lemma is not core", () => {
    expect(coreHighlightMap(core, ["x"], [{ form: "zorro", lemma: "zorro" }])).toEqual({});
  });

  it("matches case and accents-sensitively like saving does (case folded)", () => {
    expect(coreHighlightMap(core, ["CASA"], [])).toEqual({ casa: 20 });
  });
});

describe("splitForHighlight", () => {
  it("returns the exact text when the pieces are joined, with core words tagged", () => {
    const text = "La casa, de mi abuela; casa.";
    const pieces = splitForHighlight(text, { casa: 20 });
    expect(pieces.map((p) => p.text).join("")).toBe(text);
    expect(pieces.filter((p) => p.rank).map((p) => p.text)).toEqual(["casa", "casa"]);
  });

  it("returns one plain piece when nothing matches", () => {
    expect(splitForHighlight("hola mundo", {})).toEqual([{ text: "hola mundo" }]);
  });

  it("handles Persian with the half-space inside a word", () => {
    const text = "او کتاب می‌خواند.";
    const pieces = splitForHighlight(text, { "کتاب": 500 });
    expect(pieces.map((p) => p.text).join("")).toBe(text);
    expect(pieces.find((p) => p.rank)?.text).toBe("کتاب");
    expect(tokens("می‌خواند")).toEqual(["می‌خواند"]);
  });
});

import { locatePatternMarks, splitMarked } from "./highlight";

describe("locatePatternMarks", () => {
  const text = "Ella ha dado un libro y yo he comido.";
  it("finds each quote in the text, ignoring case, in text order", () => {
    const marks = locatePatternMarks(text, [{ id: "b", quote: "he comido" }, { id: "a", quote: "Ha Dado" }]);
    expect(marks).toEqual([
      { start: 5, end: 12, id: "a" },
      { start: 27, end: 36, id: "b" },
    ]);
  });
  it("skips quotes that are not in the text, empty quotes, and overlaps", () => {
    const marks = locatePatternMarks(text, [{ id: "x", quote: "no está" }, { id: "y", quote: "" }, { id: "a", quote: "ha dado" }, { id: "z", quote: "dado un" }]);
    expect(marks).toEqual([{ start: 5, end: 12, id: "a" }]);
  });
});

describe("splitMarked", () => {
  it("cuts the text into plain and marked parts, keeping core words underlined inside both, and joins back to the text", () => {
    const text = "Ella ha dado un libro.";
    const parts = splitMarked(text, { libro: 400, dado: 30 }, [{ start: 5, end: 12, id: "present_perfect" }]);
    expect(parts.map((p) => p.pieces.map((x) => x.text).join("")).join("")).toBe(text);
    expect(parts.filter((p) => p.mark).map((p) => p.mark)).toEqual(["present_perfect"]);
    expect(parts[1].pieces.find((x) => x.rank)?.text).toBe("dado");
    expect(parts[2].pieces.find((x) => x.rank)?.text).toBe("libro");
  });
  it("is one plain part when there are no marks", () => {
    expect(splitMarked("Hola.", {}, [])).toEqual([{ pieces: [{ text: "Hola." }] }]);
  });
});
