/**
 * Turns a database error from saving a session into a message that says which one-time update is missing.
 * Returns null when the error is not one of those, so the caller keeps its generic message.
 */
export function explainSaveError(message: string): string | null {
  if (/'language' column/i.test(message)) {
    return "Farsi needs a one-time database update. Run supabase/migrations/0002_language.sql in the Supabase SQL Editor, then try again.";
  }
  if (/"delete_after"/i.test(message) && /not-null/i.test(message)) {
    return "This needs a one-time database update. Run supabase/migrations/0003_keep_source.sql in the Supabase SQL Editor, then try again.";
  }
  return null;
}

/** The deck needs migration 0004. Says so when its table is missing, otherwise returns null. */
export function explainDeckError(message: string): string | null {
  if (/deck_items/i.test(message) && /(does not exist|schema cache|could not find)/i.test(message)) {
    return "The deck needs a one-time database update. Run supabase/migrations/0004_deck.sql in the Supabase SQL Editor, then try again.";
  }
  return null;
}
