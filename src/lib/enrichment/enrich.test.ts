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

  it("gives a clear error when even one paragraph is cut off twice", async () => {
    const complete = vi.fn<CompleteFn>().mockRejectedValue(new OutputTruncatedError());
    const error = await enrichText({ text: article(1), complete }).catch((e) => e);
    expect(error).toBeInstanceOf(EnrichmentError);
    expect(error.message).toMatch(/too long/i);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("splits a batch that is cut off twice and builds the lesson from the halves", async () => {
    const good = fakeModel();
    // Any call that asks for more than one paragraph is cut off. One paragraph at a time works.
    const complete = vi.fn<CompleteFn>(async (a) => {
      if ((a.messages[0].content.match(/^\[\d+\]/gm) ?? []).length > 1) throw new OutputTruncatedError();
      return good(a);
    });
    const result = (await enrichText({ text: article(4), help: "light", complete })) as Enrichment;
    expect(result.paragraphs).toHaveLength(4);
    expect(result.paragraphs.map((p) => p.spanish)).toEqual([1, 2, 3, 4].map(para));
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

describe("enrichText with our own lexicon", () => {
  const lexiconWith = async () => {
    const { memoryStore } = await import("../../test-support/memory-lexicon");
    const m = memoryStore();
    await m.store.upsertLemmas([
      {
        language: "es", lemma: "párrafo", lemma_key: "párrafo", pos: "noun", transliteration: null, level: null,
        core_rank: 100, senses: [{ english: "paragraph", count: 2 }, { english: "section", count: 1 }], source: "core", uses: 0,
      },
    ]);
    return m.store;
  };

  it("explains known words itself, shows every sense, and tells the model to leave them out", async () => {
    const complete = vi.fn(fakeModel());
    const lesson = (await enrichText({ text: article(1), help: "full", complete, lexicon: await lexiconWith() })) as Enrichment;
    const prompt = complete.mock.calls[0][0].messages[0].content;
    expect(prompt).toMatch(/already explains.*paragraph 1: Párrafo/);
    const entry = lesson.paragraphs[0].vocab.find((v) => v.lemma === "párrafo");
    expect(entry).toMatchObject({ english: "paragraph", senses: ["paragraph", "section"], surface_form: "Párrafo" });
    // The model's own entry is still there for words the lexicon does not know.
    expect(lesson.paragraphs[0].vocab.some((v) => v.lemma === "chévere")).toBe(true);
  });

  it("leaves light help to the model alone", async () => {
    const complete = vi.fn(fakeModel());
    const lesson = (await enrichText({ text: article(1), help: "light", complete, lexicon: await lexiconWith() })) as Enrichment;
    expect(complete.mock.calls[0][0].messages[0].content).not.toMatch(/already explains/);
    expect(lesson.paragraphs[0].vocab.some((v) => v.lemma === "párrafo")).toBe(false);
  });

  it("works exactly as before with no lexicon", async () => {
    const complete = vi.fn(fakeModel());
    const lesson = (await enrichText({ text: article(1), help: "full", complete })) as Enrichment;
    expect(complete.mock.calls[0][0].messages[0].content).not.toMatch(/already explains/);
    expect(lesson.paragraphs[0].vocab).toHaveLength(1);
  });
});

describe("enrichText with the analysis service", () => {
  const setup = async () => {
    const { memoryStore } = await import("../../test-support/memory-lexicon");
    const m = memoryStore();
    await m.store.upsertLemmas([
      {
        language: "es", lemma: "párrafo", lemma_key: "párrafo", pos: "noun", transliteration: null, level: null,
        core_rank: 100, senses: [{ english: "paragraph", count: 1 }], source: "core", uses: 0,
      },
    ]);
    return m;
  };
  const text = "Los párrafos largos cansan a la gente que lee mucho en la ciudad todos los días del año.";
  const analyzerFor = (lemma: string) => ({
    analyze: async (_l: string, paragraphs: string[]) =>
      paragraphs.map((p) => ({
        tokens: [...p.matchAll(/\p{L}+/gu)].map((m) => ({
          text: m[0], start: m.index!, end: m.index! + m[0].length,
          lemma: m[0].toLowerCase() === "párrafos" ? lemma : m[0].toLowerCase(), pos: "noun", morph: "", is_word: true,
        })),
      })),
  });

  it("explains an inflected word from the lexicon using the analyzer's dictionary form, and remembers the form", async () => {
    const m = await setup();
    const complete = vi.fn(fakeModel());
    const lesson = (await enrichText({ text, help: "full", complete, lexicon: m.store, analyzer: analyzerFor("párrafo") })) as Enrichment;
    expect(lesson.paragraphs[0].vocab.find((v) => v.lemma === "párrafo")).toMatchObject({ surface_form: "párrafos", english: "paragraph" });
    expect(complete.mock.calls[0][0].messages[0].content).toMatch(/already explains.*párrafos/);
    expect(m.forms.has("es|párrafos|párrafo|noun")).toBe(true);
  });

  it("builds the lesson as usual when the analysis service is down", async () => {
    const m = await setup();
    const down = { analyze: async () => { throw new Error("connection refused"); } };
    const lesson = (await enrichText({ text, help: "full", complete: vi.fn(fakeModel()), lexicon: m.store, analyzer: down })) as Enrichment;
    expect(lesson.paragraphs).toHaveLength(1);
    expect(lesson.paragraphs[0].vocab.some((v) => v.lemma === "párrafo")).toBe(false);
  });
});

describe("enrichText finds Spanish grammar patterns by rules when the analysis service is up", () => {
  it("adds the patterns from the analysis, quoted from the text, and does not ask the model for them", async () => {
    const fx = (await import("../pattern-rules/fixtures-es.json")).default as unknown as { cases: { id: string; text: string; tokens: unknown[] }[] };
    const c = fx.cases.find((x) => x.id === "present_perfect" && x.text.includes("dado"))!;
    const analyzer = { analyze: async () => [{ tokens: c.tokens }] } as unknown as import("../analysis/contract").Analyzer;
    const complete = vi.fn(fakeModel());
    const lesson = (await enrichText({ text: c.text, help: "light", complete, analyzer, lexicon: (await import("../../test-support/memory-lexicon")).memoryStore().store })) as Enrichment;
    expect(lesson.paragraphs[0].patterns).toEqual([{ id: "present_perfect", quote: "ha dado" }]);
    expect(complete.mock.calls[0][0].system).not.toMatch(/The patterns are:/);
  });

  it("falls back to asking the model when the analysis service is down", async () => {
    const down = { analyze: async () => { throw new Error("down"); } };
    const complete = vi.fn(fakeModel());
    await enrichText({ text: article(1), help: "light", complete, analyzer: down });
    expect(complete.mock.calls[0][0].system).toMatch(/The patterns are:/);
  });

  it("still asks the model for patterns when there is no analysis service", async () => {
    const complete = vi.fn(fakeModel());
    await enrichText({ text: article(1), complete });
    expect(complete.mock.calls[0][0].system).toMatch(/The patterns are:/);
  });
});

describe("enrichText builds verb tables in code when the analysis service can conjugate", () => {
  const text = "Ella ha dado un regalo muy bonito a su madre en la ciudad grande.";
  const tok = (t: string, start: number, lemma: string, pos: string, morph: string) => ({ text: t, start, end: start + t.length, lemma, pos, morph, is_word: true });
  const analysis = [
    tok("Ella", 0, "ella", "pron", ""),
    tok("ha", 5, "haber", "aux", "Mood=Ind Number=Sing Person=3 Tense=Pres VerbForm=Fin"),
    tok("dado", 8, "dar", "verb", "Tense=Past VerbForm=Part"),
  ];
  const setup = async () => {
    const m = (await import("../../test-support/memory-lexicon")).memoryStore();
    await m.store.upsertLemmas([
      { language: "es", lemma: "dar", lemma_key: "dar", pos: "verb", transliteration: null, level: null, core_rank: 60, senses: [{ english: "to give", count: 1 }], source: "core", uses: 0 },
    ]);
    return m;
  };
  const conj = { lemma: "dar", irregular: true, mood: "indicativo", tense: "presente", table: { yo: "doy", tú: "das" } };

  it("puts the code-built verb first, leaves it out of the model's request, and keeps the model's other verbs", async () => {
    const m = await setup();
    const analyzer = { analyze: async () => [{ tokens: analysis }], conjugate: vi.fn(async () => [conj]) };
    const complete = vi.fn(fakeModel());
    const lesson = (await enrichText({ text, help: "light", complete, analyzer, lexicon: m.store })) as Enrichment;
    expect(analyzer.conjugate).toHaveBeenCalledWith("es", [{ lemma: "dar", morph: "Tense=Past VerbForm=Part" }]);
    expect(lesson.paragraphs[0].verbs[0]).toMatchObject({ infinitive: "dar", form_in_source: "dado", form_english: "past participle of dar (to give)", conjugation_table: { yo: "doy", tú: "das" } });
    expect(complete.mock.calls[0][0].messages[0].content).toMatch(/Verb forms the app already explains.*dado/);
  });

  it("asks the model for verbs as before when the conjugator fails", async () => {
    const m = await setup();
    const analyzer = { analyze: async () => [{ tokens: analysis }], conjugate: async () => { throw new Error("down"); } };
    const complete = vi.fn(fakeModel());
    await enrichText({ text, help: "light", complete, analyzer, lexicon: m.store });
    expect(complete.mock.calls[0][0].messages[0].content).not.toMatch(/Verb forms the app already explains/);
  });
});
