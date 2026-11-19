import { describe, expect, it } from "vitest";
import { afterFailure, isLocked, LOCK_MINUTES, MAX_FAILED_ATTEMPTS, minutesLeft } from "./lockout";

const now = new Date("2026-11-20T12:00:00.000Z");
const min = (n: number) => new Date(now.getTime() + n * 60_000).toISOString();

describe("lockout", () => {
  it("locks after 5 wrong passcodes for 15 minutes", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCK_MINUTES).toBe(15);
  });

  it("counts failures without locking before the limit", () => {
    expect(afterFailure(0, now)).toEqual({ failed_attempts: 1, locked_until: null });
    expect(afterFailure(3, now)).toEqual({ failed_attempts: 4, locked_until: null });
  });

  it("locks on the fifth failure and clears the count", () => {
    expect(afterFailure(4, now)).toEqual({ failed_attempts: 0, locked_until: min(15) });
  });

  it("is locked only until the lock time", () => {
    expect(isLocked(min(1), now)).toBe(true);
    expect(isLocked(min(0), now)).toBe(false);
    expect(isLocked(min(-5), now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });

  it("says how many minutes are left, rounded up, at least one", () => {
    expect(minutesLeft(min(15), now)).toBe(15);
    expect(minutesLeft(new Date(now.getTime() + 61_000).toISOString(), now)).toBe(2);
    expect(minutesLeft(new Date(now.getTime() + 1_000).toISOString(), now)).toBe(1);
  });
});
