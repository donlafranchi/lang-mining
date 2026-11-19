# 030 Spanish grammar patterns by rules (step C2a)

- With the analysis service on, Spanish patterns are found in code (src/lib/pattern-rules/detect-es.ts) from the analyzer's words, and the model is no longer asked for them (a shorter prompt and answer). With it off or down, the model tags them as before. Farsi still uses the model (no Persian part-of-speech model was available to test).
- The rules use the analyzer's grammar features plus fixed tables of the auxiliary verb forms the patterns hang on, because the small spaCy model mislabels some of them (hayas, vuelvas, vas).
- Tested on real spaCy output for the catalog's own 66 example sentences, plus plain sentences that must find nothing: 64 of 66 found, 2 documented gaps (a command that looks like an ordinary present, and a command with a pronoun attached). ser vs estar is a matter of meaning, not word shape, so rules do not tag it; it stays on the Study > Grammar patterns page.
- Precision beyond the catalog sentences, and accuracy on real articles, are not measured yet. If a rule over-tags in real use, tighten it with a failing test first.
- Next (C2b): verbs and conjugation tables in code.
