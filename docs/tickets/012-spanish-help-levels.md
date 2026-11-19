# Ticket 012: Help level for Spanish

## Outcome
Spanish lessons get the same help-level setting as Farsi, so a beginner can have every word glossed and a stronger learner keeps the light lessons.

## In scope
- Help level on the paste form for both languages, remembered per language on the device
- Spanish levels:
  - Full help: every distinct word in the paragraph gets an entry, small words included
  - Medium: every content word, skipping the most basic small words
  - Light: up to 6 key words per paragraph (what Spanish does today)
- Default level per language: Spanish Light (keeps today's lessons), Farsi Full
- Verbs per paragraph by level: up to 8 at Full, 5 at Medium, 3 at Light
- Smaller Spanish batches at higher help so each answer fits: 3 paragraphs at Full, 4 at Medium, 5 at Light
- At Full and Medium the per-word example sentence is left empty, since the paragraph is right above it
- Word lists in Spanish lessons become one compact line per word with a save button, like Farsi, so a long list is quick to scan
- The retry card of a failed Spanish lesson also has the help level

## Out of scope
- Changing the Farsi levels
- Re-building an existing lesson at another help level (paste it again to compare)
- A per-lesson level shown on the lesson page

## Acceptance criteria (pass or fail)
1. Full asks for every distinct word, Medium for every content word, Light for up to 6 key words
2. Without a level, Spanish means Light and Farsi means Full, an unknown level is rejected with 400
3. Spanish batches are 3 paragraphs at Full, 4 at Medium, 5 at Light, Farsi unchanged
4. An empty example fragment is valid, a fragment over 140 characters is still rejected
5. Spanish words show as one line each with a save button, and the Vocab tab and each paragraph keep Save all
6. The paste form shows the help level for Spanish and Farsi, and remembers each separately
7. No API keys in the repo

## Notes
- Test-first for the level defaults, batch limits, the prompts and the schema change
- Cost and time go up at Full help. Not measured, flag it
