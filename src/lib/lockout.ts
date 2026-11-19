export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export type LockState = { failed_attempts: number; locked_until: string | null };

/** The new state after one wrong passcode. The fifth locks the account and starts the count again. */
export function afterFailure(previousFailures: number, now: Date): LockState {
  const failures = previousFailures + 1;
  if (failures >= MAX_FAILED_ATTEMPTS) {
    return { failed_attempts: 0, locked_until: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() };
  }
  return { failed_attempts: failures, locked_until: null };
}

export function isLocked(lockedUntil: string | null, now: Date): boolean {
  return lockedUntil !== null && new Date(lockedUntil).getTime() > now.getTime();
}

export function minutesLeft(lockedUntil: string, now: Date): number {
  return Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - now.getTime()) / 60_000));
}
