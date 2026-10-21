export const DEFAULT_RETENTION_DAYS = 7;

/** Parse the configured retention window. Anything that is not a positive whole number falls back to the default. */
export function retentionDays(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw.trim())) return DEFAULT_RETENTION_DAYS;
  const days = Number(raw.trim());
  return days > 0 ? days : DEFAULT_RETENTION_DAYS;
}

export function deleteAfter(created: Date, days: number): Date {
  return new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
}

export interface SourceTextStore {
  /** Delete every source text whose delete_after is at or before the given ISO time. Returns rows deleted. */
  deleteExpired(nowIso: string): Promise<number>;
}

/** The retention job. Only source text is ever deleted; mined enrichments stay. */
export async function purgeExpired(store: SourceTextStore, now: Date): Promise<number> {
  return store.deleteExpired(now.toISOString());
}
