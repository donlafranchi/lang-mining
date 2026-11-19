// Paragraphs are split in code so the target-language text shown to the learner is exactly the source,
// never something the model rewrote.

export const MAX_PARAGRAPH_CHARS = 1200;
export const MIN_PARAGRAPH_CHARS = 80;
export const BATCH_MAX_CHARS = 3000;
export const BATCH_MAX_PARAGRAPHS = 5;

export type BatchLimits = { maxParagraphs: number; maxChars: number };
export const DEFAULT_BATCH_LIMITS: BatchLimits = { maxParagraphs: BATCH_MAX_PARAGRAPHS, maxChars: BATCH_MAX_CHARS };
// Cap what we send so a huge page cannot run up a bill. Roughly 12k words.
export const MAX_ARTICLE_CHARS = 60_000;

export type NumberedParagraph = { n: number; text: string };

function splitLong(paragraph: string): string[] {
  if (paragraph.length <= MAX_PARAGRAPH_CHARS) return [paragraph];
  const sentences = paragraph.split(/(?<=[.!?…»"”؟])\s+/);
  const pieces: string[] = [];
  let current = "";
  const push = () => {
    if (current) pieces.push(current);
    current = "";
  };
  for (const sentence of sentences) {
    if (sentence.length > MAX_PARAGRAPH_CHARS) {
      push();
      // A sentence with no stop in 1200 characters: cut at the last space before the limit.
      let rest = sentence;
      while (rest.length > MAX_PARAGRAPH_CHARS) {
        const cut = rest.lastIndexOf(" ", MAX_PARAGRAPH_CHARS);
        const at = cut > 0 ? cut : MAX_PARAGRAPH_CHARS;
        pieces.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
      continue;
    }
    if (current && current.length + 1 + sentence.length > MAX_PARAGRAPH_CHARS) push();
    current = current ? `${current} ${sentence}` : sentence;
  }
  push();
  return pieces;
}

function mergeShort(paragraphs: string[]): string[] {
  const out: string[] = [];
  let carry = "";
  for (const p of paragraphs) {
    const joined = carry ? `${carry} ${p}` : p;
    if (joined.length < MIN_PARAGRAPH_CHARS) {
      carry = joined;
      continue;
    }
    out.push(joined);
    carry = "";
  }
  if (carry) {
    if (out.length > 0) out[out.length - 1] = `${out[out.length - 1]} ${carry}`;
    else out.push(carry);
  }
  return out;
}

/** Split source text into study paragraphs. */
export function splitParagraphs(text: string): string[] {
  const trimmed = text.replace(/\r/g, "").trim();
  if (!trimmed) return [];

  // Blank lines separate paragraphs. With none, a line break is the only signal there is.
  const raw = /\n[ \t]*\n/.test(trimmed) ? trimmed.split(/\n[ \t]*\n/) : trimmed.split("\n");
  const cleaned = raw.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);

  const result: string[] = [];
  let total = 0;
  for (const p of mergeShort(cleaned.flatMap(splitLong))) {
    if (total + p.length > MAX_ARTICLE_CHARS && result.length > 0) break;
    result.push(p);
    total += p.length;
  }
  return result;
}

/** Group paragraphs into calls: a few paragraphs, a few thousand characters. Numbers are 1-based and global. */
export function batchParagraphs(paragraphs: string[], limits: BatchLimits = DEFAULT_BATCH_LIMITS): NumberedParagraph[][] {
  const batches: NumberedParagraph[][] = [];
  let current: NumberedParagraph[] = [];
  let chars = 0;
  paragraphs.forEach((text, i) => {
    const full = current.length >= limits.maxParagraphs || (current.length > 0 && chars + text.length > limits.maxChars);
    if (full) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push({ n: i + 1, text });
    chars += text.length;
  });
  if (current.length > 0) batches.push(current);
  return batches;
}
