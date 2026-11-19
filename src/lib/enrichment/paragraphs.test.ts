import { describe, expect, it } from "vitest";
import {
  batchParagraphs,
  BATCH_MAX_PARAGRAPHS,
  MAX_ARTICLE_CHARS,
  MAX_PARAGRAPH_CHARS,
  MIN_PARAGRAPH_CHARS,
  splitParagraphs,
} from "./paragraphs";
import { batchLimits } from "../help";

const para = (label: string, n = 120) => `${label} `.repeat(Math.ceil(n / (label.length + 1))).trim();

describe("splitParagraphs", () => {
  it("returns nothing for empty input", () => {
    expect(splitParagraphs("")).toEqual([]);
    expect(splitParagraphs("  \n\n  ")).toEqual([]);
  });

  it("splits on blank lines and keeps the text exactly", () => {
    const a = "El presidente llegó ayer a la ciudad para una reunión con los alcaldes de la región.";
    const b = "Después habló con los periodistas sobre el nuevo presupuesto y sus planes para el año.";
    expect(splitParagraphs(`${a}\n\n${b}`)).toEqual([a, b]);
  });

  it("treats single line breaks as one paragraph when there are blank lines elsewhere", () => {
    const a = "Primera línea del párrafo uno\nsigue en la segunda línea del mismo párrafo, bien larga ya.";
    const b = "Párrafo dos, también con bastante texto para que no se junte con el anterior de ninguna manera.";
    const out = splitParagraphs(`${a}\n\n${b}`);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe("Primera línea del párrafo uno sigue en la segunda línea del mismo párrafo, bien larga ya.");
  });

  it("splits on single line breaks when there are no blank lines", () => {
    const a = "Esta es la primera línea y tiene suficiente texto para ser un párrafo completo por sí sola.";
    const b = "Esta es la segunda línea y también tiene bastante texto para quedarse separada de la otra.";
    expect(splitParagraphs(`${a}\n${b}`)).toEqual([a, b]);
  });

  it("merges a short heading into the paragraph after it", () => {
    const body = "El texto del artículo empieza aquí y sigue durante varias palabras más para pasar el mínimo.";
    const out = splitParagraphs(`Título corto\n\n${body}`);
    expect(out).toEqual([`Título corto ${body}`]);
  });

  it("merges a short last paragraph into the one before it", () => {
    const body = "El texto del artículo empieza aquí y sigue durante varias palabras más para pasar el mínimo.";
    const out = splitParagraphs(`${body}\n\nFin.`);
    expect(out).toEqual([`${body} Fin.`]);
  });

  it("splits a very long paragraph at sentence ends", () => {
    const sentence = `${para("palabra", 200)}.`;
    const long = Array.from({ length: 12 }, () => sentence).join(" ");
    const out = splitParagraphs(long);
    expect(out.length).toBeGreaterThan(1);
    for (const p of out) {
      expect(p.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS);
      expect(p.endsWith(".")).toBe(true);
    }
    expect(out.join(" ")).toBe(long);
  });

  it("splits a long Persian paragraph at the Persian question mark", () => {
    const question = `${para("سلام", 300)}؟`;
    const long = Array.from({ length: 6 }, () => question).join(" ");
    const out = splitParagraphs(long);
    expect(out.length).toBeGreaterThan(1);
    for (const p of out) {
      expect(p.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS);
      expect(p.endsWith("؟")).toBe(true);
    }
    expect(out.join(" ")).toBe(long);
  });

  it("cuts a huge unpunctuated run at spaces", () => {
    const run = para("sinpuntos", 3000);
    const out = splitParagraphs(run);
    expect(out.length).toBeGreaterThan(1);
    for (const p of out) expect(p.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS);
    expect(out.join(" ")).toBe(run);
  });

  it("stops adding paragraphs past the article size cap", () => {
    const block = para("texto", MAX_PARAGRAPH_CHARS - 50);
    const text = Array.from({ length: 150 }, () => block).join("\n\n");
    const out = splitParagraphs(text);
    const total = out.reduce((n, p) => n + p.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_ARTICLE_CHARS);
    expect(out.length).toBeLessThan(150);
  });

  it("never returns a paragraph under the minimum unless it is the only one", () => {
    const text = ["Uno.", "Dos.", "Tres.", para("largo", 200)].join("\n\n");
    for (const p of splitParagraphs(text)) expect(p.length).toBeGreaterThanOrEqual(MIN_PARAGRAPH_CHARS);
    expect(splitParagraphs("Hola.")).toEqual(["Hola."]);
  });
});

describe("batchParagraphs", () => {
  it("numbers paragraphs from 1 across batches, in order, each exactly once", () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) => `Párrafo ${i + 1} ${para("x", 100)}`);
    const batches = batchParagraphs(paragraphs);
    const numbers = batches.flat().map((b) => b.n);
    expect(numbers).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(batches.flat().map((b) => b.text)).toEqual(paragraphs);
  });

  it("limits paragraphs per batch", () => {
    const batches = batchParagraphs(Array.from({ length: 20 }, () => "corto " + para("x", 100)));
    for (const b of batches) expect(b.length).toBeLessThanOrEqual(BATCH_MAX_PARAGRAPHS);
    expect(batches.length).toBe(4);
  });

  it("limits characters per batch but always takes at least one paragraph", () => {
    const big = para("grande", 1100);
    const batches = batchParagraphs([big, big, big, big]);
    expect(batches.every((b) => b.length >= 1)).toBe(true);
    expect(batches.length).toBeGreaterThan(1);
  });

  it("uses smaller batches when given tighter limits", () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => `Párrafo ${i + 1} ${para("x", 100)}`);
    const batches = batchParagraphs(paragraphs, batchLimits("fa", "full"));
    for (const b of batches) expect(b.length).toBeLessThanOrEqual(2);
    expect(batches.length).toBe(3);
    expect(batches.flat().map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("keeps the Spanish default when no limits are given", () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => `Párrafo ${i + 1} ${para("x", 100)}`);
    expect(batchParagraphs(paragraphs).length).toBe(batchParagraphs(paragraphs, batchLimits("es", "full")).length);
  });

  it("returns no batches for no paragraphs", () => {
    expect(batchParagraphs([])).toEqual([]);
  });

  it("cuts a long paragraph into even pieces at sentence ends, none over the limit", () => {
    const sentence = (i: number) => `Esta es la oración número ${i} de un párrafo muy largo que habla de la vida en la ciudad.`;
    const long = Array.from({ length: 16 }, (_, i) => sentence(i + 1)).join(" ");
    const out = splitParagraphs(long);
    expect(out.length).toBeGreaterThanOrEqual(3);
    for (const p of out) {
      expect(p.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS);
      expect(p).toMatch(/[.!?]$/);
    }
    // Even: the biggest piece is not more than twice the smallest.
    expect(Math.max(...out.map((p) => p.length))).toBeLessThanOrEqual(2 * Math.min(...out.map((p) => p.length)));
    expect(out.join(" ")).toBe(long);
  });

  it("keeps a paragraph of about 100 words whole", () => {
    const hundred = Array.from({ length: 100 }, () => "casa").join(" ");
    expect(splitParagraphs(hundred).length).toBe(1);
  });
});
