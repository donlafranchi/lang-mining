# lang-mining

Personal DIY Spanish learning tool built on sentence mining. You find content you actually care about (an article, a YouTuber, a TikToker, a song page), share the link to your own server, and it mines the language out of it and turns it into a short study session: vocabulary, idioms, verb conjugations, dialect notes, and a quiz.

Personal use only. Not for resale or distribution.

## How it works

1. Share a link, paste text, or upload a clip from your phone
2. Server gets the words (captions or article text first, transcription only when needed)
3. Claude extracts vocab, idioms, verb forms, and dialect notes as structured JSON
4. The full source text is discarded after a retention window; only the mined language facts are kept
5. You study the session on your phone (mobile-first PWA)

## Setup

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in its SQL editor
2. Copy `.env.example` to `.env.local` and fill in every value
3. Install and run:

```bash
npm install
```

```bash
npm run dev
```

Run the tests:

```bash
npm test
```

On Vercel, set the same variables from `.env.example` as project environment variables. The daily retention job is configured in `vercel.json` and needs `CRON_SECRET`.

## Docs

- [Spec](docs/spec.md)
- [Working rules for Code](CLAUDE.md)
- [First ticket: text and URL ingestion](docs/tickets/001-text-url-ingestion.md)
