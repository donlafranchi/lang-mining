// Loads a Wiktionary extract (kaikki.org JSON lines) into our lexicon. Run on a computer with the project's
// environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY), after running migration 0008.
//
//   npx tsx scripts/import-wiktionary.ts es path/to/es-extract.jsonl
//   npx tsx scripts/import-wiktionary.ts fa path/to/fa-extract.jsonl.gz --limit 5000
//   add --dry-run to read the file and count without saving anything

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { importDictionary } from "../src/lib/lexicon/dictionary-import";
import type { LexiconStore } from "../src/lib/lexicon/store";
import { supabaseLexiconStore } from "../src/lib/lexicon/store";
import { isLanguage } from "../src/lib/languages";

async function main() {
  const [language, file, ...flags] = process.argv.slice(2);
  if (!isLanguage(language) || !file) {
    console.error("Usage: npx tsx scripts/import-wiktionary.ts <es|fa> <file.jsonl[.gz]> [--limit N] [--dry-run]");
    process.exit(1);
  }
  const dry = flags.includes("--dry-run");
  const limitAt = flags.indexOf("--limit");
  const limit = limitAt >= 0 ? Number(flags[limitAt + 1]) : undefined;

  const raw = createReadStream(file);
  const input = file.endsWith(".gz") ? raw.pipe(createGunzip()) : raw;
  const lines = createInterface({ input, crlfDelay: Infinity });

  // A dry run reads and counts but writes nothing.
  const nothing: LexiconStore = { getLemmas: async () => [], getForms: async () => [], upsertLemmas: async () => {}, upsertForms: async () => {} };
  const store = dry ? nothing : supabaseLexiconStore();

  const counts = await importDictionary(store, language, lines, {
    limit,
    onProgress: (c) => process.stdout.write(`\r${c.lines} lines, ${c.lemmas} words, ${c.forms} forms, ${c.skipped} skipped`),
  });
  console.log(`\nDone${dry ? " (dry run, nothing saved)" : ""}: ${counts.lines} lines, ${counts.lemmas} words, ${counts.forms} forms, ${counts.skipped} skipped.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
