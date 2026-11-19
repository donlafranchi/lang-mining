# 031 Verb tables built in code

- Analysis service gets `POST /conjugate` (verbecc, Spanish): six persons, tense taken from spaCy's grammar features, irregular flag from the verb's template. Model trained at Docker build.
- App builds verb entries for finite verbs, participles and gerunds the lexicon knows (meaning from the lexicon). The auxiliary haber is skipped, so "ha dado" shows dar.
- Verbs used with me, te, se, nos or os stay with the model (reflexive explanation).
- The model is told which verb forms are covered and lists only the rest. If the service is down or cannot conjugate, the model lists verbs as before.
- Label ("past participle of dar (to give)") is built in code, not translated.
- Not verified on real articles; participle and gerund tables show the present tense (labelled as such).
