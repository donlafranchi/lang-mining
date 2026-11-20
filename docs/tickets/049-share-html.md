# 049 Share a lesson as one HTML file
- "Share as a file" on a ready lesson: GET /api/sessions/[id]/share (own lessons only, else not found) returns one self-contained .html (inline CSS and script, no outside links, light/dark follows the phone).
- Contains: title, English Overview, per paragraph the text (Persian with transliteration), idioms, vocabulary with verb tables, language patterns, English with key phrase, Test me (small inline script), grammar notes.
- Left out: add to study list, More forms, core-word underlines (need the app).
- Button uses the phone share sheet with the file, else downloads it.
- Everything is HTML-escaped; quiz data cannot close its script tag.
- Limit: Test me matching is a second copy of the app checker, keep them in step.
