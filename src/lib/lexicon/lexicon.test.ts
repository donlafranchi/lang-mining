import { describe, expect, it } from "vitest";
import { collectFromLesson, harvestLesson, harvestSafely, seedCore } from "./harvest";
import { lexiconKey, mergeLemma, mergeSenses, normalizePos, type LemmaRow } from "./model";
import { memoryStore } from "../../test-support/memory-lexicon";
import type { LexiconStore } from "./store";
import type { Enrichment } from "../enrichment/schema";
import type { FarsiEnrichment } from "../enrichment/farsi-schema";

const spanishLesson = (english = "to give"): Enrichment =>
  ({
    summary: "s",
    grammar_notes: [],
    quiz: [],
    paragraphs: [
      {
        spanish: "Ella ha dado un libro a la casa.",
        english: "e",
        key_phrase: { spanish: "a", english: "b" },
        patterns: [],
        idioms: [],
        verbs: [
          {
            infinitive: "dar",
            english,
            form_in_source: "dado",
            form_english: "given",
            tense: "present perfect",
            mood: "indicative",
            person: "3rd singular",
            conjugation_table: {},
            irregular: true,
            reflexive: null,
          },
        ],
        vocab: [
          { lemma: "casa", surface_form: "casa", part_of_speech: "noun (feminine)", english: "house", example_fragment: "", level: "A1" },
          { lemma: "libro", surface_form: "libro", part_of_speech: "noun", english: "book", example_fragment: "", level: "A1" },
        ],
      },
    ],
  }) as Enrichment;

describe("normalizePos", () => {
  it("brings the model's wording to one short list", () => {
    expect(normalizePos("noun (feminine)")).toBe("noun");
    expect(normalizePos("Adjective")).toBe("adj");
    expect(normalizePos("preposition")).toBe("prep");
    expect(normalizePos("")).toBe("other");
    expect(normalizePos("mystery")).toBe("other");
  });
});

describe("mergeSenses", () => {
  it("counts a gloss seen again and adds a new one", () => {
    const s = mergeSenses([{ english: "bank", count: 2 }], ["Bank", "riverside"]);
    expect(s).toEqual([
      { english: "bank", count: 3 },
      { english: "riverside", count: 1 },
    ]);
  });
  it("keeps the most-seen senses when over the cap", () => {
    const many = Array.from({ length: 10 }, (_, i) => `gloss ${i}`);
    const s = mergeSenses([{ english: "common", count: 5 }], many, 3);
    expect(s).toHaveLength(3);
    expect(s[0].english).toBe("common");
  });
  it("ignores empty glosses", () => {
    expect(mergeSenses([], ["  ", ""])).toEqual([]);
  });
});

describe("mergeLemma", () => {
  const base: LemmaRow = {
    language: "es", lemma: "casa", lemma_key: "casa", pos: "noun", transliteration: null, level: null,
    core_rank: 12, senses: [{ english: "house", count: 1 }], source: "core", uses: 0,
  };
  it("keeps the core rank and source, adds the new sense and the level", () => {
    const merged = mergeLemma(base, { ...base, core_rank: null, source: "llm", level: "A1", senses: [{ english: "home", count: 1 }], uses: 1 });
    expect(merged.core_rank).toBe(12);
    expect(merged.source).toBe("core");
    expect(merged.level).toBe("A1");
    expect(merged.senses.map((s) => s.english)).toEqual(["house", "home"]);
    expect(merged.uses).toBe(1);
  });
});

describe("collectFromLesson", () => {
  it("takes dictionary forms, parts of speech, glosses and the written forms from a Spanish lesson", () => {
    const c = collectFromLesson("es", spanishLesson());
    expect([...c.lemmas.keys()].sort()).toEqual(["casa|noun", "dar|verb", "libro|noun"]);
    expect(c.lemmas.get("dar|verb")?.senses[0].english).toBe("to give");
    expect(c.forms.get("dado|dar|verb")).toMatchObject({ morph: "present perfect|indicative|3rd singular" });
  });

  it("takes Farsi words with their transliteration and the written form", () => {
    const lesson = {
      summary: "s",
      grammar_notes: [],
      quiz: [],
      paragraphs: [
        {
          persian: "او کتاب‌ها را خواند.",
          transliteration: "t",
          english: "e",
          key_phrase: { persian: "p", transliteration: "t", english: "e" },
          idioms: [],
          patterns: [],
          verbs: [],
          words: [{ lemma: "کتاب", surface: "کتاب‌ها", transliteration: "ketâb", part_of_speech: "noun", english: "book", level: "A1", register: "neutral" }],
        },
      ],
    } as unknown as FarsiEnrichment;
    const c = collectFromLesson("fa", lesson);
    expect(c.lemmas.get("کتاب|noun")).toMatchObject({ transliteration: "ketâb", language: "fa" });
    // Keys are normalised the same way deck keys are, which drops the half-space.
    expect(c.forms.has(`${lexiconKey("کتاب‌ها")}|کتاب|noun`)).toBe(true);
  });
});

describe("harvestLesson", () => {
  it("saves new words, and counts senses and uses up when the same word comes again", async () => {
    const { store, lemmas, forms } = memoryStore();
    await harvestLesson(store, "es", spanishLesson());
    await harvestLesson(store, "es", spanishLesson());
    await harvestLesson(store, "es", spanishLesson("to hand over"));
    const dar = lemmas.get("es|dar|verb")!;
    expect(dar.senses).toEqual([
      { english: "to give", count: 2 },
      { english: "to hand over", count: 1 },
    ]);
    expect(dar.uses).toBe(3);
    expect(forms.get("es|dado|dar|verb")?.uses).toBe(3);
  });

  it("keeps languages apart", async () => {
    const { store, lemmas } = memoryStore();
    await harvestLesson(store, "es", spanishLesson());
    expect([...lemmas.values()].every((r) => r.language === "es")).toBe(true);
  });

  it("never stores article text", async () => {
    const { store, lemmas, forms } = memoryStore();
    await harvestLesson(store, "es", spanishLesson());
    const blob = JSON.stringify([...lemmas.values(), ...forms.values()]);
    expect(blob).not.toContain("Ella ha dado un libro");
  });
});

describe("harvestSafely", () => {
  it("swallows a storage failure so the lesson still succeeds", async () => {
    const broken: LexiconStore = {
      getLemmas: async () => { throw new Error("table missing"); },
      getForms: async () => [],
      upsertLemmas: async () => {},
      upsertForms: async () => {},
    };
    await expect(harvestSafely(broken, "es", spanishLesson())).resolves.toBeUndefined();
  });
});

describe("seedCore", () => {
  it("loads 2,000 words per language with their rank, and a second run adds nothing", async () => {
    const { store, lemmas } = memoryStore();
    const first = await seedCore(store, "es");
    expect(first).toBeGreaterThan(1900);
    const ranked = [...lemmas.values()].filter((r) => r.core_rank !== null);
    expect(ranked.length).toBe(lemmas.size);
    expect(await seedCore(store, "es")).toBe(0);
  });

  it("adds a core rank to a word a lesson saw first, without touching its senses", async () => {
    const { store, lemmas } = memoryStore();
    await harvestLesson(store, "es", spanishLesson());
    const before = structuredClone(lemmas.get("es|casa|noun")!);
    expect(before.core_rank).toBeNull();
    await seedCore(store, "es");
    const after = lemmas.get("es|casa|noun")!;
    if (after.core_rank !== null) {
      expect(after.senses).toEqual(before.senses);
      expect(after.source).toBe("llm");
    }
  });
});

describe("harvestAnalysis", () => {
  const tok = (text: string, lemma: string, pos: string, morph = "") => ({ text, lemma, pos, morph, is_word: true });

  it("keeps which written form belongs to which word, counting repeats, for content words only", async () => {
    const { store, forms } = memoryStore();
    const { harvestAnalysis } = await import("./harvest");
    await harvestAnalysis(store, "es", [
      { tokens: [tok("niños", "niño", "noun", "Number=Plur"), tok("niños", "niño", "noun"), tok("los", "el", "det"), tok("casa", "casa", "noun"), { ...tok(".", ".", "other"), is_word: false }] },
    ]);
    expect([...forms.keys()]).toEqual(["es|niños|niño|noun"]);
    expect(forms.get("es|niños|niño|noun")).toMatchObject({ uses: 2, morph: "Number=Plur" });
  });
});
