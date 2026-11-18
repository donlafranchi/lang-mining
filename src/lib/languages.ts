export const LANGUAGES = [
  { id: "es", label: "Spanish" },
  { id: "fa", label: "Farsi" },
] as const;

export type Language = (typeof LANGUAGES)[number]["id"];

export const DEFAULT_LANGUAGE: Language = "es";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGES.some((l) => l.id === value);
}

/** A missing language means Spanish, so older clients and old rows keep working. */
export function resolveLanguage(value: unknown): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function languageLabel(id: Language): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}
