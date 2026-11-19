import { describe, expect, it } from "vitest";
import { memoryStore } from "../../test-support/memory-lexicon";
import { importDictionary } from "./dictionary-import";
import { lookupTokens } from "./lookup";
import { parseWiktionaryLine } from "./wiktionary";

const line = (o: unknown) => JSON.stringify(o);

const casa = line({
  word: "casa",
  pos: "noun",
  senses: [{ glosses: ["house"] }, { glosses: ["home"] }, { glosses: ["firm, company"], tags: ["rare"] }, { glosses: ["house"] }],
  forms: [{ form: "casas", tags: ["plural"] }, { form: "casa", tags: ["canonical"] }],
});
const dado = line({
  word: "dado",
  pos: "verb",
  senses: [{ glosses: ["past participle of dar"], tags: ["form-of", "participle", "past"], form_of: [{ word: "dar" }] }],
});
const dar = line({ word: "dar", pos: "verb", senses: [{ glosses: ["to give"] }, { glosses: ["to hand over"] }] });

describe("parseWiktionaryLine", () => {
  it("takes a dictionary word's senses, dropping repeats and rare senses, and its own listed forms", () => {
    const e = parseWiktionaryLine("es", casa)!;
    expect(e.lemma).toMatchObject({ lemma: "casa", pos: "noun", source: "dictionary" });
    expect(e.lemma!.senses.map((s) => s.english)).toEqual(["house", "home"]);
    expect(e.forms.map((f) => f.form_key)).toEqual(["casas"]);
    expect(e.forms[0]).toMatchObject({ lemma_key: "casa", pos: "noun", morph: "plural" });
  });

  it("reads an inflected-form entry as a form of its dictionary word, not as a word", () => {
    const e = parseWiktionaryLine("es", dado)!;
    expect(e.lemma).toBeUndefined();
    expect(e.forms[0]).toMatchObject({ form_key: "dado", lemma_key: "dar", pos: "verb", morph: "participle past" });
  });

  it("skips names, phrases, multi-word Spanish entries, empty senses and bad lines", () => {
    expect(parseWiktionaryLine("es", line({ word: "Madrid", pos: "name", senses: [{ glosses: ["Madrid"] }] }))).toBeNull();
    expect(parseWiktionaryLine("es", line({ word: "a pesar de", pos: "prep", senses: [{ glosses: ["despite"] }] }))).toBeNull();
    expect(parseWiktionaryLine("es", line({ word: "x", pos: "noun", senses: [] }))).toBeNull();
    expect(parseWiktionaryLine("es", "not json")).toBeNull();
    expect(parseWiktionaryLine("es", line({ pos: "noun" }))).toBeNull();
  });

  it("takes Persian transliteration from the romanization form and allows two-word verbs", () => {
    const e = parseWiktionaryLine(
      "fa",
      line({
        word: "کار کردن",
        pos: "verb",
        senses: [{ glosses: ["to work"] }],
        forms: [{ form: "kâr kardan", tags: ["romanization"] }],
      }),
    )!;
    expect(e.lemma).toMatchObject({ lemma: "کار کردن", transliteration: "kâr kardan", language: "fa" });
    expect(e.forms).toEqual([]);
  });

  it("maps the extract's part-of-speech names", () => {
    expect(parseWiktionaryLine("es", line({ word: "ay", pos: "intj", senses: [{ glosses: ["ouch"] }] }))!.lemma?.pos).toBe("interj");
    expect(parseWiktionaryLine("es", line({ word: "rojo", pos: "adj", senses: [{ glosses: ["red"] }] }))!.lemma?.pos).toBe("adj");
  });
});

async function* lines(items: string[]) {
  for (const l of items) yield l;
}

describe("importDictionary", () => {
  it("loads words and forms so a later lookup finds an inflected form with its senses", async () => {
    const { store } = memoryStore();
    const counts = await importDictionary(store, "es", lines([casa, dado, dar, "garbage", ""]));
    expect(counts).toMatchObject({ lines: 4, lemmas: 2, forms: 2, skipped: 1 });
    const known = await lookupTokens(store, "es", ["dado", "casas"]);
    expect(known.get("dado")).toMatchObject({ lemma: "dar", senses: ["to give", "to hand over"] });
    expect(known.get("casas")).toMatchObject({ lemma: "casa", senses: ["house", "home"] });
  });

  it("keeps a core rank and the model's senses already in the lexicon, and adds the dictionary's", async () => {
    const { store, lemmas } = memoryStore();
    await store.upsertLemmas([
      { language: "es", lemma: "casa", lemma_key: "casa", pos: "noun", transliteration: null, level: "A1", core_rank: 40, senses: [{ english: "household", count: 4 }], source: "core", uses: 7 },
    ]);
    await importDictionary(store, "es", lines([casa]));
    const row = lemmas.get("es|casa|noun")!;
    expect(row.core_rank).toBe(40);
    expect(row.source).toBe("core");
    expect(row.senses.map((s) => s.english)).toEqual(["household", "house", "home"]);
  });

  it("stops at the limit", async () => {
    const { store } = memoryStore();
    const counts = await importDictionary(store, "es", lines([casa, dar, dado]), { limit: 2 });
    expect(counts.lines).toBe(2);
  });
});
