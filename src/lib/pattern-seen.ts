import { patternById } from "./patterns";
import { UserFacingError } from "./sessions";
import { db } from "./supabase";

const SETUP_MESSAGE =
  "Remembering which patterns you have seen needs a one-time database update. Run supabase/migrations/0007_patterns_seen.sql in the Supabase SQL Editor, then try again.";

function missingTable(message: string): boolean {
  return /user_patterns_seen/i.test(message) && /(does not exist|schema cache|could not find)/i.test(message);
}

/** The pattern ids this person has already been shown. Before migration 0007 this is empty rather than an error. */
export async function listSeenPatterns(userId: string): Promise<string[]> {
  const { data, error } = await db().from("user_patterns_seen").select("pattern_id").eq("user_id", userId);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Could not load seen patterns: ${error.message}`);
  }
  return (data ?? []).map((r) => String((r as { pattern_id: string }).pattern_id));
}

/** Mark one pattern as seen for this person only. Unknown ids are refused. */
export async function markPatternSeen(userId: string, patternId: unknown): Promise<void> {
  if (typeof patternId !== "string" || !patternById(patternId)) throw new UserFacingError("Unknown pattern.", 400);
  const { error } = await db()
    .from("user_patterns_seen")
    .upsert({ user_id: userId, pattern_id: patternId }, { onConflict: "user_id,pattern_id", ignoreDuplicates: true });
  if (error) {
    if (missingTable(error.message)) throw new UserFacingError(SETUP_MESSAGE, 503);
    throw new Error(`Could not save: ${error.message}`);
  }
}
