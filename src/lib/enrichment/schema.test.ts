import { describe, expect, it } from "vitest";
import { enrichmentSchema, mergeBatches, parseBatch, parseEnrichment, REFLEXIVE_KINDS } from "./schema";

const verb = {
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
};

const reflexiveVerb = {
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
};

const vocab = {
  lemma: "mañana",
  surface_form: "mañana",
  part_of_speech: "noun",
  english: "tomorrow",
  example_fragment: "nos vemos mañana",
  level: "A1",
};

const idiom = {
  phrase: "estar en las nubes",
  literal_meaning: "to be in the clouds",
  actual_meaning: "to be daydreaming",
  region_tags: ["general"],
  register: "informal",
};

const paragraphResult = (n: number) => ({
  n,
  english: `Translation of paragraph ${n}.`,
  key_phrase: { spanish: "nos vemos mañana", english: "see you tomorrow" },
  // Cloned so a test that mutates one batch cannot leak into the next.
  verbs: structuredClone([verb, reflexiveVerb]),
  vocab: structuredClone([vocab]),
  idioms: structuredClone([idiom]),
});

const batch = (numbers: number[]) => ({
  gist: `Gist of ${numbers.join(" and ")}.`,
  paragraphs: numbers.map(paragraphResult),
  grammar_notes: ["Reflexive 'nos' here means 'each other'."],
});

describe("parseBatch", () => {
  it("accepts a batch that covers exactly the numbers sent, in any order", () => {
    expect(parseBatch(JSON.stringify(batch([1, 2])), [1, 2]).ok).toBe(true);
    expect(parseBatch(JSON.stringify(batch([2, 1])), [1, 2]).ok).toBe(true);
  });

  it("strips a markdown fence", () => {
    expect(parseBatch("```json\n" + JSON.stringify(batch([1])) + "\n```", [1]).ok).toBe(true);
  });

  it("rejects non-JSON", () => {
    const result = parseBatch("Lo siento, no puedo.", [1]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/json/i);
  });

  it("finds the JSON when the model adds a sentence before or after it", () => {
    const json = JSON.stringify(batch([1]));
    expect(parseBatch(`Here is the JSON you asked for:\n${json}\nHope that helps!`, [1]).ok).toBe(true);
    expect(parseBatch(`Claro.\n\n\`\`\`json\n${json}\n\`\`\``, [1]).ok).toBe(true);
  });

  it("says when the output looks cut off, and shows how it started and ended", () => {
    const json = JSON.stringify(batch([1]));
    const cut = json.slice(0, Math.floor(json.length / 2));
    const result = parseBatch(cut, [1]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/cut off/i);
      expect(result.error).toContain(cut.slice(0, 20));
    }
  });

  it("does not say cut off for plain prose", () => {
    const result = parseBatch("Lo siento, no puedo ayudar con eso.", [1]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/cut off/i);
      expect(result.error).toContain("Lo siento");
    }
  });

  it("rejects a skipped paragraph", () => {
    const result = parseBatch(JSON.stringify(batch([1])), [1, 2]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expected exactly 1, 2/i);
  });

  it("rejects an invented paragraph", () => {
    expect(parseBatch(JSON.stringify(batch([1, 2, 3])), [1, 2]).ok).toBe(false);
  });

  it("rejects a repeated paragraph", () => {
    const result = parseBatch(JSON.stringify(batch([1, 1])), [1, 2]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/repeat/i);
  });

  it("rejects wrong numbers from a later batch", () => {
    expect(parseBatch(JSON.stringify(batch([1, 2])), [6, 7]).ok).toBe(false);
  });

  it("lists the reflexive kinds", () => {
    expect([...REFLEXIVE_KINDS].sort()).toEqual(
      ["accidental", "impersonal", "meaning_change", "reciprocal", "reflexive"].sort(),
    );
  });

  it.each(["english", "key_phrase"] as const)("rejects a paragraph missing %s", (key) => {
    const bad = batch([1]) as unknown as { paragraphs: Record<string, unknown>[] };
    delete bad.paragraphs[0][key];
    expect(parseBatch(JSON.stringify(bad), [1]).ok).toBe(false);
  });

  it("rejects a batch missing its gist", () => {
    const bad = batch([1]) as unknown as Record<string, unknown>;
    delete bad.gist;
    expect(parseBatch(JSON.stringify(bad), [1]).ok).toBe(false);
  });

  it.each(["english", "form_english"] as const)("rejects a verb missing %s", (key) => {
    const bad = batch([1]) as unknown as { paragraphs: { verbs: Record<string, unknown>[] }[] };
    delete bad.paragraphs[0].verbs[0][key];
    expect(parseBatch(JSON.stringify(bad), [1]).ok).toBe(false);
  });

  it("requires the reflexive key on every verb, with null allowed", () => {
    const bad = batch([1]) as unknown as { paragraphs: { verbs: Record<string, unknown>[] }[] };
    delete bad.paragraphs[0].verbs[0].reflexive;
    expect(parseBatch(JSON.stringify(bad), [1]).ok).toBe(false);
  });

  it("rejects an unknown reflexive kind and an empty explanation", () => {
    const kind = batch([1]);
    (kind.paragraphs[0].verbs[1].reflexive as { kind: string }).kind = "mystery";
    expect(parseBatch(JSON.stringify(kind), [1]).ok).toBe(false);
    const expl = batch([1]);
    (expl.paragraphs[0].verbs[1].reflexive as { explanation: string }).explanation = "";
    expect(parseBatch(JSON.stringify(expl), [1]).ok).toBe(false);
  });

  it("rejects an unknown CEFR level and a vocab entry missing its lemma", () => {
    const level = batch([1]);
    level.paragraphs[0].vocab[0].level = "Z9";
    expect(parseBatch(JSON.stringify(level), [1]).ok).toBe(false);
    const lemma = batch([1]) as unknown as { paragraphs: { vocab: Record<string, unknown>[] }[] };
    delete lemma.paragraphs[0].vocab[0].lemma;
    expect(parseBatch(JSON.stringify(lemma), [1]).ok).toBe(false);
  });

  it("allows an empty vocab example, which full and medium help use", () => {
    const empty = batch([1]);
    empty.paragraphs[0].vocab[0].example_fragment = "";
    expect(parseBatch(JSON.stringify(empty), [1]).ok).toBe(true);
  });

  it("still enforces the short-fragment rule on vocab examples", () => {
    const bad = batch([1]);
    bad.paragraphs[0].vocab[0].example_fragment = "palabra ".repeat(40);
    expect(parseBatch(JSON.stringify(bad), [1]).ok).toBe(false);
  });

  it("allows long paragraph translations, since full paragraphs are stored", () => {
    const long = batch([1]);
    long.paragraphs[0].english = "A long translated paragraph. ".repeat(60);
    expect(parseBatch(JSON.stringify(long), [1]).ok).toBe(true);
  });
});

describe("mergeBatches", () => {
  const source = ["Primer párrafo del texto.", "Segundo párrafo del texto.", "Tercer párrafo del texto."];

  it("attaches the source Spanish to each paragraph, in order", () => {
    const b1 = parseBatch(JSON.stringify(batch([2, 1])), [1, 2]);
    const b2 = parseBatch(JSON.stringify(batch([3])), [3]);
    if (!b1.ok || !b2.ok) throw new Error("fixture invalid");
    const lesson = mergeBatches(source, [b1.data, b2.data]);
    expect(lesson.paragraphs.map((p) => p.spanish)).toEqual(source);
    expect(lesson.paragraphs.map((p) => p.english)).toEqual([
      "Translation of paragraph 1.",
      "Translation of paragraph 2.",
      "Translation of paragraph 3.",
    ]);
    expect(lesson.paragraphs[0]).not.toHaveProperty("n");
  });

  it("joins the gists into the summary and dedupes grammar notes", () => {
    const b1 = parseBatch(JSON.stringify(batch([1, 2])), [1, 2]);
    const b2 = parseBatch(JSON.stringify(batch([3])), [3]);
    if (!b1.ok || !b2.ok) throw new Error("fixture invalid");
    const lesson = mergeBatches(source, [b1.data, b2.data]);
    expect(lesson.summary).toBe("Gist of 1 and 2. Gist of 3.");
    expect(lesson.grammar_notes).toEqual(["Reflexive 'nos' here means 'each other'."]);
  });

  it("caps grammar notes at six", () => {
    const many = { ...batch([1]), grammar_notes: Array.from({ length: 10 }, (_, i) => `Note ${i}`) };
    const parsed = parseBatch(JSON.stringify(many), [1]);
    if (!parsed.ok) throw new Error("fixture invalid");
    expect(mergeBatches([source[0]], [parsed.data]).grammar_notes).toHaveLength(6);
  });

  it("throws if a paragraph has no result", () => {
    const b1 = parseBatch(JSON.stringify(batch([1])), [1]);
    if (!b1.ok) throw new Error("fixture invalid");
    expect(() => mergeBatches(source, [b1.data])).toThrow(/Paragraph 2/);
  });

  it("produces a lesson the stored schema accepts", () => {
    const b1 = parseBatch(JSON.stringify(batch([1, 2, 3])), [1, 2, 3]);
    if (!b1.ok) throw new Error("fixture invalid");
    const lesson = mergeBatches(source, [b1.data]);
    expect(enrichmentSchema.safeParse(lesson).success).toBe(true);
    expect(parseEnrichment(JSON.stringify(lesson)).ok).toBe(true);
  });

  it("rejects the old lesson shape", () => {
    const old = { summary: "x", segments: [], vocab: [], idioms: [], verbs: [] };
    expect(parseEnrichment(JSON.stringify(old)).ok).toBe(false);
  });
});

describe("grammar patterns on a paragraph", () => {
  const base = {
    gist: "g",
    grammar_notes: [],
    paragraphs: [
      { n: 1, english: "e", key_phrase: { spanish: "a", english: "b" }, verbs: [], vocab: [], idioms: [] },
    ],
  };

  it("reads a paragraph with no patterns key as having none (older answers and lessons)", () => {
    const r = parseBatch(JSON.stringify(base), [1]);
    expect(r.ok && r.data.paragraphs[0].patterns).toEqual([]);
  });

  it("keeps the patterns the model tagged", () => {
    const withPattern = {
      ...base,
      paragraphs: [{ ...base.paragraphs[0], patterns: [{ id: "present_perfect", quote: "ha dado" }] }],
    };
    const r = parseBatch(JSON.stringify(withPattern), [1]);
    expect(r.ok && r.data.paragraphs[0].patterns).toEqual([{ id: "present_perfect", quote: "ha dado" }]);
  });
});

describe("Spanish prompt", () => {
  it("asks for patterns and lists the catalog ids", async () => {
    const { buildSystemPrompt } = await import("./prompt");
    const prompt = buildSystemPrompt("es", "light");
    expect(prompt).toMatch(/patterns/);
    expect(prompt).toMatch(/present_perfect/);
    expect(prompt).toMatch(/ha dado/);
  });
});

describe("full help lists every word", () => {
  it("accepts a paragraph with far more than 12 vocab entries and 8 verbs", () => {
    const word = (i: number) => ({
      lemma: `palabra${i}`,
      surface_form: `palabra${i}`,
      part_of_speech: "noun",
      english: "word",
      example_fragment: "una palabra",
      level: "A1",
    });
    const verb = (i: number) => ({
      infinitive: `hablar${i}`,
      english: "to talk",
      form_in_source: "habla",
      form_english: "talks",
      tense: "present",
      mood: "indicative",
      person: "3rd singular",
      conjugation_table: { él: "habla" },
      irregular: false,
      reflexive: null,
    });
    const raw = JSON.stringify({
      gist: "g",
      grammar_notes: [],
      paragraphs: [
        {
          n: 1,
          english: "e",
          key_phrase: { spanish: "a", english: "b" },
          verbs: Array.from({ length: 8 }, (_, i) => verb(i)),
          vocab: Array.from({ length: 40 }, (_, i) => word(i)),
          idioms: [],
        },
      ],
    });
    const r = parseBatch(raw, [1]);
    expect(r.ok).toBe(true);
  });
});

describe("model title", () => {
  const para = { n: 1, english: "e", key_phrase: { spanish: "a", english: "b" }, verbs: [], vocab: [], idioms: [] };

  it("is optional in a batch answer", () => {
    expect(parseBatch(JSON.stringify({ gist: "g", grammar_notes: [], paragraphs: [para] }), [1]).ok).toBe(true);
  });

  it("is carried into the merged lesson from the first batch that has one", () => {
    const a = { gist: "a", grammar_notes: [], paragraphs: [{ ...para, patterns: [] }] };
    const b = { gist: "b", grammar_notes: [], title: "The island", paragraphs: [{ ...para, n: 2, patterns: [] }] };
    const lesson = mergeBatches(["uno", "dos"], [a, b]);
    expect(lesson.title).toBe("The island");
  });
});
