import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./languages";
import { lessonPatterns, patternById, patternPromptLines, patternsFor } from "./patterns";

const ALL = LANGUAGES.flatMap((l) => patternsFor(l.id));

describe("pattern catalog", () => {
  it("has unique ids and complete teaching for every pattern", () => {
    expect(new Set(ALL.map((p) => p.id)).size).toBe(ALL.length);
    for (const p of ALL) {
      expect(p.title && p.build && p.explanation && p.hint).toBeTruthy();
      expect(p.examples.length).toBeGreaterThanOrEqual(3);
      for (const x of p.examples) expect(x.text && x.english).toBeTruthy();
    }
  });

  it("teaches the present perfect with ha dado first", () => {
    const p = patternById("present_perfect")!;
    expect(p.title).toMatch(/ha dado/);
    expect(p.examples.length).toBeGreaterThanOrEqual(5);
  });

  it("lists every id for the model, per language", () => {
    for (const l of LANGUAGES) {
      const lines = patternPromptLines(l.id);
      for (const p of patternsFor(l.id)) expect(lines).toContain(p.id);
    }
  });

  it("gives Farsi examples a transliteration, since the learner cannot read the script yet", () => {
    for (const p of patternsFor("fa")) {
      expect(p.id.startsWith("fa_")).toBe(true);
      for (const x of p.examples) expect(x.translit).toBeTruthy();
    }
  });
});

describe("lessonPatterns", () => {
  it("joins uses across paragraphs, once per pattern, with every quote", () => {
    const out = lessonPatterns([
      { patterns: [{ id: "present_perfect", quote: "ha dado" }] },
      { patterns: [{ id: "present_perfect", quote: "han visto" }, { id: "near_future", quote: "va a llover" }] },
      { patterns: [{ id: "present_perfect", quote: "ha dado" }] },
    ]);
    expect(out.map((o) => o.pattern.id)).toEqual(["present_perfect", "near_future"]);
    expect(out[0].quotes).toEqual(["ha dado", "han visto"]);
  });

  it("ignores ids that are not in the catalog and paragraphs with none", () => {
    expect(lessonPatterns([{ patterns: [{ id: "made_up", quote: "x" }] }, {}])).toEqual([]);
  });
});

import { exampleFor } from "./patterns";

describe("exampleFor", () => {
  it("shows one short literal example, matched to the words in the text", () => {
    const hace = patternById("hace_time")!;
    expect(exampleFor(hace, "hace dos años")).toEqual({ text: "hace dos años", english: "2 years ago" });
    expect(exampleFor(hace, "hace una hora").english).toBe("1 hour ago");
    expect(exampleFor(hace).text).toBe("hace dos años");
  });
  it("falls back to the first full example when a pattern has no short ones", () => {
    const p = patternById("present_perfect")!;
    expect(exampleFor(p, "ha dado")).toEqual(p.examples[0]);
  });
});
