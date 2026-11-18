# Ticket 003: Verb translations, reflexive verbs, one Spanish lesson

## Outcome
Every verb shows its English meaning. Verbs used with "se" get an extra block explaining the reflexive meaning. Spanish lessons are built once, with no dialect picker.

## In scope
- Verb entries gain `english` (meaning of the infinitive) and `form_english` (meaning of the form as used in the source), both required
- Verb entries gain `reflexive`: null, or { infinitive_reflexive, english, kind, explanation } where kind is reflexive, meaning_change, reciprocal, accidental or impersonal
- Verbs tab shows the English lines and a reflexive block for verbs used reflexively
- Conjugation tables for reflexive uses include the reflexive pronoun (me lavo, te lavas, se lava)
- Remove the Spanish dialect picker, `detected_dialect`, `dialect_tags`, `similar_in_other_dialects` and `dialect_note`. Idiom `region_tags` stay
- One lesson per session. The `sessions.dialect` column stays and holds a fixed default
- Retry for a failed lesson stays, without a dialect
- Update CLAUDE.md and docs/spec.md for the dialect decision, and record the disposable-database rule

## Out of scope
- Dialect-specific idioms or a slang side (parked, maybe later)
- Delete lessons and the back button (next ticket)
- Farsi (later ticket)
- Keeping old lessons: the new fields are required, old rows are cleared with `delete from sessions;`

## Acceptance criteria (pass or fail)
1. An enrichment missing `english` or `form_english` on any verb fails validation and is retried once
2. An enrichment missing the `reflexive` key on any verb fails validation (null is valid)
3. A reflexive entry with an unknown `kind` fails validation
4. The Verbs tab shows both English lines for every verb and a reflexive block only when `reflexive` is not null
5. Mine it sends no dialect and the API accepts a request without one
6. The system prompt no longer names dialects and tells the model to include the reflexive pronoun in conjugation tables
7. No API keys in the repo

## Notes
- Test-first for the schema and the prompt
- Surface the reflexive kinds and block layout in the PR description for review
