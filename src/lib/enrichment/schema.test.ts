import { describe, expect, it } from "vitest";
import { enrichmentSchema, parseEnrichment, REFLEXIVE_KINDS } from "./schema";

const valid = {
  summary: "A short chat about weekend plans.",
  segments: [{ spanish: "Nos vemos mañana.", english: "See you tomorrow." }],
  vocab: [
    {
      lemma: "mañana",
      surface_form: "mañana",
      part_of_speech: "noun",
      english: "tomorrow",
      example_fragment: "nos vemos mañana",
      level: "A1",
    },
  ],
  idioms: [
    {
      phrase: "estar en las nubes",
      literal_meaning: "to be in the clouds",
      actual_meaning: "to be daydreaming",
      region_tags: ["general"],
      register: "informal",
    },
  ],
  verbs: [
    {
      infinitive: "ver",
      english: "to see",
      form_in_source: "vemos",
      form_english: "we see",
      tense: "present",
      mood: "indicative",
      person: "1pl",
      conjugation_table: { yo: "veo", tú: "ves", nosotros: "vemos" },
      irregular: true,
      reflexive: null,
    },
    {
      infinitive: "dormir",
      english: "to sleep",
      form_in_source: "se durmió",
      form_english: "he fell asleep",
      tense: "preterite",
      mood: "indicative",
      person: "3sg",
      conjugation_table: { yo: "me dormí", tú: "te dormiste", él: "se durmió" },
      irregular: true,
      reflexive: {
        infinitive_reflexive: "dormirse",
        english: "to fall asleep",
        kind: "meaning_change",
        explanation: "Adding se changes dormir (to be asleep) into the moment of falling asleep.",
      },
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

  it("lists the reflexive kinds", () => {
    expect([...REFLEXIVE_KINDS].sort()).toEqual(
      ["accidental", "impersonal", "meaning_change", "reciprocal", "reflexive"].sort(),
    );
  });

  it("rejects an unknown CEFR level", () => {
    const bad = structuredClone(valid);
    bad.vocab[0].level = "Z9";
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a vocab entry missing its lemma", () => {
    const bad = structuredClone(valid) as unknown as { vocab: Record<string, unknown>[] };
    delete bad.vocab[0].lemma;
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a verb missing its English meaning", () => {
    const bad = structuredClone(valid) as unknown as { verbs: Record<string, unknown>[] };
    delete bad.verbs[0].english;
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a verb missing the English meaning of its form", () => {
    const bad = structuredClone(valid) as unknown as { verbs: Record<string, unknown>[] };
    delete bad.verbs[0].form_english;
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("requires the reflexive key, with null for non-reflexive verbs", () => {
    const bad = structuredClone(valid) as unknown as { verbs: Record<string, unknown>[] };
    delete bad.verbs[0].reflexive;
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
    expect(enrichmentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown reflexive kind", () => {
    const bad = structuredClone(valid);
    (bad.verbs[1].reflexive as { kind: string }).kind = "mystery";
    expect(enrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a reflexive entry with no explanation", () => {
    const bad = structuredClone(valid);
    (bad.verbs[1].reflexive as { explanation: string }).explanation = "";
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
