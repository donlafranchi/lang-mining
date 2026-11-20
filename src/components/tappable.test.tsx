import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { farsiGlosses } from "../lib/enrichment/farsi-rows";
import { HighlightedText } from "./HighlightedText";

describe("tappable words", () => {
  it("wraps only words with a known meaning, keeping the core underline", () => {
    const glosses = farsiGlosses([
      { kind: "word", word: { lemma: "کتاب", surface: "کتاب", transliteration: "ketab", part_of_speech: "noun", english: "book", level: "A1", register: "neutral" } },
    ]);
    const html = renderToStaticMarkup(<HighlightedText text="این کتاب، خوب است" forms={{ کتاب: 12 }} glosses={glosses} onWord={() => {}} />);
    expect(html.match(/tap-word/g)).toHaveLength(1);
    expect(html).toContain("core-word");
    expect(html).toContain("این");
  });
});
