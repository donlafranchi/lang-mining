# Working rules for Code

## Product
Personal DIY Spanish learning tool (sentence mining). Single user. Private repo. Read docs/spec.md before building.

## Stack
- Next.js (App Router, TypeScript) on Vercel, mobile-first PWA
- Supabase (Postgres, Storage, Realtime)
- Claude API for enrichment, returning structured JSON validated against a schema
- Transcription is a swappable worker with one contract: take a job, return a transcript with segment timestamps

## Hard rules
- Full source paragraphs and their English translation are stored with each lesson (decision by Don, Nov 2026, replacing the old transient-source rule). The raw source copy and its retention job still exist but are redundant and may be removed later.
- Never store audio or video beyond the job that needs it.
- Spanish lessons are built once per session with no dialect choice (decision by Don, Nov 2026). The sessions.dialect column stays and holds a fixed default. Dialect-specific idioms or a separate slang side may come later.
- Data is disposable until Don says "no more database refresh": destructive migrations and `delete from sessions;` are fine on the lang-mining Supabase project only, never on another project.
- Secrets live in environment variables only. Never commit keys.
- Downloading from YouTube or TikTok happens only on the home Mac worker, never on cloud infrastructure.

## Process
- Build from the ticket in docs/tickets/. One ticket per branch, small PRs.
- Test-first for the enrichment parser and schema validation.
- Good enough under the deadline. Flag anything getting more polish than the timeline justifies.
- Don is the only user of this app. Small PRs can be merged by Code without asking once tests, lint, the build and the Vercel preview are green. Anything large or risky still waits for Don.
- Anything that needs a human decision (language choice, UI/UX) gets surfaced in the PR description, everything else just ships.

## Notes for the human
- Terminal commands in docs go in their own copy block, one command per block.
