import { describe, expect, it } from "vitest";
import { effectiveStatus, STALE_AFTER_MS } from "./status";

const now = new Date("2026-11-18T12:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("effectiveStatus", () => {
  it("leaves ready and failed alone", () => {
    expect(effectiveStatus({ status: "ready", created_at: ago(STALE_AFTER_MS * 5) }, now)).toBe("ready");
    expect(effectiveStatus({ status: "failed", created_at: ago(0) }, now)).toBe("failed");
  });

  it("keeps a recent processing session as processing", () => {
    expect(effectiveStatus({ status: "processing", created_at: ago(STALE_AFTER_MS - 1000) }, now)).toBe("processing");
  });

  it("treats an old processing session as failed", () => {
    expect(effectiveStatus({ status: "processing", created_at: ago(STALE_AFTER_MS + 1000) }, now)).toBe("failed");
  });
});
