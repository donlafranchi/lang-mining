# 027 Lexicon lookup before the LLM (step B1)

- Before a lesson is built, every word in the text is looked up in our lexicon, first as a known written form, then as a dictionary form. Storage trouble means "nothing known", never an error.
- Full help: every known word is explained from the lexicon and the model is told to leave it out. Medium: known content words are explained from the lexicon and all known words are skipped by the model. Light: unchanged, the model picks a few key words.
- Verbs and conjugation tables still come from the model (code conjugation is step C).
- An entry from the lexicon lists every sense we hold. The reader shows "Could also mean: ... Which fits here?" so the learner decides from context. The model never picks a sense.
- Levels for core words come from their rank (A1 up to 300, A2 to 800, B1 to 1,500, B2 after) unless a level was stored.
- Starts empty: until 0008 is run and the core list is loaded, lessons build exactly as before. Savings grow with every lesson (forms are harvested).
- Next: B2, a dictionary importer script (Wiktionary extract: senses and inflected forms), run on a machine with internet.
