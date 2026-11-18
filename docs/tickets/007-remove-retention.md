# Ticket 007: Remove the retention job, explain missing database updates

## Outcome
The raw source text is kept like the paragraphs (the transient-source rule is gone). The daily delete job and its settings are removed. When a database update has not been applied yet, the app says which one instead of "something went wrong".

## In scope
- Remove the retention job: cron route, schedule in vercel.json, retention helpers and tests, the Supabase delete helper, CRON_SECRET, RETENTION_DAYS
- Stop writing `delete_after` on new source text. Migration 0003 makes the column nullable (safe for old and new code)
- Rebuild uses the stored source text and no longer talks about a retention window
- A friendly error when the `language` column (migration 0002) or the nullable `delete_after` (migration 0003) is missing
- Update README, spec, CLAUDE.md and .env.example

## Out of scope
- Dropping the `delete_after` column (left nullable, harmless)
- Deleting source text when a lesson is deleted (already cascades)

## Acceptance criteria (pass or fail)
1. No retention code, cron route or schedule remains
2. A new session saves its source text with no `delete_after`
3. A database error naming the missing `language` column returns a clear message that points at migration 0002
4. A database error for the `delete_after` not-null rule returns a clear message that points at migration 0003
5. Any other database error still returns the generic message
6. No API keys in the repo

## Notes
- Migration 0003 must be applied before this merges, otherwise new sessions cannot save. Apply it first, then merge.
- Test-first for the error explainer
