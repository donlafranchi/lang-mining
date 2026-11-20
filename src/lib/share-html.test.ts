import { describe, expect, it } from "vitest";
import type { Enrichment } from "./enrichment/schema";
import { esc, renderLessonHtml, shareFileName } from "./share-html";

const lesson = (spanish = "Tengo una casa."): Enrichment => ({
  summary: "About a house.",
  grammar_notes: [],
  quiz: [],
  paragraphs: [
    {
      spanish,
      english: "I have a house.",
      key_phrase: { spanish: "una casa", english: "a house" },
      verbs: [],
      vocab: [{ lemma: "casa", surface_form: "casa", part_of_speech: "noun", english: "house", example_fragment: "", level: "A1" }],
      idioms: [],
      patterns: [],
    },
  ],
});

describe("renderLessonHtml", () => {
  it("is one self-contained file with no outside links", () => {
    const html = renderLessonHtml({ title: "La casa", language: "es", lesson: lesson() });
    expect(html).toContain("Tengo una casa.");
    expect(html).toContain("English Overview");
    expect(html).toContain("Test me");
    expect(html).not.toMatch(/(src|href)=["']https?:/);
    expect(html).not.toContain("<link");
  });

  it("escapes anything from a lesson so it cannot inject markup", () => {
    const html = renderLessonHtml({ title: "<img src=x onerror=alert(1)>", language: "es", lesson: lesson("<script>alert(1)</script>") });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps quiz data from closing its script tag", () => {
    const l = lesson();
    l.paragraphs[0].vocab[0].english = "</script><b>x";
    const html = renderLessonHtml({ title: "t", language: "es", lesson: l });
    expect(html).not.toContain("</script><b>");
  });

  it("makes safe file names", () => {
    expect(shareFileName("Anthropic: por qué el mayor debut…")).toBe("anthropic-por-que-el-mayor-debut.html");
    expect(shareFileName("؟؟")).toBe("lesson.html");
    expect(esc(`"a" & <b>`)).toBe("&quot;a&quot; &amp; &lt;b&gt;");
  });
});
