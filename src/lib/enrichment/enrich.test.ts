import { describe, expect, it, vi } from "vitest";
import { BATCH_CONCURRENCY, enrichText, EnrichmentError, type CompleteFn } from "./enrich";
import type { FarsiEnrichment } from "./farsi-schema";
import { buildBatchUserPrompt, buildSystemPrompt } from "./prompt";
import type { Enrichment } from "./schema";

const paragraphResult = (n: number) => ({
  n,
  english: `English for paragraph ${n}.`,
  key_phrase: { spanish: "eso está chévere", english: "that is great" },
  verbs: [],
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
});

/** A fake model: reads the paragraph numbers out of the prompt and answers for exactly those. */
function fakeModel(): CompleteFn {
  return async ({ messages }) => {
    const prompt = messages[0].content;
    const numbers = [...prompt.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]));
    return JSON.stringify({
      gist: `Gist of ${numbers.join(",")}.`,
      paragraphs: numbers.map(paragraphResult),
      grammar_notes: [],
    });
  };
}

const para = (i: number) => `Párrafo número ${i} de un artículo de prueba con texto suficiente para no fusionarse con otro.`;
const article = (count: number) => Array.from({ length: count }, (_, i) => para(i + 1)).join("\n\n");

describe("buildSystemPrompt (Spanish)", () => {
  const prompt = buildSystemPrompt();

  it("does not ask for dialect fields", () => {
    expect(prompt).not.toMatch(/detected_dialect|dialect_tags|similar_in_other_dialects|dialect_note/);
  });

  it("asks for verb translations and the reflexive block", () => {
    expect(prompt).toMatch(/form_english/);
    expect(prompt).toMatch(/reflexive/);
    expect(prompt).toMatch(/reflexive pronoun/i);
  });

  it("asks for a translation of every numbered paragraph and a key phrase, and returns JSON only", () => {
    expect(prompt).toMatch(/EVERY paragraph/);
    expect(prompt).toMatch(/key_phrase/);
    expect(prompt).toMatch(/english \(a faithful English translation/);
    expect(prompt).toMatch(/only (a )?json/i);
  });

  it("tells the model not to copy the Spanish back, since the app attaches it", () => {
    expect(prompt).toMatch(/Do not copy the Spanish paragraphs back/);
  });
});

describe("buildBatchUserPrompt", () => {
  it("numbers each paragraph with its global number", () => {
    const text = buildBatchUserPrompt([
      { n: 6, text: "Seis." },
      { n: 7, text: "Siete." },
    ]);
    expect(text).toMatch(/\[6\] Seis\./);
    expect(text).toMatch(/\[7\] Siete\./);
  });
});

describe("enrichText (Spanish)", () => {
  it("builds one call for a short text and keeps the source Spanish exactly", async () => {
    const complete = vi.fn(fakeModel());
    const text = article(3);
    const result = (await enrichText({ text, complete })) as Enrichment;
    expect(complete).toHaveBeenCalledTimes(1);
    expect(result.paragraphs).toHaveLength(3);
    expect(result.paragraphs.map((p) => p.spanish)).toEqual([para(1), para(2), para(3)]);
    expect(result.paragraphs[0].english).toBe("English for paragraph 1.");
    expect(result.summary).toBe("Gist of 1,2,3.");
  });

  it("builds a 20-paragraph article as several batches, ending with 20 paragraphs in order", async () => {
    const complete = vi.fn(fakeModel());
    const result = (await enrichText({ text: article(20), complete })) as Enrichment;
    expect(complete.mock.calls.length).toBeGreaterThan(1);
    expect(result.paragraphs).toHaveLength(20);
    expect(result.paragraphs.map((p) => p.spanish)).toEqual(Array.from({ length: 20 }, (_, i) => para(i + 1)));
    expect(result.paragraphs.map((p) => p.english)).toEqual(
      Array.from({ length: 20 }, (_, i) => `English for paragraph ${i + 1}.`),
    );
  });

  it("runs batches in parallel but never more than the limit at once", async () => {
    let inFlight = 0;
    let peak = 0;
    const inner = fakeModel();
    const complete: CompleteFn = async (args) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      const out = await inner(args);
      inFlight--;
      return out;
    };
    await enrichText({ text: article(40), complete });
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(BATCH_CONCURRENCY);
  });

  it("retries a bad batch exactly once, feeding the error back", async () => {
    const good = fakeModel();
    const complete = vi
      .fn<CompleteFn>()
      .mockResolvedValueOnce("not json at all")
      .mockImplementation(good);
    const result = (await enrichText({ text: article(2), complete })) as Enrichment;
    expect(result.paragraphs).toHaveLength(2);
    expect(complete).toHaveBeenCalledTimes(2);
    const retry = complete.mock.calls[1][0];
    const last = retry.messages[retry.messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toMatch(/not valid JSON/i);
  });

  it("retries when the model skips a paragraph, and says which numbers were expected", async () => {
    const good = fakeModel();
    const skipping: CompleteFn = async ({ messages }) => {
      const full = JSON.parse(await good({ system: "", messages }));
      full.paragraphs = full.paragraphs.slice(0, 1);
      return JSON.stringify(full);
    };
    const complete = vi.fn<CompleteFn>().mockImplementationOnce(skipping).mockImplementation(good);
    const result = (await enrichText({ text: article(2), complete })) as Enrichment;
    expect(result.paragraphs).toHaveLength(2);
    const retry = complete.mock.calls[1][0];
    expect(retry.messages[retry.messages.length - 1].content).toMatch(/expected exactly 1, 2/i);
  });

  it("throws EnrichmentError after the retry also fails, with no third call for that batch", async () => {
    const complete = vi.fn<CompleteFn>().mockResolvedValue("still garbage");
    await expect(enrichText({ text: article(2), complete })).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("rejects empty input before spending an API call", async () => {
    const complete = vi.fn<CompleteFn>();
    await expect(enrichText({ text: "   ", complete })).rejects.toThrow(/empty/i);
    expect(complete).not.toHaveBeenCalled();
  });

  it("treats no language as Spanish", async () => {
    const complete = vi.fn(fakeModel());
    const result = (await enrichText({ text: article(1), language: "es", complete })) as Enrichment;
    expect(result.paragraphs).toHaveLength(1);
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
    expect(prompt).toMatch(/only (a )?json/i);
    expect(prompt).not.toMatch(/reflexive|tú\/ustedes|Latin American/);
  });

  it("keeps the Spanish prompt free of Farsi fields", () => {
    expect(buildSystemPrompt("es")).not.toMatch(/transliteration/);
    expect(buildSystemPrompt()).toBe(buildSystemPrompt("es"));
  });

  it("parses a Farsi response for a Farsi session in one call", async () => {
    const complete = vi.fn<CompleteFn>().mockResolvedValue(farsiJson);
    const result = (await enrichText({ text: "فردا می‌بینمت.", language: "fa", complete })) as FarsiEnrichment;
    expect(result.vocab[0].transliteration).toBe("fardâ");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("rejects a Farsi-shaped response for a Spanish session and retries once", async () => {
    const complete = vi.fn<CompleteFn>().mockResolvedValue(farsiJson);
    await expect(enrichText({ text: "Hola.", language: "es", complete })).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });
});
