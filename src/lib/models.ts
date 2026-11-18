export const MODELS = [
  { id: "claude-haiku-5-5", label: "Haiku 5.5 (fast)" },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5 (balanced)" },
  { id: "claude-opus-5-5", label: "Opus 5.5 (best, slowest)" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export const DEFAULT_MODEL: ModelId = "claude-haiku-5-5";

export function isModel(value: unknown): value is ModelId {
  return typeof value === "string" && MODELS.some((m) => m.id === value);
}

/** Only allowlisted ids reach the API, so a request can never pick an arbitrary model. */
export function resolveModel(value: unknown): ModelId {
  return isModel(value) ? value : DEFAULT_MODEL;
}

export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}
