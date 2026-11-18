# Ticket 004: Delete lessons and a back button

## Outcome
Remove lessons you no longer want, and get back to the list from a lesson without a browser back button (the installed iPhone app has none).

## In scope
- Delete a lesson from the lesson page, with a confirm step
- Delete a lesson from a row on the home list, with a confirm step
- Deleting removes the session, its source text and its enrichment (the tables already cascade)
- A visible "Back" link at the top of the lesson page that returns to the home list
- A malformed lesson id shows "not found" instead of a server error
- Record in CLAUDE.md that small PRs can be merged without approval

## Out of scope
- Undo or a trash bin
- Bulk delete or multi-select
- Returning to a scroll position in the list (the list is short for now)
- Farsi (later ticket)

## Acceptance criteria (pass or fail)
1. Deleting from the lesson page removes the lesson and returns to the home list
2. Deleting from the home list removes that row without leaving the page
3. Cancelling the confirm step deletes nothing
4. After a delete, the session, source_texts and enrichments rows for it are gone
5. DELETE on an id that does not exist returns 404, and on a malformed id returns 404 without touching the database
6. The lesson page has a Back link to the home list
7. No API keys in the repo

## Notes
- Test-first for the id check
- Surface the confirm wording and button placement in the PR description
