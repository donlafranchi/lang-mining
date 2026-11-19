# Language pipeline: where we are going

Decision (Don, Nov 2026): rely on code and our own data for as much of the language work as possible, and use the LLM only for what code cannot do.

## End state
1. Fetch and clean the page, split paragraphs and sentences (code, done).
2. Analyse each paragraph (code, worker): every word's written form, dictionary form (lemma), part of speech and morphology (tense, mood, person). spaCy for Spanish, Hazm (or Stanza) for Farsi. Behind one contract, `Analyzer`, so the engine can be swapped.
3. Detect grammar patterns from that analysis (code): haber + participle, estar + gerund and so on. The pattern catalog already exists.
4. Look every lemma up in our lexicon (database): English senses, level, core-2,000 rank, transliteration. Words not in the lexicon are filled from a dictionary import, and only then by the LLM, whose answer is saved so it is asked once.
5. Build conjugation tables from the lemma (code).
6. The LLM keeps: translating each paragraph, idioms, grammar notes, titles, and filling gaps. It does NOT choose the right meaning of an ambiguous word. The lexicon keeps every common sense and the learner works out which fits from the context.

## Lexicon (shared by all users, words only, never article text)
- `lexicon_lemmas`: one row per (language, lemma, part of speech) with senses (each English gloss seen, with a count), level, core rank, transliteration, source and use count.
- `lexicon_forms`: written form to lemma, part of speech and morphology, so later lookups need no analysis.
- Filled by: the core 2,000 lists, every LLM lesson (harvest), later a dictionary import and the analyzer.

## Steps
- A (this PR): the lexicon tables, harvest from every lesson, seeding from the core lists, this document.
- B: dictionary import for English senses, lookup before the LLM, show all senses to the learner.
- C: the analysis worker (Python; Vercel Python function first for Spanish, Hazm for Farsi, a small container if the size limits bite), checked against stored lessons as the answer key, then switched in.
