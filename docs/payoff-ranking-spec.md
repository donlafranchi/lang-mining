# Spec: Payoff Ranking + Skip Marking

## Positioning (build against this)
1. Language learning for adults: adult vocabulary (work, news, travel), not kid words.
2. Minimize words needed to understand a text: break text into the highest-payoff vocabulary, learn those, infer the rest from context (DLI-style).

## Open question (do not assume)
Which parts of a sentence are actually highest payoff is unknown. Subject / verb / direct object was only an example. Approach A below ranks by frequency and coverage first; measuring which word roles predict comprehension comes later, on the app's own content.

## Feature 1: Frequency-first payoff ranking
- Input: a chunk of text (sentence or short passage) from an ingested article or text.
- Tokenize and lemmatize Spanish (so "hablamos" and "hablar" count as one word).
- Score each lemma by corpus frequency rank (use an open Spanish frequency list, such as one from subtitles or news; pick one and note its source in the repo).
- Rank each chunk's lemmas by payoff: higher corpus frequency and higher repeat count across the user's saved texts rank first.
- Output per chunk: ordered list of lemmas with rank and a "learn" flag for the top N (default 3).
- Adult bias: filter or down-weight lemmas that only appear in child-oriented corpora where the list allows it. Crude is fine.

## Feature 2: Skip marking (not vocabulary)
- Tag tokens that should not be learned as vocabulary: proper nouns, abbreviations, acronyms, numbers, brand or foreign words.
- Show them in a distinct style (dimmed text with dotted underline) so the user sees at a glance they can ignore them.
- Use an off-the-shelf Spanish tagger/NER for the first pass. Known weak spot: capitalized sentence-initial words get misread as proper nouns, so treat a sentence-initial capital as a proper noun only if the tagger also says so.
- User override: tap a token to toggle "skip" / "learn". Store the override and respect it next time the same token appears.
- Skipped tokens are excluded from ranking and from any coverage calculation.

## Out of scope for this spike
- Coverage meter ("you understand ~70%"): build only a crude version, no polish. It is the riskiest piece.
- "Teach the skeleton" mode.
- Measuring which sentence roles carry the most meaning (Approach B).

## Done when
- Paste or ingest an article: each chunk shows ranked lemmas with the top few marked "learn", and proper nouns, acronyms, and numbers are visibly marked "skip".
- Tapping a token flips its status and the choice persists.
- Frequency list source and any known misses are noted in the repo README.
