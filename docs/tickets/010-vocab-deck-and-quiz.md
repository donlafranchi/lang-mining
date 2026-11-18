# Ticket 010: Save words to a deck and get quizzed

## Outcome
Save words from any lesson to a vocabulary list, then get quizzed on them like flashcards, with the cards you struggle with coming back sooner.

## In scope
- A "Save word" button on every vocab entry (paragraph cards and the Vocab tab), for Spanish and Farsi
- A deck of saved words, with a per-language view, a due count, and delete
- A quiz page: one due card at a time, tap to flip, then rate it Again, Good or Easy
- Simple spaced repetition: a new or missed card is due again in 10 minutes, good moves it up a box, easy moves it up two. Boxes are 1, 3, 7, 14, 30 and 60 days
- Card front is the word in the target language (Persian script for Farsi). Back is the English, transliteration for Farsi, part of speech and the example
- Saving the same word twice does nothing (one card per language and word)
- Home screen links to the deck and the quiz with the due count
- Table `deck_items` (migration 0004), following docs/spec.md. If the migration is not applied the rest of the app still works and the deck says what to run

## Out of scope
- Idioms and verbs as cards (the table has a `kind` column for later)
- English to target direction, typing the answer, multiple choice
- Streaks, stats, reminders or notifications
- Editing a card
- Quiz sessions beyond the next 20 due cards

## Acceptance criteria (pass or fail)
1. A saved word appears in the deck with its English, and saving it again does not create a second card
2. The quiz only shows cards that are due, oldest first, at most 20
3. Again makes the card due in 10 minutes and puts it back in box 0
4. Good from box 0 gives box 1 due in 1 day, and the interval grows through the boxes up to 60 days
5. Easy moves up two boxes, capped at the last box
6. Deleting a card removes it from the deck and the quiz
7. Farsi cards show Persian script on the front and transliteration on the back, right to left
8. Without migration 0004 the home page and lessons still load
9. No API keys in the repo

## Notes
- Test-first for the scheduling rule, the card payload and the word key
- Migration 0004 is a human step: run it in the lang-mining Supabase SQL Editor
