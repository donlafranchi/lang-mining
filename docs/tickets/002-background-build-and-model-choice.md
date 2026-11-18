# Ticket 002: Background lesson build and model choice

## Outcome
Paste a long text, leave the page, and the lesson shows up later. Pick which Claude model builds it, to compare speed and quality.

## In scope
- POST /api/sessions saves the session and source text, returns the id right away, and builds the lesson in the background (Next.js `after`), with a 300s function limit
- Re-run for another dialect also builds in the background
- Session page shows "Building" and refreshes itself until the lesson is ready or failed
- A session stuck on "processing" past 6 minutes is shown as failed (the function was killed), with a retry button
- Model picker on the paste form (Haiku 5.5, Sonnet 5.5, Opus 5.5), remembered per device, default Haiku 5.5
- The model used is stored with each enrichment (column already exists) and shown on the lesson

## Out of scope
- Deleting lessons and the back button (ticket 003)
- A real job queue, notifications, or push when a lesson finishes
- Streaming partial results

## Acceptance criteria (pass or fail)
1. Mine it returns to the session page in under 5 seconds for a 500-word text
2. The lesson appears without a manual refresh once built
3. A session left on processing for more than 6 minutes shows as failed with a retry button
4. Only allowlisted model ids are accepted by the API, anything else is rejected with 400
5. The chosen model is saved on the enrichment and shown on the lesson
6. No API keys in the repo

## Notes
- Test-first for the model allowlist and the stale-status rule
- Surface UI/UX and model default decisions in the PR description
