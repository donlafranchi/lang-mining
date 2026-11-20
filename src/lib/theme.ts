// Light, dark, or follow the phone. The choice is kept on the device (localStorage), not in the account, and applied by
// a tiny script in the page head so the right colours show from the first paint with no flash.

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_KEY = "lm_theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** Runs before the page paints: puts data-theme="dark" or "light" on <html>. "system" and anything else leave it off. */
export function themeScript(): string {
  return `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}`;
}
