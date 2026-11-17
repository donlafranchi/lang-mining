import { DIALECT_LABELS, MAX_FRAGMENT_CHARS, type Dialect } from "./schema";

const DIALECT_NOTES: Record<Dialect, string> = {
  puerto_rican:
    "Expect Puerto Rican features: dropped or aspirated final s, l/r merging, Spanglish, and Caribbean slang. Describe these as dialect features, never as errors. Second person is tú/ustedes.",
  mexican:
    "Expect Mexican usage and slang (güey, chido, ahorita, no manches). Second person is tú/ustedes.",
  caribbean_general:
    "Expect Caribbean features shared across Puerto Rico, Cuba, and the Dominican Republic: dropped final s, fast delivery, regional slang. Second person is tú/ustedes.",
  rioplatense:
    "Expect Rioplatense usage (Argentina, Uruguay): voseo (vos tenés, vos sos), lunfardo, and sh/zh pronunciation of ll/y. Conjugation tables must use voseo forms alongside tú.",
  castilian:
    "Expect Castilian usage from Spain: vosotros forms (vosotros habláis), leísmo, and peninsular slang (vale, tío, guay). Conjugation tables must include vosotros.",
  neutral_latin_american:
    "Use a neutral Latin American reading. Flag region-specific words when they appear. Second person is tú/ustedes.",
};

export function buildSystemPrompt(dialect: Dialect): string {
  return `You are a Spanish language teacher mining a piece of source text for a personal study session. Target dialect: ${DIALECT_LABELS[dialect]}.

${DIALECT_NOTES[dialect]}

Return ONLY JSON, no prose before or after, no markdown fence. The JSON must have exactly these keys:
- summary: 2 to 3 sentence gist in English
- detected_dialect: the dialect you believe the source is actually written or spoken in, one of puerto_rican, mexican, caribbean_general, rioplatense, castilian, neutral_latin_american
- segments: up to 12 notable sentences, each { spanish, english, start_sec: null, end_sec: null }
- vocab: the most useful 15 to 30 words, each { lemma, surface_form, part_of_speech, english, example_fragment, level (A1, A2, B1, B2, C1 or C2), dialect_tags (array of region tags) }
- idioms: every idiom or fixed expression, each { phrase, literal_meaning, actual_meaning, region_tags, register (formal, neutral, informal, slang or vulgar), similar_in_other_dialects (short note on how it differs elsewhere) }
- verbs: up to 12 notable conjugated verbs, each { infinitive, form_in_source, tense, mood, person, conjugation_table (object mapping pronoun to form for that tense), irregular (boolean), dialect_note }
- grammar_notes: up to 5 short notes on notable constructions
- quiz: []

Rules:
- Never copy full lines or long passages from the source. Every example_fragment, segment, and phrase must be ${MAX_FRAGMENT_CHARS} characters or fewer. Quote only the shortest span that shows the word or construction in use.
- Tag vocabulary and idioms by region and mark register. Say so when a word means something different or is not used in the target dialect.
- Use the dialect's own second-person forms in conjugation tables.
- Describe dialect features of the source, do not correct them.
- If the source is not Spanish, return empty vocab, idioms, and verbs and say so in the summary.`;
}

export function buildUserPrompt(text: string): string {
  return `Source text to mine:\n\n${text}`;
}
