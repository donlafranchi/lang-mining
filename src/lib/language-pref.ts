import { cookies } from "next/headers";
import { LANGUAGE_COOKIE } from "./language-cookie";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "./languages";


/** The language in the page's ?language= if valid, else the one this person last picked on this device, else Spanish. */
export async function preferredLanguage(param?: string | string[]): Promise<Language> {
  const asked = Array.isArray(param) ? param[0] : param;
  if (isLanguage(asked)) return asked;
  const saved = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
}
