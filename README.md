# lang-mining

Personal DIY Spanish learning tool built on sentence mining. You find content you actually care about (an article, a YouTuber, a TikToker, a song page), share the link to your own server, and it mines the language out of it and turns it into a short study session: vocabulary, idioms, verb conjugations, dialect notes, and a quiz.

Personal use only. Not for resale or distribution.

## How it works

1. Share a link, paste text, or upload a clip from your phone
2. Server gets the words (captions or article text first, transcription only when needed)
3. Claude extracts vocab, idioms, verb forms, and dialect notes as structured JSON
4. The paragraphs, their English and the mined language facts are stored with the lesson
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

On Vercel, set the same variables from `.env.example` as project environment variables.

## Accounts

Each person signs in with a name and their own password (no email), and has their own lessons and deck. The sign-in form is a plain HTML form so the iPhone password manager can save and fill it. The first sign-in ever, using `APP_PASSCODE` as the password and the name you type, creates the owner. The owner adds, resets and removes people on the Admin page. Five wrong passwords lock that account for 15 minutes. `SESSION_SECRET` signs the session cookie.

## Install on your phone

- iPhone: open the site in Safari, tap Share, then Add to Home Screen.
- Android and desktop Chrome: use the Install button on the home screen card, or the browser's install option.

The installed app works like the site. With no connection it shows an offline screen, since lessons and the deck live in your account and are never stored on the device.

## Docs

- [Spec](docs/spec.md)
- [Working rules for Code](CLAUDE.md)
- [First ticket: text and URL ingestion](docs/tickets/001-text-url-ingestion.md)
