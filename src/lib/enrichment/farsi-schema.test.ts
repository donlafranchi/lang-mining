import { describe, expect, it } from "vitest";
import { farsiEnrichmentSchema, mergeFarsiBatches, parseFarsiBatch, parseFarsiEnrichment } from "./farsi-schema";

const word = (lemma = "فردا") => ({
  lemma,
  surface: lemma,
  transliteration: "fardâ",
  part_of_speech: "adverb",
  english: "tomorrow",
  level: "A1",
  register: "neutral",
});

const verb = {
  infinitive: "دیدن",
  transliteration: "didan",
  english: "to see",
  form_in_source: "می‌بینمت",
  form_transliteration: "mibinamet",
  form_english: "I see you",
  tense: "present",
  mood: "indicative",
  person: "1sg",
  conjugation_table: { "من": "می‌بینم", "تو": "می‌بینی" },
  irregular: true,
  compound: null,
};

const compoundVerb = {
  ...verb,
  infinitive: "کار کردن",
  transliteration: "kâr kardan",
  english: "to work",
  compound: { parts: "kâr (work) + kardan (to do)", explanation: "A noun plus the light verb kardan makes a verb." },
};

const idiom = {
  phrase: "دست به کار شدن",
  transliteration: "dast be kâr shodan",
  literal_meaning: "to become hand to work",
  actual_meaning: "to get to work",
  register: "neutral",
};

const paragraphResult = (n: number) => ({
  n,
  transliteration: `transliteration of paragraph ${n}`,
  english: `English for paragraph ${n}.`,
  key_phrase: { persian: "فردا می‌بینمت", transliteration: "fardâ mibinamet", english: "I'll see you tomorrow" },
  words: structuredClone([word("فردا"), word("دیدن")]),
  verbs: structuredClone([verb, compoundVerb]),
  idioms: structuredClone([idiom]),
});

const batch = (numbers: number[]) => ({
  gist: `Gist of ${numbers.join(" and ")}.`,
  paragraphs: numbers.map(paragraphResult),
  grammar_notes: ["The -et ending is the attached pronoun 'you'."],
});

describe("parseFarsiBatch", () => {
  it("accepts a batch covering exactly the numbers sent, in any order", () => {
    expect(parseFarsiBatch(JSON.stringify(batch([1, 2])), [1, 2]).ok).toBe(true);
    expect(parseFarsiBatch(JSON.stringify(batch([2, 1])), [1, 2]).ok).toBe(true);
  });

  it("strips a markdown fence and finds JSON inside other text", () => {
    const json = JSON.stringify(batch([1]));
    expect(parseFarsiBatch("```json\n" + json + "\n```", [1]).ok).toBe(true);
    expect(parseFarsiBatch(`Here you go:\n${json}\nDone.`, [1]).ok).toBe(true);
  });

  it("rejects non-JSON", () => {
    expect(parseFarsiBatch("not json", [1]).ok).toBe(false);
  });

  it("rejects a skipped, invented or repeated paragraph", () => {
    expect(parseFarsiBatch(JSON.stringify(batch([1])), [1, 2]).ok).toBe(false);
    expect(parseFarsiBatch(JSON.stringify(batch([1, 2, 3])), [1, 2]).ok).toBe(false);
    expect(parseFarsiBatch(JSON.stringify(batch([1, 1])), [1, 2]).ok).toBe(false);
  });

  it("allows a paragraph with no words, verbs or idioms", () => {
    const empty = batch([1]);
    empty.paragraphs[0].words = [];
    empty.paragraphs[0].verbs = [];
    empty.paragraphs[0].idioms = [];
    expect(parseFarsiBatch(JSON.stringify(empty), [1]).ok).toBe(true);
  });

  it.each(["transliteration", "english", "key_phrase", "words"] as const)("rejects a paragraph missing %s", (key) => {
    const bad = batch([1]) as unknown as { paragraphs: Record<string, unknown>[] };
    delete bad.paragraphs[0][key];
    expect(parseFarsiBatch(JSON.stringify(bad), [1]).ok).toBe(false);
  });

  it.each(["lemma", "surface", "transliteration", "english", "part_of_speech", "level", "register"] as const)(
    "rejects a word missing %s",
    (key) => {
      const bad = batch([1]) as unknown as { paragraphs: { words: Record<string, unknown>[] }[] };
      delete bad.paragraphs[0].words[0][key];
      expect(parseFarsiBatch(JSON.stringify(bad), [1]).ok).toBe(false);
    },
  );

  it("rejects an unknown level or register", () => {
    const level = batch([1]);
    level.paragraphs[0].words[0].level = "Z9";
    expect(parseFarsiBatch(JSON.stringify(level), [1]).ok).toBe(false);
    const register = batch([1]);
    register.paragraphs[0].words[0].register = "street";
    expect(parseFarsiBatch(JSON.stringify(register), [1]).ok).toBe(false);
  });

  it.each(["transliteration", "form_transliteration", "form_english", "english", "compound"] as const)(
    "rejects a verb missing %s",
    (key) => {
      const bad = batch([1]) as unknown as { paragraphs: { verbs: Record<string, unknown>[] }[] };
      delete bad.paragraphs[0].verbs[0][key];
      expect(parseFarsiBatch(JSON.stringify(bad), [1]).ok).toBe(false);
    },
  );

  it("accepts compound parts as a list and joins them into one string", () => {
    const listed = batch([1]) as unknown as { paragraphs: { verbs: { compound: { parts: unknown } }[] }[] };
    listed.paragraphs[0].verbs[1].compound.parts = ["kâr (work)", "kardan (to do)"];
    const result = parseFarsiBatch(JSON.stringify(listed), [1]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.paragraphs[0].verbs[1].compound?.parts).toBe("kâr (work) + kardan (to do)");
  });

  it("rejects bad compound parts and an idiom missing its transliteration", () => {
    const bad = batch([1]) as unknown as { paragraphs: { verbs: { compound: { parts: unknown } }[]; idioms: Record<string, unknown>[] }[] };
    bad.paragraphs[0].verbs[1].compound.parts = [];
    expect(parseFarsiBatch(JSON.stringify(bad), [1]).ok).toBe(false);
    const idiomBad = batch([1]) as unknown as { paragraphs: { idioms: Record<string, unknown>[] }[] };
    delete idiomBad.paragraphs[0].idioms[0].transliteration;
    expect(parseFarsiBatch(JSON.stringify(idiomBad), [1]).ok).toBe(false);
  });

  it("allows many words per paragraph, since full help glosses every word", () => {
    const big = batch([1]);
    big.paragraphs[0].words = Array.from({ length: 50 }, (_, i) => word(`کلمه${i}`));
    expect(parseFarsiBatch(JSON.stringify(big), [1]).ok).toBe(true);
  });
});

describe("mergeFarsiBatches", () => {
  const source = ["پاراگراف اول.", "پاراگراف دوم.", "پاراگراف سوم."];

  it("attaches the source Persian to each paragraph in order and drops the number", () => {
    const b1 = parseFarsiBatch(JSON.stringify(batch([2, 1])), [1, 2]);
    const b2 = parseFarsiBatch(JSON.stringify(batch([3])), [3]);
    if (!b1.ok || !b2.ok) throw new Error("fixture invalid");
    const lesson = mergeFarsiBatches(source, [b1.data, b2.data]);
    expect(lesson.paragraphs.map((p) => p.persian)).toEqual(source);
    expect(lesson.paragraphs.map((p) => p.english)).toEqual([
      "English for paragraph 1.",
      "English for paragraph 2.",
      "English for paragraph 3.",
    ]);
    expect(lesson.paragraphs[0]).not.toHaveProperty("n");
  });

  it("joins the gists and dedupes and caps grammar notes", () => {
    const b1 = parseFarsiBatch(JSON.stringify(batch([1, 2])), [1, 2]);
    const b2 = parseFarsiBatch(JSON.stringify(batch([3])), [3]);
    if (!b1.ok || !b2.ok) throw new Error("fixture invalid");
    const lesson = mergeFarsiBatches(source, [b1.data, b2.data]);
    expect(lesson.summary).toBe("Gist of 1 and 2. Gist of 3.");
    expect(lesson.grammar_notes).toEqual(["The -et ending is the attached pronoun 'you'."]);

    const many = { ...batch([1]), grammar_notes: Array.from({ length: 10 }, (_, i) => `Note ${i}`) };
    const parsed = parseFarsiBatch(JSON.stringify(many), [1]);
    if (!parsed.ok) throw new Error("fixture invalid");
    expect(mergeFarsiBatches([source[0]], [parsed.data]).grammar_notes).toHaveLength(6);
  });

  it("throws if a paragraph has no result", () => {
    const b1 = parseFarsiBatch(JSON.stringify(batch([1])), [1]);
    if (!b1.ok) throw new Error("fixture invalid");
    expect(() => mergeFarsiBatches(source, [b1.data])).toThrow(/Paragraph 2/);
  });

  it("produces a lesson the stored schema accepts", () => {
    const b1 = parseFarsiBatch(JSON.stringify(batch([1, 2, 3])), [1, 2, 3]);
    if (!b1.ok) throw new Error("fixture invalid");
    const lesson = mergeFarsiBatches(source, [b1.data]);
    expect(farsiEnrichmentSchema.safeParse(lesson).success).toBe(true);
    expect(parseFarsiEnrichment(JSON.stringify(lesson)).ok).toBe(true);
  });

  it("rejects the old single-call Farsi lesson shape", () => {
    const old = { summary: "x", segments: [], vocab: [], idioms: [], verbs: [] };
    expect(parseFarsiEnrichment(JSON.stringify(old)).ok).toBe(false);
  });
});
