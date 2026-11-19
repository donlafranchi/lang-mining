import { describe, expect, it } from "vitest";
import { memoryStore } from "../../test-support/memory-lexicon";
import type { FormRow, LemmaRow } from "./model";
import type { LexiconStore } from "./store";
import { knownToFarsiWord, knownToVocab, levelFromRank, lookupTokens, orderByAppearance, splitKnown } from "./lookup";

const lemma = (over: Partial<LemmaRow> & { lemma: string }): LemmaRow => ({
  language: "es",
  lemma_key: over.lemma.toLowerCase(),
  pos: "noun",
  transliteration: null,
  level: null,
  core_rank: null,
  senses: [{ english: "thing", count: 1 }],
  source: "llm",
  uses: 1,
  ...over,
});
const form = (over: Partial<FormRow> & { form_key: string; lemma_key: string }): FormRow => ({ language: "es", pos: "noun", morph: "", uses: 1, ...over });

async function seeded() {
  const m = memoryStore();
  await m.store.upsertLemmas([
    lemma({ lemma: "casa", core_rank: 50, senses: [{ english: "house", count: 3 }, { english: "home", count: 1 }] }),
    lemma({ lemma: "dar", pos: "verb", core_rank: 20, senses: [{ english: "to give", count: 2 }] }),
    lemma({ lemma: "de", pos: "prep", core_rank: 1, senses: [{ english: "of", count: 1 }] }),
  ]);
  await m.store.upsertForms([form({ form_key: "dado", lemma_key: "dar", pos: "verb" })]);
  return m.store;
}

describe("lookupTokens", () => {
  it("finds a word by its dictionary form and by a known inflected form, with every sense", async () => {
    const known = await lookupTokens(await seeded(), "es", ["Casa", "dado", "zorro"]);
    expect(known.get("casa")).toMatchObject({ lemma: "casa", senses: ["house", "home"], core_rank: 50 });
    expect(known.get("dado")).toMatchObject({ lemma: "dar", pos: "verb" });
    expect(known.has("zorro")).toBe(false);
  });

  it("prefers the most used reading when a form could be two words", async () => {
    const m = memoryStore();
    await m.store.upsertLemmas([
      lemma({ lemma: "vino", pos: "noun", senses: [{ english: "wine", count: 1 }] }),
      lemma({ lemma: "venir", pos: "verb", senses: [{ english: "to come", count: 1 }] }),
    ]);
    await m.store.upsertForms([
      form({ form_key: "vino", lemma_key: "vino", pos: "noun", uses: 5 }),
      form({ form_key: "vino", lemma_key: "venir", pos: "verb", uses: 2 }),
    ]);
    expect((await lookupTokens(m.store, "es", ["vino"])).get("vino")?.lemma).toBe("vino");
  });

  it("treats a storage failure as knowing nothing instead of failing", async () => {
    const broken: LexiconStore = {
      getForms: async () => { throw new Error("table missing"); },
      getLemmas: async () => [],
      upsertLemmas: async () => {},
      upsertForms: async () => {},
    };
    expect((await lookupTokens(broken, "es", ["casa"])).size).toBe(0);
  });

  it("keeps languages apart", async () => {
    expect((await lookupTokens(await seeded(), "fa", ["casa"])).size).toBe(0);
  });
});

describe("splitKnown", () => {
  const text = "La casa de Ana ha dado un zorro.";
  it("explains every known word at full help and tells the model to skip them", async () => {
    const known = await lookupTokens(await seeded(), "es", ["casa", "de", "dado"]);
    const { explain, skip } = splitKnown(text, known, "full");
    expect(explain.map((e) => e.token)).toEqual(["casa", "de", "dado"]);
    expect(skip).toEqual(["casa", "de", "dado"]);
  });
  it("explains only content words at medium, but still skips all known words", async () => {
    const known = await lookupTokens(await seeded(), "es", ["casa", "de", "dado"]);
    const { explain, skip } = splitKnown(text, known, "medium");
    expect(explain.map((e) => e.token)).toEqual(["casa", "dado"]);
    expect(skip).toContain("de");
  });
  it("leaves light help entirely to the model", async () => {
    const known = await lookupTokens(await seeded(), "es", ["casa"]);
    expect(splitKnown(text, known, "light")).toEqual({ explain: [], skip: [] });
  });
});

describe("entries from the lexicon", () => {
  const k = { lemma: "casa", pos: "noun", senses: ["house", "home"], transliteration: null, level: null, core_rank: 50 };
  it("builds a Spanish vocab entry with every sense and a level from the rank", () => {
    expect(knownToVocab("casas", k)).toEqual({
      lemma: "casa", surface_form: "casas", part_of_speech: "noun", english: "house", example_fragment: "", level: "A1", senses: ["house", "home"],
    });
  });
  it("omits senses when there is only one", () => {
    expect(knownToVocab("casa", { ...k, senses: ["house"] })).not.toHaveProperty("senses");
  });
  it("builds a Farsi word with the stored transliteration", () => {
    const w = knownToFarsiWord("کتاب", { ...k, lemma: "کتاب", transliteration: "ketâb" });
    expect(w).toMatchObject({ lemma: "کتاب", transliteration: "ketâb", register: "neutral" });
  });
  it("maps rank to a level", () => {
    expect([levelFromRank(10), levelFromRank(500), levelFromRank(1200), levelFromRank(1900), levelFromRank(null)]).toEqual(["A1", "A2", "B1", "B2", "B1"]);
  });
});

describe("orderByAppearance", () => {
  it("orders by first appearance and drops repeated dictionary forms", () => {
    const entries = [
      { lemma: "perro", s: "perro" },
      { lemma: "casa", s: "casa" },
      { lemma: "casa", s: "casas" },
    ];
    expect(orderByAppearance("La casa y el perro", entries, (e) => e.s).map((e) => e.lemma)).toEqual(["casa", "perro"]);
  });
});

describe("lookupTokens with analyzer hints", () => {
  it("resolves an inflected form the lexicon never saw, through the analyzer's dictionary form", async () => {
    const store = await seeded();
    const without = await lookupTokens(store, "es", ["casas"]);
    expect(without.has("casas")).toBe(false);
    const hints = new Map([["casas", { lemma: "casa", pos: "noun" }]]);
    const withHints = await lookupTokens(store, "es", ["casas"], hints);
    expect(withHints.get("casas")).toMatchObject({ lemma: "casa", senses: ["house", "home"] });
  });

  it("lets the analyzer settle a form that stored forms could read two ways", async () => {
    const m = memoryStore();
    await m.store.upsertLemmas([
      lemma({ lemma: "vino", pos: "noun", senses: [{ english: "wine", count: 1 }] }),
      lemma({ lemma: "venir", pos: "verb", senses: [{ english: "to come", count: 1 }] }),
    ]);
    await m.store.upsertForms([form({ form_key: "vino", lemma_key: "vino", pos: "noun", uses: 5 })]);
    const hints = new Map([["vino", { lemma: "venir", pos: "verb" }]]);
    expect((await lookupTokens(m.store, "es", ["vino"], hints)).get("vino")?.lemma).toBe("venir");
  });

  it("does not remap function words through the analyzer", async () => {
    const m = memoryStore();
    await m.store.upsertLemmas([
      lemma({ lemma: "lo", pos: "pron", senses: [{ english: "it, him", count: 1 }] }),
      lemma({ lemma: "él", pos: "pron", senses: [{ english: "he", count: 1 }] }),
    ]);
    const hints = new Map([["lo", { lemma: "él", pos: "pron" }]]);
    expect((await lookupTokens(m.store, "es", ["lo"], hints)).get("lo")?.lemma).toBe("lo");
  });
});
