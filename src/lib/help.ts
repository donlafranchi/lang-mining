import type { Language } from "./languages";

// How many words a lesson glosses: a beginner needs every word, a stronger learner does not.
export const HELP_LEVELS = [
  { id: "full", label: "Full help (every word)" },
  { id: "medium", label: "Medium (content words)" },
  { id: "light", label: "Light (key words)" },
] as const;

export type HelpLevel = (typeof HELP_LEVELS)[number]["id"];

/** Spanish keeps today's light lessons by default. Farsi starts at full help, since most of its words are new. */
export function defaultHelp(language: Language): HelpLevel {
  return language === "fa" ? "full" : "light";
}

export function isHelpLevel(value: unknown): value is HelpLevel {
  return typeof value === "string" && HELP_LEVELS.some((h) => h.id === value);
}

/** A missing or unknown level means the language's default. */
export function resolveHelp(value: unknown, language: Language = "es"): HelpLevel {
  return isHelpLevel(value) ? value : defaultHelp(language);
}

export function helpLabel(id: HelpLevel): string {
  return HELP_LEVELS.find((h) => h.id === id)?.label ?? id;
}

export type BatchLimits = { maxParagraphs: number; maxChars: number };

const SPANISH_LIMITS: Record<HelpLevel, BatchLimits> = {
  // More words per paragraph means more output, so more help means smaller batches. Light is what Spanish always used.
  full: { maxParagraphs: 3, maxChars: 2000 },
  medium: { maxParagraphs: 4, maxChars: 2500 },
  light: { maxParagraphs: 5, maxChars: 3000 },
};

const FARSI_LIMITS: Record<HelpLevel, BatchLimits> = {
  // Farsi lessons are one sentence per page, so a batch holds many short items. Persian script is token heavy and every
  // extra word is more output, so more help still means smaller batches.
  full: { maxParagraphs: 5, maxChars: 1200 },
  medium: { maxParagraphs: 7, maxChars: 1800 },
  light: { maxParagraphs: 10, maxChars: 2500 },
};

/** How many paragraphs go into one model call. */
export function batchLimits(language: Language, help: HelpLevel): BatchLimits {
  return language === "fa" ? FARSI_LIMITS[help] : SPANISH_LIMITS[help];
}
