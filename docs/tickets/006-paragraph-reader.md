# Ticket 006: Paragraph-by-paragraph reader (Spanish)

## Outcome
Read an article one paragraph at a time: the Spanish paragraph first, then a key phrase, the important verbs and vocabulary, and the English at the bottom. Swipe right for the next paragraph, same layout.

## Decision recorded
The hard rule that source text is transient is dropped (Don, Nov 2026). Full paragraphs and their English translation are stored with the lesson. CLAUDE.md and the spec are updated. The raw source copy and its retention job are left in place for now, since the paragraphs are stored separately.

## In scope
- Split the source into paragraphs in code (blank lines, else single newlines), merge very short ones, split very long ones at sentence ends. The model never rewrites the Spanish, so the Spanish shown is exactly the source
- Build the lesson in batches of paragraphs, a few at a time in parallel, each validated and retried once. This also lets long articles fit the time limit
- Per paragraph the model returns: English translation, a key phrase with English, up to 3 important verbs (with the English, form meaning and reflexive block from ticket 003), up to 6 vocab entries, up to 2 idioms
- Lesson summary built from a one-sentence gist per batch, plus up to 6 grammar notes
- Read tab becomes the paragraph reader: horizontal swipe cards (CSS scroll snap), a position indicator, previous and next buttons, vertical scroll inside a card
- Vocab, Idioms and Verbs tabs stay and are built from all paragraphs, with duplicates removed
- Remove the 140-character caps on stored paragraph text (the old hard rule). Short caps stay on vocab example fragments
- Update CLAUDE.md and docs/spec.md

## Out of scope
- Farsi stays on its current layout (paragraph reader for Farsi is a later ticket)
- Removing the retention job and the raw source copy
- Highlighting words inside the paragraph, tap to see a word, skip marking, quiz
- Old lessons: the stored shape changes, so old Spanish lessons are cleared with `delete from sessions;`

## Acceptance criteria (pass or fail)
1. Paragraphs split on blank lines, or on single newlines when there are no blank lines, with very short ones merged and very long ones split at sentence ends
2. The stored Spanish for each paragraph is the source text, not model output
3. A batch response that skips, repeats or invents a paragraph number fails validation and is retried once
4. A paragraph result missing its English, key phrase, or the reflexive key on a verb fails validation
5. A 20-paragraph article builds as several batches and ends with 20 paragraphs in order
6. The Read tab shows, per paragraph: Spanish, key phrase, verbs, vocab, then English, and swipes horizontally between paragraphs
7. Vocab, Idioms and Verbs tabs list items from every paragraph without duplicates
8. No API keys in the repo

## Notes
- Test-first for the splitter, batching, batch validation and merge
- Surface the card layout and the dropped hard rule in the PR description
