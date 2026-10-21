import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RETENTION_DAYS, deleteAfter, purgeExpired, retentionDays } from "./retention";

describe("retentionDays", () => {
  it("defaults to 7 days", () => {
    expect(DEFAULT_RETENTION_DAYS).toBe(7);
    expect(retentionDays(undefined)).toBe(7);
  });

  it("reads a configured value", () => {
    expect(retentionDays("3")).toBe(3);
  });

  it.each(["", "abc", "0", "-2", "1.5"])("falls back to the default for %j", (v) => {
    expect(retentionDays(v)).toBe(7);
  });
});

describe("deleteAfter", () => {
  it("adds the retention window to the creation time", () => {
    const created = new Date("2026-10-21T12:00:00.000Z");
    expect(deleteAfter(created, 7).toISOString()).toBe("2026-10-28T12:00:00.000Z");
  });
});

describe("purgeExpired", () => {
  it("asks the store to delete everything due by now and returns the count", async () => {
    const store = { deleteExpired: vi.fn().mockResolvedValue(4) };
    const now = new Date("2026-11-01T00:00:00.000Z");
    const count = await purgeExpired(store, now);
    expect(count).toBe(4);
    expect(store.deleteExpired).toHaveBeenCalledWith("2026-11-01T00:00:00.000Z");
  });
});
