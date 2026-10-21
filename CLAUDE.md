# Working rules for Code

## Product
Personal DIY Spanish learning tool (sentence mining). Single user. Private repo. Read docs/spec.md before building.

## Stack
- Next.js (App Router, TypeScript) on Vercel, mobile-first PWA
- Supabase (Postgres, Storage, Realtime)
- Claude API for enrichment, returning structured JSON validated against a schema
- Transcription is a swappable worker with one contract: take a job, return a transcript with segment timestamps

## Hard rules
- Source text (article, transcript, lyrics) is transient. Store only mined language facts and short fragments, never full lines or the whole source. Delete source text after the retention window (default 7 days, configurable).
- Never store audio or video beyond the job that needs it.
- Dialect is a field on every session (Puerto Rican, Mexican, Caribbean general, Rioplatense, Castilian, Neutral Latin American). Default is user-level, override per session.
- Secrets live in environment variables only. Never commit keys.
- Downloading from YouTube or TikTok happens only on the home Mac worker, never on cloud infrastructure.

## Process
- Build from the ticket in docs/tickets/. One ticket per branch, small PRs.
- Test-first for the enrichment parser and schema validation.
- Good enough under the deadline. Flag anything getting more polish than the timeline justifies.
- Anything that needs a human decision (language choice, UI/UX) gets surfaced in the PR description, everything else just ships.

## Notes for the human
- Terminal commands in docs go in their own copy block, one command per block.
