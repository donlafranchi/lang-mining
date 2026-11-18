import { describe, expect, it } from "vitest";
import { parseFarsiEnrichment } from "./farsi-schema";

const valid = {
  summary: "A short chat about the weekend.",
  segments: [{ persian: "فردا می‌بینمت.", transliteration: "fardâ mibinamet.", english: "I'll see you tomorrow." }],
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
  idioms: [
    {
      phrase: "دست به کار شدن",
      transliteration: "dast be kâr shodan",
      literal_meaning: "to become hand to work",
      actual_meaning: "to get to work",
      register: "neutral",
    },
  ],
  verbs: [
    {
      infinitive: "دیدن",
      transliteration: "didan",
      english: "to see",
      form_in_source: "می‌بینمت",
      form_transliteration: "mibinamet",
      form_english: "I see you",
      tense: "present",
      mood: "indicative",
      person: "1sg",
      conjugation_table: { "من": "می‌بینم", "تو": "می‌بینی", "او": "می‌بیند" },
      irregular: true,
      compound: null,
    },
    {
      infinitive: "کار کردن",
      transliteration: "kâr kardan",
      english: "to work",
      form_in_source: "کار می‌کنم",
      form_transliteration: "kâr mikonam",
      form_english: "I work",
      tense: "present",
      mood: "indicative",
      person: "1sg",
      conjugation_table: { "من": "کار می‌کنم" },
      irregular: true,
      compound: {
        parts: "kâr (work) + kardan (to do)",
        explanation: "A noun plus the light verb kardan makes a verb. Only kardan changes with tense and person.",
      },
    },
  ],
  grammar_notes: ["The -et ending is the attached pronoun 'you'."],
};

describe("parseFarsiEnrichment", () => {
  it("accepts a valid Farsi enrichment and defaults quiz to empty", () => {
    const result = parseFarsiEnrichment(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.quiz).toEqual([]);
  });

  it("strips a markdown fence around the JSON", () => {
    expect(parseFarsiEnrichment("```json\n" + JSON.stringify(valid) + "\n```").ok).toBe(true);
  });

  it("rejects non-JSON", () => {
    const result = parseFarsiEnrichment("not json");
    expect(result.ok).toBe(false);
  });

  it.each([
    ["vocab", "transliteration"],
    ["vocab", "english"],
    ["vocab", "register"],
    ["segments", "transliteration"],
    ["segments", "english"],
    ["verbs", "transliteration"],
    ["verbs", "form_transliteration"],
    ["verbs", "form_english"],
    ["verbs", "english"],
    ["verbs", "compound"],
    ["idioms", "transliteration"],
  ] as const)("rejects %s entries missing %s", (list, key) => {
    const bad = structuredClone(valid) as unknown as Record<string, Record<string, unknown>[]>;
    delete bad[list][0][key];
    expect(parseFarsiEnrichment(JSON.stringify(bad)).ok).toBe(false);
  });

  it("rejects an unknown register", () => {
    const bad = structuredClone(valid);
    bad.vocab[0].register = "street";
    expect(parseFarsiEnrichment(JSON.stringify(bad)).ok).toBe(false);
  });

  it("accepts compound parts as a list and joins them into one string", () => {
    const listed = structuredClone(valid) as unknown as { verbs: { compound: { parts: unknown } }[] };
    listed.verbs[1].compound.parts = ["kâr (work)", "kardan (to do)"];
    const result = parseFarsiEnrichment(JSON.stringify(listed));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.verbs[1].compound?.parts).toBe("kâr (work) + kardan (to do)");
  });

  it("keeps compound parts given as a string unchanged", () => {
    const result = parseFarsiEnrichment(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.verbs[1].compound?.parts).toBe("kâr (work) + kardan (to do)");
  });

  it.each([[[]], [[""]], [["ok", ""]], [[1, 2]], [42], [null]])("rejects compound parts %j", (parts) => {
    const bad = structuredClone(valid) as unknown as { verbs: { compound: { parts: unknown } }[] };
    bad.verbs[1].compound.parts = parts;
    expect(parseFarsiEnrichment(JSON.stringify(bad)).ok).toBe(false);
  });

  it("rejects a compound block with no explanation", () => {
    const bad = structuredClone(valid);
    (bad.verbs[1].compound as { explanation: string }).explanation = "";
    expect(parseFarsiEnrichment(JSON.stringify(bad)).ok).toBe(false);
  });

  it("enforces the short-fragment rule", () => {
    const bad = structuredClone(valid);
    bad.vocab[0].example_fragment = "کلمه ".repeat(60);
    expect(parseFarsiEnrichment(JSON.stringify(bad)).ok).toBe(false);
    const bad2 = structuredClone(valid);
    bad2.segments[0].persian = "جمله ".repeat(60);
    expect(parseFarsiEnrichment(JSON.stringify(bad2)).ok).toBe(false);
  });

  it("does not accept a Spanish-shaped response", () => {
    const spanish = { summary: "x", segments: [{ spanish: "Hola.", english: "Hello." }], vocab: [], idioms: [], verbs: [] };
    expect(parseFarsiEnrichment(JSON.stringify(spanish)).ok).toBe(false);
  });
});
