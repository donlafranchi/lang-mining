# Ticket 001: Text and article URL ingestion to study session

## Outcome
Paste Spanish text or an article URL on your phone and get a ready study session with vocab, idioms, verbs, and a dialect label.

## In scope
- Next.js app scaffold, mobile-first PWA manifest, deployed on Vercel
- Supabase project with the sessions, source_texts, and enrichments tables
- Home screen: one paste box (text or URL) and a dialect picker
- URL path: fetch the page, extract clean article text
- Claude enrichment call returning JSON validated against the schema in docs/spec.md
- Session screen with Read, Vocab, Idioms, Verbs tabs
- Retention job that deletes source_texts rows past delete_after
- Re-run enrichment with a different dialect without re-fetching

## Out of scope
- Audio, video, and transcription
- Quiz and spaced-repetition deck
- iOS Shortcut
- Auth beyond a single-user gate

## Acceptance criteria (pass or fail)
1. Pasting 500 words of Spanish text produces a session in under 60 seconds
2. Pasting an article URL produces a session from extracted text, not raw HTML
3. Every vocab, idiom, and verb entry validates against the schema, invalid Claude output is rejected and retried once
4. Dialect picker changes idiom and conjugation output on re-run, with no re-fetch
5. Full source text is gone from the database after the retention date, enrichment facts remain
6. App installs to the iPhone home screen and the paste flow works with one hand
7. No API keys in the repo

## Notes
- Test-first for the schema validator and the retention job
- Surface UI/UX and language-choice decisions in the PR description, ship everything else
