# 028 Dictionary import (step B2)

Fills the lexicon with English senses and inflected forms from a Wiktionary extract, so common words and their forms are known before any lesson is built.

## What it reads
A Wiktionary JSON-lines extract, one entry per line (the layout kaikki.org publishes per language). For each line:
- a dictionary word becomes a lexicon row with up to 5 senses (obsolete, archaic, historical, rare and similar senses are dropped), plus any inflected forms it lists;
- an entry whose senses are all "form of" another word becomes a form row (written form to dictionary form, with its grammar tags);
- names, phrases, affixes, and (for Spanish) multi-word entries are skipped. For Farsi the romanization becomes the transliteration.
Existing words keep their core rank, level and the senses already collected, and gain the dictionary senses.

## How to run
Needs the project's SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment, migration 0008 run, and an extract file downloaded from kaikki.org (one per language). Try a small slice first.

```bash
npx tsx scripts/import-wiktionary.ts es path/to/es-extract.jsonl --limit 2000 --dry-run
```

```bash
npx tsx scripts/import-wiktionary.ts es path/to/es-extract.jsonl
```

```bash
npx tsx scripts/import-wiktionary.ts fa path/to/fa-extract.jsonl.gz
```

## Caveats
- Written from the published layout and unit-tested on sample lines, not yet run on a real download. If a real file skips almost everything, send me a few lines of it.
- Wiktionary text is CC BY-SA. This is a private tool; keep the attribution if the lexicon is ever shared.
- A full Spanish import may add hundreds of thousands of form rows. Use --limit first and watch the database size.
