# Analysis service

Takes paragraphs and returns every word with its dictionary form (lemma), part of speech and grammar. Spanish uses spaCy, Persian uses Hazm. The app calls it through the `Analyzer` contract in `src/lib/analysis`, so the engine can change without touching the app.

Why it is a separate service: spaCy and its Spanish model are about 280 MB installed, over Vercel's 250 MB function limit (measured, Nov 2026). Hazm alone is about 44 MB.

## API
- `POST /analyze` with header `x-analysis-key: <ANALYSIS_KEY>` and body `{"language": "es" | "fa", "paragraphs": ["..."]}`. Returns `{"language", "paragraphs": [{"tokens": [{"text", "start", "end", "lemma", "pos", "morph", "is_word"}]}]}`. Offsets point into the original paragraph.
- `GET /health` needs no key.
- With no `ANALYSIS_KEY` set the service refuses everything.
- Persian part of speech needs the Hazm tagger model (the Dockerfile downloads it from Hugging Face). Without it Persian words still get their dictionary form and verbs are recognised, but other parts of speech are blank and the lexicon fills them in.

## Run it on your own computer
```bash
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt && python -m spacy download es_core_news_sm
```

```bash
python -m pytest -q
```

```bash
ANALYSIS_KEY=choose-a-long-random-string uvicorn app:app --port 8080
```

## Run it in a container
```bash
docker build -t lang-mining-analysis .
```

```bash
docker run -p 8080:8080 -e ANALYSIS_KEY=choose-a-long-random-string lang-mining-analysis
```

## Connect the app
Set two environment variables on Vercel (and in .env.local for local work): `ANALYSIS_URL` (for example `https://your-host`) and `ANALYSIS_KEY` (the same string). With them unset the app works exactly as before.
