const NAMES: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adj: "adjective",
  adjective: "adjective",
  adv: "adverb",
  adverb: "adverb",
  prep: "preposition",
  preposition: "preposition",
  pron: "pronoun",
  pronoun: "pronoun",
  conj: "conjunction",
  conjunction: "conjunction",
  det: "article / determiner",
  determiner: "article / determiner",
  num: "number",
  interj: "interjection",
};

/** A part of speech written out for a learner ("adj" becomes "adjective"). Unknown ones are shown as they came. */
export function posLabel(pos: string): string {
  return NAMES[pos.trim().toLowerCase()] ?? pos;
}
