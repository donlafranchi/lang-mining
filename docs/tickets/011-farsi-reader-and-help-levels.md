# Ticket 011: Farsi paragraph reader, help levels, save all words

## Outcome
Farsi lessons give the help a beginner needs: the full paragraph in Persian script, a transliteration of the whole paragraph, the English, and a meaning for every word. A help-level setting controls how many words get glossed, and one tap saves all of them to the deck.

## Why
Farsi lessons were cut down to fit one answer (10 to 15 words, 6 verbs, 6 sentences) and show only fragments, not the paragraph. For a learner who does not know most of the words that is far too little.

## In scope
- Build Farsi like Spanish: split the source into paragraphs in code, build in batches, validate each batch, retry once. The Persian shown is exactly the source
- Help level on the paste form for Farsi, remembered per device, default Full:
  - Full help: every distinct word in the paragraph gets an entry
  - Medium: every content word (nouns, verbs, adjectives, adverbs, pronouns), skipping the most basic small words
  - Light: up to 8 key words
- Smaller batches for Farsi at higher help (2 paragraphs at Full, 3 at Medium, 5 at Light) so every answer fits
- Per paragraph: Persian, transliteration of the whole paragraph, English, a key phrase, a word list, verbs (with the compound block) and idioms
- Word entry: the dictionary form, the form as written, transliteration, English, part of speech, level, register
- Read tab as swipeable paragraph cards (shared with Spanish). Vocab, Idioms and Verbs tabs list everything from all paragraphs without duplicates
- "Save all N words" on each paragraph and on the Vocab tab, for Farsi and Spanish. Words already in the deck are skipped
- Help level also on the retry card of a failed Farsi lesson
- Farsi sentence splitting understands the Persian question mark

## Out of scope
- Help levels for Spanish (the setting is Farsi only for now)
- Word-by-word gloss laid out under the sentence (the word list is per paragraph)
- Pronunciation audio
- Old Farsi lessons: the stored shape changes, so they are cleared with `delete from sessions where language = 'fa';`

## Acceptance criteria (pass or fail)
1. A Farsi batch must return every paragraph number it was sent exactly once, and each paragraph needs its transliteration, English, key phrase and word list
2. A word missing its transliteration, English or form as written fails validation and is retried once
3. The stored Persian for each paragraph is the source text, not model output
4. Full help asks for every distinct word, Medium for every content word, Light for up to 8 key words
5. Farsi batches are 2 paragraphs at Full, 3 at Medium, 5 at Light. Spanish batches are unchanged
6. An unknown help level is rejected with 400, a missing one means Full
7. Saving many words at once creates one card per distinct word and skips ones already saved
8. The Vocab tab and each paragraph have a Save all button
9. A paragraph ending in the Persian question mark splits there when it is too long
10. No API keys in the repo

## Notes
- Test-first for help levels, batch limits, the Farsi schema, the merge, the prompts and the bulk save
- Surface the help-level names and the card layout in the PR description
- Cost and time go up a lot at Full help. Not measured, flag it
