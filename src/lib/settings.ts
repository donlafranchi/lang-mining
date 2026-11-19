import { isHelpLevel, type HelpLevel } from "./help";
import { isLanguage, type Language } from "./languages";
import type { UserRepo } from "./users";

export type SettingsResult = { ok: true } | { ok: false; status: 400; message: string };

/** Save how much help this person's lessons give in one language. Only ever touches their own row. */
export async function saveHelp(
  repo: UserRepo,
  userId: string,
  input: { language?: unknown; help?: unknown },
): Promise<SettingsResult> {
  if (!isLanguage(input.language)) return { ok: false, status: 400, message: "Pick Spanish or Farsi." };
  if (!isHelpLevel(input.help)) return { ok: false, status: 400, message: "Pick full, medium or light help." };
  await repo.setHelp(userId, input.language as Language, input.help as HelpLevel);
  return { ok: true };
}
