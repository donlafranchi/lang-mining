# Ticket 009: Farsi compound-verb parts returned as a list

## Outcome
Farsi lessons no longer fail when the model returns the compound-verb parts as a list instead of one string.

## Evidence
Live error: `verbs.0.compound.parts: Invalid input: expected string, received array` on four verbs. The JSON itself was valid, so the earlier fixes worked.

## In scope
- Accept `parts` as a string or a list of strings, store one string (list joined with " + ")
- Say in the prompt that `parts` is one string, with an example

## Out of scope
- Any other Farsi schema loosening (wait for real failures)

## Acceptance criteria (pass or fail)
1. A list of strings parses and is stored as one string joined with " + "
2. A string is stored unchanged
3. An empty list, empty strings, numbers and null are rejected
4. The Farsi prompt says `parts` is one string
5. No API keys in the repo

## Notes
- Test-first
