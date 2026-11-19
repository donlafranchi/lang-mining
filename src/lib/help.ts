import type { Language } from "./languages";

// How many words a lesson glosses. Only Farsi uses it for now: a beginner needs every word, a stronger learner does not.
export const HELP_LEVELS = [
  { id: "full", label: "Full help (every word)" },
  { id: "medium", label: "Medium (content words)" },
  { id: "light", label: "Light (key words)" },
] as const;

export type HelpLevel = (typeof HELP_LEVELS)[number]["id"];

export const DEFAULT_HELP: HelpLevel = "full";

export function isHelpLevel(value: unknown): value is HelpLevel {
  return typeof value === "string" && HELP_LEVELS.some((h) => h.id === value);
}

/** A missing or unknown level means full help. */
export function resolveHelp(value: unknown): HelpLevel {
  return isHelpLevel(value) ? value : DEFAULT_HELP;
}

export function helpLabel(id: HelpLevel): string {
  return HELP_LEVELS.find((h) => h.id === id)?.label ?? id;
}

export type BatchLimits = { maxParagraphs: number; maxChars: number };

const SPANISH_LIMITS: BatchLimits = { maxParagraphs: 5, maxChars: 3000 };

const FARSI_LIMITS: Record<HelpLevel, BatchLimits> = {
  // Persian script is token heavy and every extra word is more output, so more help means smaller batches.
  full: { maxParagraphs: 2, maxChars: 1200 },
  medium: { maxParagraphs: 3, maxChars: 2000 },
  light: { maxParagraphs: 5, maxChars: 3000 },
};

/** How many paragraphs go into one model call. */
export function batchLimits(language: Language, help: HelpLevel): BatchLimits {
  return language === "fa" ? FARSI_LIMITS[help] : SPANISH_LIMITS;
}
