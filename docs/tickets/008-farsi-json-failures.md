# Ticket 008: Farsi build fails with "Output was not valid JSON"

## Outcome
Farsi lessons build, and when a build fails the error says why.

## Likely causes (not confirmed, the raw output was never saved)
- The answer hit the output limit, so the JSON ends mid-way. Persian script costs many tokens and the Farsi lesson asked for 15 to 30 vocab, 12 sentences, 12 verbs with tables and every idiom
- The model added a sentence before or after the JSON

## In scope
- Find the JSON object even when the model adds text around it
- Detect a stop at the output limit, retry once with a note to keep it short, and give a clear "too long" error if it happens twice
- Smaller Farsi lists: 6 sentences, 10 to 15 vocab, 6 verbs, 5 idioms, 3 grammar notes
- Failure messages show how the bad output started (and ended, for long ones) and whether it looks cut off, so the next failure can be diagnosed from the lesson page

## Out of scope
- Batching Farsi by paragraph like Spanish (the next step if this is not enough)
- Raising the output limit

## Acceptance criteria (pass or fail)
1. JSON with a sentence before or after it parses
2. A cut-off answer is reported as cut off, plain prose is not
3. A stop at the output limit triggers one retry with a shorter-answer note, and a second one gives a "too long" error
4. The final error includes the start of a bad answer
5. The Farsi prompt asks for the smaller lists
6. No API keys in the repo

## Notes
- Test-first for the parser and the retry paths
