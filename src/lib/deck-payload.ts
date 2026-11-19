import { z } from "zod";

/** What a flashcard keeps from a vocab entry. Built from the lesson word, so only the saved copy is stored. */
export type DeckPayload = {
  lemma: string;
  english: string;
  part_of_speech: string;
  example: string;
  level?: string;
  /** Latin spelling, for Farsi. */
  transliteration?: string;
};

type WordLike = {
  lemma: string;
  english: string;
  part_of_speech: string;
  /** Spanish words carry a short example. Farsi words do not, the paragraph above them is the example. */
  example_fragment?: string;
  level?: string;
  transliteration?: string;
};

export function toDeckPayload(word: WordLike): DeckPayload {
  const payload: DeckPayload = {
    lemma: word.lemma,
    english: word.english,
    part_of_speech: word.part_of_speech,
    example: word.example_fragment ?? "",
  };
  if (word.level) payload.level = word.level;
  if (word.transliteration) payload.transliteration = word.transliteration;
  return payload;
}

const payloadSchema = z.object({
  lemma: z.string().min(1).max(200),
  english: z.string().min(1).max(500),
  part_of_speech: z.string().max(100),
  example: z.string().max(300),
  level: z.string().max(10).optional(),
  transliteration: z.string().max(200).optional(),
});

export function parseDeckPayload(value: unknown): { ok: true; data: DeckPayload } | { ok: false; error: string } {
  const result = payloadSchema.safeParse(value);
  if (!result.success) return { ok: false, error: "That does not look like a word card." };
  return { ok: true, data: result.data };
}

/** The same word saved twice must land on the same key. Accents stay, since they change the word. */
export function deckKey(lemma: string): string {
  return lemma
    .normalize("NFC")
    .replace(/[​-‏⁠﻿]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop words that land on the same key, keeping the first. Used before saving many at once. */
export function uniqueByKey(payloads: DeckPayload[]): DeckPayload[] {
  const seen = new Set<string>();
  const out: DeckPayload[] = [];
  for (const p of payloads) {
    const key = deckKey(p.lemma);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
