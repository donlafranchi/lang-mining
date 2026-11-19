import { cookies } from "next/headers";

/** Whether common words are underlined in lessons. On unless the person switched it off in Settings (a cookie, no database). */
export const UNDERLINE_COOKIE = "lm_underline";

export async function underlineOn(): Promise<boolean> {
  return (await cookies()).get(UNDERLINE_COOKIE)?.value !== "off";
}
