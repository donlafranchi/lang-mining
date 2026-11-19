import { defaultHelp, type HelpLevel } from "../help";
import type { Language } from "../languages";

const SPANISH_WORDS_RULE: Record<HelpLevel, string> = {
  full: "an entry for EVERY distinct word in the paragraph, including small words like el, la, de, que, y and en, so the learner can see what each word means. List them in the order they first appear and give each word once per paragraph",
  medium:
    "an entry for every distinct content word (nouns, verbs, adjectives, adverbs and pronouns). Skip the most basic small words such as el, la, un, de, que, y, en, a and es. List them in the order they first appear and give each word once per paragraph",
  light: "up to 6 of the most useful words for a learner",
};

const SPANISH_VERBS_RULE: Record<HelpLevel, string> = {
  full: "every conjugated verb, up to 8",
  medium: "up to 5 notable conjugated verbs",
  light: "up to 3 notable conjugated verbs",
};

const SPANISH_EXAMPLE_RULE: Record<HelpLevel, string> = {
  full: "always an empty string, the paragraph shows the word in use",
  medium: "always an empty string, the paragraph shows the word in use",
  light: "the shortest span that shows the word, at most 140 characters",
};

function buildSpanishPrompt(help: HelpLevel): string {
  return `You are a Spanish language teacher mining numbered paragraphs of a source text for a personal study session. Read it as general Latin American Spanish and flag region-specific words when they appear. Second person is tú/ustedes.

The user message lists paragraphs as [1], [2] and so on. Return ONLY JSON, no prose before or after, no markdown fence. The JSON must have exactly these keys:
- gist: one sentence in English saying what these paragraphs are about
- paragraphs: one entry for EVERY paragraph number you were given, each exactly once, each { n (the paragraph number), english (a faithful English translation of the whole paragraph), key_phrase { spanish, english } (the single most useful phrase or construction in the paragraph, quoted exactly), verbs, vocab, idioms }
- grammar_notes: up to 2 short notes on notable constructions across these paragraphs

Per paragraph:
- verbs: ${SPANISH_VERBS_RULE[help]}, each { infinitive, english (the plain English meaning of the infinitive, for example "to wash"), form_in_source, form_english (what the form means as used in the source, for example "she was washing"), tense, mood, person, conjugation_table (object mapping pronoun to form for that tense), irregular (boolean), reflexive }
- vocab: ${SPANISH_WORDS_RULE[help]}, each { lemma, surface_form, part_of_speech, english, example_fragment (${SPANISH_EXAMPLE_RULE[help]}), level (A1, A2, B1, B2, C1 or C2) }
- idioms: up to 2 idioms or fixed expressions, each { phrase, literal_meaning, actual_meaning, region_tags (where it is used, empty array if general), register (formal, neutral, informal, slang or vulgar) }. Use an empty array when there are none.

Reflexive verbs: the reflexive key is required on every verb. Use null when the verb is not used with se in the source. When it is, set it to { infinitive_reflexive (for example "lavarse"), english (what the reflexive version means, for example "to wash oneself"), kind, explanation (one or two plain sentences for an English speaker) }. kind is exactly one of:
- reflexive: the subject does the action to itself (me lavo, I wash myself)
- meaning_change: se changes the verb's meaning (dormirse, to fall asleep, versus dormir, to sleep)
- reciprocal: people do it to each other (se abrazan, they hug each other)
- accidental: the "se me" form where something happens to someone with no blame (se me cayó, I dropped it)
- impersonal: the passive or impersonal se (se habla español, Spanish is spoken)

Rules:
- Do not copy the Spanish paragraphs back. They are attached by the app, so return only the English and the mined items.
- Never skip a paragraph: every paragraph number gets an entry, even if its lists are empty.
- For reflexive uses, put the reflexive pronoun in every form of the conjugation_table (me lavo, te lavas, se lava).
- Mark register on idioms and say so when a word means something different in some regions.
- Describe how the source is written, do not correct it.
- If a paragraph is not Spanish, still return its entry with an English translation and empty lists.`;
}

const FARSI_WORDS_RULE: Record<HelpLevel, string> = {
  full: "an entry for EVERY distinct word in the paragraph, including small words like و (and), در (in), به (to) and که (that), so the learner can see what each word means. List them in the order they first appear and give each word once per paragraph",
  medium:
    "an entry for every distinct content word (nouns, verbs, adjectives, adverbs and pronouns). Skip the most basic small words such as و, در, به, از, که and را. List them in the order they first appear and give each word once per paragraph",
  light: "up to 8 of the most useful words for a learner",
};

const FARSI_VERBS_RULE: Record<HelpLevel, string> = {
  full: "every conjugated verb, up to 8",
  medium: "up to 5 notable conjugated verbs",
  light: "up to 3 notable conjugated verbs",
};

function buildFarsiPrompt(help: HelpLevel): string {
  return `You are a Persian (Farsi) language teacher mining numbered paragraphs of a source text for a personal study session. The learner is an English speaker who cannot read the script well and knows very few Persian words, so be generous. Use standard Iranian Persian only.

The user message lists paragraphs as [1], [2] and so on. Return ONLY JSON, no prose before or after, no markdown fence. The JSON must have exactly these keys:
- gist: one sentence in English saying what these paragraphs are about
- paragraphs: one entry for EVERY paragraph number you were given, each exactly once, each { n (the paragraph number), transliteration (the whole paragraph in Latin letters, one consistent system with â for the long a, written the way it is said), english (a faithful English translation of the whole paragraph), key_phrase { persian, transliteration, english } (the single most useful phrase or construction in the paragraph, quoted exactly), words, verbs, idioms }
- grammar_notes: up to 2 short notes on notable constructions across these paragraphs, such as the ezafe or attached pronouns

Per paragraph:
- words: ${FARSI_WORDS_RULE[help]}, each { lemma (dictionary form, Persian script), surface (the form as written in the paragraph, Persian script), transliteration, part_of_speech, english, level (A1, A2, B1, B2, C1 or C2), register (formal, neutral or colloquial) }
- verbs: ${FARSI_VERBS_RULE[help]}, each { infinitive (Persian script), transliteration, english (the plain English meaning of the infinitive, for example "to see"), form_in_source, form_transliteration, form_english (what the form means as used in the source), tense, mood, person, conjugation_table (object mapping pronoun to form for that tense, in Persian script), irregular (boolean), compound }
- idioms: up to 2 idioms or fixed expressions, each { phrase (Persian script), transliteration, literal_meaning, actual_meaning, register (formal, neutral or colloquial) }. Use an empty array when there are none.

Compound verbs: the compound key is required on every verb. Use null for a simple verb. When the verb is a noun or adjective plus a light verb (for example kâr kardan, "to work"), set it to { parts (one string with the pieces and their meanings, for example "kâr (work) + kardan (to do)"), explanation (one or two plain sentences for an English speaker) }.

Rules:
- Do not copy the Persian paragraphs back. They are attached by the app, so return only the transliteration, the English and the mined items.
- Never skip a paragraph: every paragraph number gets an entry, even if its lists are empty.
- Every Persian word or sentence needs a Latin transliteration and an English meaning.
- Register: spoken Persian differs from written. Mark colloquial words and forms as colloquial and say so when a spoken form differs from the written one.
- Describe how the source is written, do not correct it.
- If a paragraph is not Persian, still return its entry with an English translation and empty lists.`;
}

/** The system prompt for a language. The help level sets how many words get glossed. */
export function buildSystemPrompt(language: Language = "es", help: HelpLevel = defaultHelp(language)): string {
  return language === "fa" ? buildFarsiPrompt(help) : buildSpanishPrompt(help);
}

/** The numbered paragraphs for one Spanish batch. */
export function buildBatchUserPrompt(batch: { n: number; text: string }[]): string {
  return `Paragraphs to mine:\n\n${batch.map((p) => `[${p.n}] ${p.text}`).join("\n\n")}`;
}
