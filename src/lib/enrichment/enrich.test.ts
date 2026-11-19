import { describe, expect, it, vi } from "vitest";
import { BATCH_CONCURRENCY, enrichText, EnrichmentError, OutputTruncatedError, type CompleteFn } from "./enrich";
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

describe("buildSystemPrompt (Spanish help levels)", () => {
  it("full help glosses every distinct word, small words included", () => {
    const prompt = buildSystemPrompt("es", "full");
    expect(prompt).toMatch(/EVERY distinct word/);
    expect(prompt).not.toMatch(/content word/);
    expect(prompt).toMatch(/every conjugated verb, up to 8/);
  });

  it("medium help glosses every content word and skips the basic small words", () => {
    const prompt = buildSystemPrompt("es", "medium");
    expect(prompt).toMatch(/every distinct content word/);
    expect(prompt).toMatch(/skip/i);
    expect(prompt).not.toMatch(/EVERY distinct word/);
    expect(prompt).toMatch(/up to 5 notable conjugated verbs/);
  });

  it("light help asks for a handful of key words, with an example each, as before", () => {
    const prompt = buildSystemPrompt("es", "light");
    expect(prompt).toMatch(/up to 6 of the most useful/);
    expect(prompt).toMatch(/at most 140 characters/);
    expect(prompt).toMatch(/up to 3 notable conjugated verbs/);
    expect(prompt).not.toMatch(/EVERY distinct word/);
  });

  it("leaves the example empty at full and medium, since the paragraph shows the word", () => {
    expect(buildSystemPrompt("es", "full")).toMatch(/always an empty string/);
    expect(buildSystemPrompt("es", "medium")).toMatch(/always an empty string/);
    expect(buildSystemPrompt("es", "light")).not.toMatch(/always an empty string/);
  });

  it("keeps the reflexive block, the numbered paragraphs and JSON-only at every level", () => {
    for (const help of ["full", "medium", "light"] as const) {
      const prompt = buildSystemPrompt("es", help);
      expect(prompt).toMatch(/reflexive pronoun/i);
      expect(prompt).toMatch(/EVERY paragraph/);
      expect(prompt).toMatch(/only (a )?json/i);
      expect(prompt).not.toMatch(/transliteration/);
    }
  });

  it("defaults to light for Spanish", () => {
    expect(buildSystemPrompt("es")).toBe(buildSystemPrompt("es", "light"));
    expect(buildSystemPrompt()).toBe(buildSystemPrompt("es", "light"));
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

describe("output cut off by the token limit", () => {
  it("retries once with a note to be shorter, then succeeds", async () => {
    const good = fakeModel();
    const complete = vi
      .fn<CompleteFn>()
      .mockRejectedValueOnce(new OutputTruncatedError())
      .mockImplementation(good);
    const result = (await enrichText({ text: article(2), complete })) as Enrichment;
    expect(result.paragraphs).toHaveLength(2);
    expect(complete).toHaveBeenCalledTimes(2);
    const retry = complete.mock.calls[1][0];
    const last = retry.messages[retry.messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toMatch(/cut off/i);
    expect(last.content).toMatch(/\[1\]/);
  });

  it("gives a clear error when it is cut off twice", async () => {
    const complete = vi.fn<CompleteFn>().mockRejectedValue(new OutputTruncatedError());
    const error = await enrichText({ text: article(2), complete }).catch((e) => e);
    expect(error).toBeInstanceOf(EnrichmentError);
    expect(error.message).toMatch(/too long/i);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("applies to Farsi too", async () => {
    const complete = vi.fn<CompleteFn>().mockRejectedValue(new OutputTruncatedError());
    await expect(enrichText({ text: "فردا می‌بینمت.", language: "fa", complete })).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("puts the start of a bad answer in the final error so it can be diagnosed", async () => {
    const complete = vi.fn<CompleteFn>().mockResolvedValue("Sure! Here is a long explanation instead of JSON");
    const error = await enrichText({ text: article(1), complete }).catch((e) => e);
    expect(error.message).toContain("Sure! Here is");
  });
});

const farsiWord = (n: number, i: number) => ({
  lemma: `کلمه${n}${i}`,
  surface: `کلمه${n}${i}`,
  transliteration: "kalame",
  part_of_speech: "noun",
  english: "word",
  level: "A1",
  register: "neutral",
});

const farsiParagraphResult = (n: number) => ({
  n,
  transliteration: `transliteration of paragraph ${n}`,
  english: `English for Farsi paragraph ${n}.`,
  key_phrase: { persian: "فردا می‌بینمت", transliteration: "fardâ mibinamet", english: "I'll see you tomorrow" },
  words: [farsiWord(n, 1), farsiWord(n, 2)],
  verbs: [],
  idioms: [],
});

/** A fake Farsi model: answers for exactly the paragraph numbers in the prompt. */
function fakeFarsiModel(): CompleteFn {
  return async ({ messages }) => {
    const numbers = [...messages[0].content.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]));
    return JSON.stringify({
      gist: `Gist of ${numbers.join(",")}.`,
      paragraphs: numbers.map(farsiParagraphResult),
      grammar_notes: [],
    });
  };
}

const persianPara = (i: number) =>
  `بند شماره ${i} از یک متن آزمایشی با متن کافی برای اینکه با بند دیگر ادغام نشود و از حداقل طول بیشتر باشد.`;
const persianText = (count: number) => Array.from({ length: count }, (_, i) => persianPara(i + 1)).join("\n\n");

describe("Farsi prompts", () => {
  it("asks for transliteration, register, compound verbs and JSON only, at every level", () => {
    for (const help of ["full", "medium", "light"] as const) {
      const prompt = buildSystemPrompt("fa", help);
      expect(prompt).toMatch(/Persian|Farsi/);
      expect(prompt).toMatch(/transliteration/);
      expect(prompt).toMatch(/colloquial/);
      expect(prompt).toMatch(/compound/);
      expect(prompt).toMatch(/EVERY paragraph/);
      expect(prompt).toMatch(/only (a )?json/i);
      expect(prompt).not.toMatch(/reflexive|tú\/ustedes|Latin American/);
    }
  });

  it("asks for a transliteration and an English translation of every paragraph, not copies of the Persian", () => {
    const prompt = buildSystemPrompt("fa", "full");
    expect(prompt).toMatch(/transliteration \(the whole paragraph/);
    expect(prompt).toMatch(/english \(a faithful English translation/);
    expect(prompt).toMatch(/Do not copy the Persian paragraphs back/);
  });

  it("full help glosses every distinct word", () => {
    expect(buildSystemPrompt("fa", "full")).toMatch(/EVERY distinct word/);
    expect(buildSystemPrompt("fa", "full")).not.toMatch(/content word/);
  });

  it("medium help glosses every content word and skips the basic small words", () => {
    const prompt = buildSystemPrompt("fa", "medium");
    expect(prompt).toMatch(/every distinct content word/);
    expect(prompt).toMatch(/skip/i);
    expect(prompt).not.toMatch(/EVERY distinct word/);
  });

  it("light help asks for a handful of key words", () => {
    const prompt = buildSystemPrompt("fa", "light");
    expect(prompt).toMatch(/up to 8 of the most useful/);
    expect(prompt).not.toMatch(/EVERY distinct word/);
  });

  it("defaults to full help for Farsi", () => {
    expect(buildSystemPrompt("fa")).toBe(buildSystemPrompt("fa", "full"));
    expect(buildSystemPrompt("es")).not.toMatch(/transliteration/);
  });

  it("tells the model compound parts is one string", () => {
    expect(buildSystemPrompt("fa")).toMatch(/parts \(one string/);
  });
});

describe("enrichText (Farsi)", () => {
  it("builds 2-paragraph batches at full help and keeps the source Persian exactly", async () => {
    const complete = vi.fn(fakeFarsiModel());
    const result = (await enrichText({ text: persianText(6), language: "fa", help: "full", complete })) as FarsiEnrichment;
    expect(complete).toHaveBeenCalledTimes(3);
    expect(result.paragraphs).toHaveLength(6);
    expect(result.paragraphs.map((p) => p.persian)).toEqual(Array.from({ length: 6 }, (_, i) => persianPara(i + 1)));
    expect(result.paragraphs[0].words).toHaveLength(2);
    expect(result.paragraphs[0].english).toBe("English for Farsi paragraph 1.");
    expect(result.summary).toBe("Gist of 1,2. Gist of 3,4. Gist of 5,6.");
  });

  it("uses bigger batches at lighter help", async () => {
    const medium = vi.fn(fakeFarsiModel());
    await enrichText({ text: persianText(6), language: "fa", help: "medium", complete: medium });
    expect(medium).toHaveBeenCalledTimes(2);
    const light = vi.fn(fakeFarsiModel());
    await enrichText({ text: persianText(6), language: "fa", help: "light", complete: light });
    expect(light).toHaveBeenCalledTimes(2);
  });

  it("sends the level's prompt to the model", async () => {
    const complete = vi.fn(fakeFarsiModel());
    await enrichText({ text: persianText(1), language: "fa", help: "light", complete });
    expect(complete.mock.calls[0][0].system).toMatch(/up to 8 of the most useful/);
  });

  it("defaults to full help", async () => {
    const complete = vi.fn(fakeFarsiModel());
    await enrichText({ text: persianText(1), language: "fa", complete });
    expect(complete.mock.calls[0][0].system).toMatch(/EVERY distinct word/);
  });

  it("retries a bad batch once, and the retry says which numbers were expected", async () => {
    const good = fakeFarsiModel();
    const skipping: CompleteFn = async ({ messages }) => {
      const full = JSON.parse(await good({ system: "", messages }));
      full.paragraphs = full.paragraphs.slice(0, 1);
      return JSON.stringify(full);
    };
    const complete = vi.fn<CompleteFn>().mockImplementationOnce(skipping).mockImplementation(good);
    const result = (await enrichText({ text: persianText(2), language: "fa", help: "full", complete })) as FarsiEnrichment;
    expect(result.paragraphs).toHaveLength(2);
    const retry = complete.mock.calls[1][0];
    expect(retry.messages[retry.messages.length - 1].content).toMatch(/expected exactly 1, 2/i);
  });

  it("rejects a Spanish-shaped response for a Farsi session after one retry", async () => {
    const complete = vi.fn<CompleteFn>().mockImplementation(fakeModel());
    await expect(enrichText({ text: persianText(1), language: "fa", complete })).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("rejects a Farsi-shaped response for a Spanish session after one retry", async () => {
    const complete = vi.fn<CompleteFn>().mockImplementation(fakeFarsiModel());
    await expect(enrichText({ text: article(1), language: "es", complete })).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("uses smaller Spanish batches at higher help, and defaults Spanish to light", async () => {
    const full = vi.fn(fakeModel());
    const medium = vi.fn(fakeModel());
    const light = vi.fn(fakeModel());
    const unset = vi.fn(fakeModel());
    await enrichText({ text: article(12), language: "es", help: "full", complete: full });
    await enrichText({ text: article(12), language: "es", help: "medium", complete: medium });
    await enrichText({ text: article(12), language: "es", help: "light", complete: light });
    await enrichText({ text: article(12), language: "es", complete: unset });
    expect(full).toHaveBeenCalledTimes(4);
    expect(medium).toHaveBeenCalledTimes(3);
    expect(light).toHaveBeenCalledTimes(3);
    expect(unset).toHaveBeenCalledTimes(light.mock.calls.length);
    expect(unset.mock.calls[0][0].system).toBe(light.mock.calls[0][0].system);
  });

  it("sends the Spanish level's prompt to the model", async () => {
    const complete = vi.fn(fakeModel());
    await enrichText({ text: article(1), language: "es", help: "full", complete });
    expect(complete.mock.calls[0][0].system).toMatch(/EVERY distinct word/);
  });
});
