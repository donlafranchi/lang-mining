# Working rules for Code

## Product
DIY Spanish and Farsi learning tool (sentence mining) for Don and a few friends and family (fewer than 5 people). Private repo. Read docs/spec.md before building.

## Stack
- Next.js (App Router, TypeScript) on Vercel, mobile-first PWA
- Supabase (Postgres, Storage, Realtime)
- Claude API for enrichment, returning structured JSON validated against a schema
- Transcription is a swappable worker with one contract: take a job, return a transcript with segment timestamps

## Hard rules
- Full source paragraphs and their English translation are stored with each lesson (decision by Don, Nov 2026, replacing the old transient-source rule). The raw source copy is kept too. There is no retention job.
- Never store audio or video beyond the job that needs it.
- Spanish lessons are built once per session with no dialect choice (decision by Don, Nov 2026). The sessions.dialect column stays and holds a fixed default. Dialect-specific idioms or a separate slang side may come later.
- Each person has their own sign-in (name plus personal passcode, no email), their own lessons and their own deck (decision by Don, Nov 2026). Every read and write of lessons and deck cards must be limited to the signed-in user's id, and someone else's id is "not found". The owner is created by the first sign-in with APP_PASSCODE and adds, resets and removes people on the Admin page.
- Data is disposable until Don says "no more database refresh": destructive migrations and `delete from sessions;` are fine on the lang-mining Supabase project only, never on another project.
- Secrets live in environment variables only. Never commit keys.
- Downloading from YouTube or TikTok happens only on the home Mac worker, never on cloud infrastructure.

## Process
- Build from the ticket in docs/tickets/. One ticket per branch, small PRs.
- Test-first for the enrichment parser and schema validation.
- Good enough under the deadline. Flag anything getting more polish than the timeline justifies.
- Merge PRs without asking and without waiting for the Vercel preview, once tests, lint and the local production build pass (decision by Don, Nov 2026). The only reason to hold a merge is a step only Don can do first (SQL to run, a secret to set) where merging early would break or lock him out: say what it is and merge when he confirms it.
- Anything that needs a human decision (language choice, UI/UX) gets surfaced in the PR description, everything else just ships.

## Notes for the human
- Terminal commands in docs go in their own copy block, one command per block.
