# Ticket 005: Farsi lessons

## Outcome
Paste Farsi text or an article link and get a study lesson, the same way as Spanish. Farsi is a second language to learn from, with a single dialect (standard Iranian Persian).

## In scope
- Language picker on the paste form: Spanish or Farsi, remembered per device. Default Spanish
- Farsi lesson content: summary, notable sentences, vocab, idioms, verbs, grammar notes
- Every Persian item shows the Persian script, a Latin transliteration and English
- Verbs show infinitive and form with transliteration and English, a conjugation table, and a compound-verb block when the verb is a noun or adjective plus a light verb (kar kardan, "to work")
- Vocab and idioms mark register: formal, neutral or colloquial, since spoken Persian differs from written
- Persian text displays right to left
- `language` on each session (migration 0002). Spanish sessions need no change
- Home list marks Farsi lessons
- Farsi and Spanish share the same retention, background build, model picker, retry and delete

## Out of scope
- Dari, Tajik or other Persian varieties (single dialect for now)
- Audio, pronunciation recordings, quiz
- Vowel marks (harakat) on every word, only where it helps
- Changing the Spanish lesson

## Acceptance criteria (pass or fail)
1. A Farsi enrichment missing transliteration or English on any vocab, verb or segment fails validation and is retried once
2. Farsi and Spanish lessons each validate against their own schema, a Farsi response is not accepted for a Spanish session
3. Fragments and sentences are capped at 140 characters, same as Spanish
4. The Farsi system prompt asks for script, transliteration, English, register and the compound-verb block, and names no Spanish dialects
5. An unknown language is rejected with 400, and a request with no language is Spanish
6. Farsi lessons render right to left for Persian text and show transliteration
7. The app still works for Spanish before migration 0002 is applied (Farsi needs the migration)
8. No API keys in the repo

## Notes
- Test-first for the Farsi schema, the language allowlist and the prompt
- Surface the lesson layout and the model note (Haiku may be weaker on Persian, try Sonnet) in the PR
- Migration 0002 is a human step: run it in the lang-mining Supabase SQL Editor
