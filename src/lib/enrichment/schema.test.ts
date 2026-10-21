import { describe, expect, it } from "vitest";
import { DIALECTS, enrichmentSchema, parseEnrichment } from "./schema";

const valid = {
  summary: "A short chat about weekend plans.",
  detected_dialect: "puerto_rican",
  segments: [{ spanish: "Nos vemos mañana.", english: "See you tomorrow." }],
  vocab: [
    {
      lemma: "mañana",
      surface_form: "mañana",
      part_of_speech: "noun",
      english: "tomorrow",
      example_fragment: "nos vemos mañana",
      level: "A1",
      dialect_tags: [],
    },
  ],
  idioms: [
    {
      phrase: "estar en las nubes",
      literal_meaning: "to be in the clouds",
      actual_meaning: "to be daydreaming",
      region_tags: ["general"],
      register: "informal",
      similar_in_other_dialects: "estar en la luna",
    },
  ],
  verbs: [
    {
      infinitive: "ver",
      form_in_source: "vemos",
      tense: "present",
      mood: "indicative",
      person: "1pl",
      conjugation_table: { yo: "veo", tú: "ves", nosotros: "vemos" },
      irregular: true,
      dialect_note: "",
    },
  ],
  grammar_notes: ["Reflexive 'nos' here means 'each other'."],
};

describe("enrichmentSchema", () => {
  it("accepts a valid enrichment and defaults quiz to empty", () => {
    const parsed = enrichmentSchema.parse(valid);
    expect(parsed.quiz).toEqual([]);
    expect(parsed.segments[0].start_sec).toBeNull();
  });

  it("covers every dialect the spec names", () => {
    expect([...DIALECTS].sort()).toEqual(
      [
        "caribbean_general",
        "castilian",
        "mexican",
        "neutral_latin_american",
        "puerto_rican",
        "rioplatense",
      ].sort(),
    );
  });

  it("rejects an unknown CEFR level", () => {
    const bad = structuredClone(valid);
    bad.vocab[0].level = "Z9";
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a vocab entry missing its lemma", () => {
    const bad = structuredClone(valid) as Record<string, any>;
    delete bad.vocab[0].lemma;
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown dialect", () => {
    const bad = { ...valid, detected_dialect: "klingon" };
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("enforces the short-fragment rule on example_fragment", () => {
    const bad = structuredClone(valid);
    bad.vocab[0].example_fragment = "palabra ".repeat(40);
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("enforces the short-fragment rule on segment text", () => {
    const bad = structuredClone(valid);
    bad.segments[0].spanish = "frase larga ".repeat(40);
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });
});

describe("parseEnrichment", () => {
  it("parses plain JSON", () => {
    const result = parseEnrichment(JSON.stringify(valid));
    expect(result.ok).toBe(true);
  });

  it("strips a markdown code fence around the JSON", () => {
    const result = parseEnrichment("```json\n" + JSON.stringify(valid) + "\n```");
    expect(result.ok).toBe(true);
  });

  it("returns a readable error for non-JSON text", () => {
    const result = parseEnrichment("Lo siento, no puedo.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/json/i);
  });

  it("returns the schema issues for JSON that fails validation", () => {
    const result = parseEnrichment(JSON.stringify({ ...valid, vocab: "nope" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/vocab/);
  });
});
