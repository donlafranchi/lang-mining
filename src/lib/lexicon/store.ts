import type { Language } from "../languages";
import { db } from "../supabase";
import { UserFacingError } from "../sessions";
import type { FormRow, LemmaRow } from "./model";

/** Everything the lexicon rules need from storage, so they can be tested without a database. */
export interface LexiconStore {
  getLemmas(language: Language, lemmaKeys: string[]): Promise<LemmaRow[]>;
  getForms(language: Language, formKeys: string[]): Promise<FormRow[]>;
  upsertLemmas(rows: LemmaRow[]): Promise<void>;
  upsertForms(rows: FormRow[]): Promise<void>;
}

const SETUP_MESSAGE =
  "The lexicon needs a one-time database update. Run supabase/migrations/0008_lexicon.sql in the Supabase SQL Editor, then try again.";

function fail(action: string, message: string): never {
  if (/lexicon_(lemmas|forms)/i.test(message) && /(does not exist|schema cache|could not find)/i.test(message)) {
    throw new UserFacingError(SETUP_MESSAGE, 503);
  }
  throw new Error(`${action}: ${message}`);
}

export function supabaseLexiconStore(): LexiconStore {
  return {
    async getLemmas(language, lemmaKeys) {
      if (lemmaKeys.length === 0) return [];
      const { data, error } = await db().from("lexicon_lemmas").select("*").eq("language", language).in("lemma_key", lemmaKeys);
      if (error) fail("Could not read the lexicon", error.message);
      return (data ?? []) as LemmaRow[];
    },
    async getForms(language, formKeys) {
      if (formKeys.length === 0) return [];
      const { data, error } = await db().from("lexicon_forms").select("*").eq("language", language).in("form_key", formKeys);
      if (error) fail("Could not read the lexicon", error.message);
      return (data ?? []) as FormRow[];
    },
    async upsertLemmas(rows) {
      if (rows.length === 0) return;
      const { error } = await db()
        .from("lexicon_lemmas")
        .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "language,lemma_key,pos" });
      if (error) fail("Could not save to the lexicon", error.message);
    },
    async upsertForms(rows) {
      if (rows.length === 0) return;
      const { error } = await db().from("lexicon_forms").upsert(rows, { onConflict: "language,form_key,lemma_key,pos" });
      if (error) fail("Could not save to the lexicon", error.message);
    },
  };
}
