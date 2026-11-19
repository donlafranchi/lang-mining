# 029 Analysis service (step C1)

- /analysis: a FastAPI service. POST /analyze takes a language and paragraphs and returns every word with its dictionary form, part of speech and grammar (offsets into the original text). Spanish: spaCy es_core_news_sm. Persian: Hazm (dictionary forms, infinitives for verbs; part of speech when the tagger model is present).
- Verified in the build sandbox: both engines run and the service's tests pass (pytest, 8 tests). Not verified: the Persian part-of-speech model (Hugging Face is blocked from the sandbox), real hosting, accuracy on real articles.
- Why a container: spaCy and the Spanish model are about 280 MB installed, over Vercel's 250 MB function limit. Hazm alone is about 44 MB.
- The app side: the `Analyzer` contract and an HTTP client (src/lib/analysis). With ANALYSIS_URL and ANALYSIS_KEY set, lesson builds use it to resolve inflected forms to dictionary words for lexicon lookup and to save forms. With them unset, or the service down, nothing changes.
- Deploying it is Don's step (a host and two environment variables): see analysis/README.md.
