# 051 Tap any word in a Farsi paragraph
- Words with a known meaning in the Persian paragraph are tappable (nothing visible added, so the common-word underline still shows; a hint line says "Tap any word for its meaning").
- Popup (same sheet as patterns): the word, transliteration, English (several meanings if the lexicon has them), kind of word and "from" the dictionary form, plus Add to study list.
- Matching ignores vowel marks, joiners and punctuation; no extra model output, uses the lesson's existing word and verb data.
- Not done: multi-word verbs written with spaces are not matched; Spanish paragraphs (component is generic, not wired).
- Added a vitest "@" alias so component tests can import app paths.
