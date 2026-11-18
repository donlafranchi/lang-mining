import { describe, expect, it, vi } from "vitest";
import { enrichText, EnrichmentError } from "./enrich";
import { buildSystemPrompt } from "./prompt";
import type { FarsiEnrichment } from "./farsi-schema";

const validJson = JSON.stringify({
  summary: "Weekend plans.",
  segments: [],
  vocab: [
    {
      lemma: "chévere",
      surface_form: "chévere",
      part_of_speech: "adjective",
      english: "cool, great",
      example_fragment: "eso está chévere",
      level: "A2",
    },
  ],
  idioms: [],
  verbs: [],
});

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt();

  it("does not ask for dialect fields", () => {
    expect(prompt).not.toMatch(/detected_dialect|dialect_tags|similar_in_other_dialects|dialect_note/);
  });

  it("asks for verb translations and the reflexive block", () => {
    expect(prompt).toMatch(/form_english/);
    expect(prompt).toMatch(/reflexive/);
    expect(prompt).toMatch(/reflexive pronoun/i);
  });

  it("tells the model to keep fragments short and return JSON only", () => {
    expect(prompt).toMatch(/never copy full lines/i);
    expect(prompt).toMatch(/only (a )?json/i);
  });
});

describe("enrichText", () => {
  it("returns parsed data on a valid first response", async () => {
    const complete = vi.fn().mockResolvedValue(validJson);
    const result = await enrichText({ text: "Eso está chévere.", complete });
    expect(result.vocab[0].lemma).toBe("chévere");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once when the first response is invalid, feeding the error back", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce(validJson);
    const result = await enrichText({ text: "Hola.", complete });
    expect(result.summary).toBe("Weekend plans.");
    expect(complete).toHaveBeenCalledTimes(2);
    const secondCall = complete.mock.calls[1][0];
    const lastMessage = secondCall.messages[secondCall.messages.length - 1];
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content).toMatch(/not valid JSON/i);
  });

  it("throws EnrichmentError after the retry also fails, and never calls a third time", async () => {
    const complete = vi.fn().mockResolvedValue("still garbage");
    await expect(
      enrichText({ text: "Hola.", complete }),
    ).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("rejects empty input before spending an API call", async () => {
    const complete = vi.fn();
    await expect(
      enrichText({ text: "   ", complete }),
    ).rejects.toThrow(/empty/i);
    expect(complete).not.toHaveBeenCalled();
  });
});

describe("Farsi", () => {
  const farsiJson = JSON.stringify({
    summary: "Weekend plans.",
    segments: [],
    vocab: [
      {
        lemma: "فردا",
        transliteration: "fardâ",
        part_of_speech: "adverb",
        english: "tomorrow",
        example_fragment: "فردا می‌بینمت",
        level: "A1",
        register: "neutral",
      },
    ],
    idioms: [],
    verbs: [],
  });

  it("builds a Farsi prompt that asks for transliteration, register and compound verbs", () => {
    const prompt = buildSystemPrompt("fa");
    expect(prompt).toMatch(/Persian|Farsi/);
    expect(prompt).toMatch(/transliteration/);
    expect(prompt).toMatch(/colloquial/);
    expect(prompt).toMatch(/compound/);
    expect(prompt).toMatch(/never copy full lines/i);
    expect(prompt).toMatch(/only (a )?json/i);
    expect(prompt).not.toMatch(/reflexive|tú\/ustedes|Latin American/);
  });

  it("keeps the Spanish prompt free of Farsi fields", () => {
    expect(buildSystemPrompt("es")).not.toMatch(/transliteration/);
    expect(buildSystemPrompt()).toBe(buildSystemPrompt("es"));
  });

  it("parses a Farsi response for a Farsi session", async () => {
    const complete = vi.fn().mockResolvedValue(farsiJson);
    const result = (await enrichText({ text: "فردا می‌بینمت.", language: "fa", complete })) as FarsiEnrichment;
    expect(result.vocab[0].transliteration).toBe("fardâ");
  });

  it("rejects a Farsi-shaped response for a Spanish session and retries once", async () => {
    const complete = vi.fn().mockResolvedValue(farsiJson);
    await expect(enrichText({ text: "Hola.", language: "es", complete })).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });
});
