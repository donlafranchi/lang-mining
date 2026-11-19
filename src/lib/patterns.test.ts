import { describe, expect, it } from "vitest";
import { lessonPatterns, patternById, patternPromptLines, SPANISH_PATTERNS } from "./patterns";

describe("pattern catalog", () => {
  it("has unique ids and complete teaching for every pattern", () => {
    expect(new Set(SPANISH_PATTERNS.map((p) => p.id)).size).toBe(SPANISH_PATTERNS.length);
    for (const p of SPANISH_PATTERNS) {
      expect(p.title && p.build && p.explanation && p.hint).toBeTruthy();
      expect(p.examples.length).toBeGreaterThanOrEqual(3);
      for (const x of p.examples) expect(x.spanish && x.english).toBeTruthy();
    }
  });

  it("teaches the present perfect with ha dado first", () => {
    const p = patternById("present_perfect")!;
    expect(p.title).toMatch(/ha dado/);
    expect(p.examples.length).toBeGreaterThanOrEqual(5);
  });

  it("lists every id for the model", () => {
    const lines = patternPromptLines();
    for (const p of SPANISH_PATTERNS) expect(lines).toContain(p.id);
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
