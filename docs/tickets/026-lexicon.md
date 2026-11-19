# 026 Our own lexicon (step A of the language pipeline)

- Migration 0008: lexicon_lemmas (language, lemma, part of speech, senses with counts, level, core rank, transliteration, source, uses) and lexicon_forms (written form to lemma, part of speech, morphology). Shared by all users, words only, never article text.
- Every finished lesson (build and rerun) harvests into it. A failure never fails a lesson.
- Admin page: "Load the core 2,000 words" seeds both languages with their ranks. Safe to run again.
- Senses accumulate across lessons, so an ambiguous word naturally collects several glosses. Choosing between them is left to the learner (context clues); showing all senses comes with step B.
- Needs: run 0008 in the Supabase SQL Editor, then press the button on Admin.
- Next: B (dictionary import, lookup before the LLM, show all senses), C (analysis worker).
