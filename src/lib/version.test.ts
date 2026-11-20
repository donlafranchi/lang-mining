import { describe, expect, it } from "vitest";
import { needsUpdate } from "./version";

describe("needsUpdate", () => {
  it("is true only when the server is running a different build from the one open on the phone", () => {
    expect(needsUpdate("abc123", "def456")).toBe(true);
    expect(needsUpdate("abc123", "abc123")).toBe(false);
  });
  it("never nags in development or when either side is unknown", () => {
    expect(needsUpdate("dev", "abc123")).toBe(false);
    expect(needsUpdate("abc123", "dev")).toBe(false);
    expect(needsUpdate("", "abc123")).toBe(false);
    expect(needsUpdate("abc123", undefined)).toBe(false);
  });
});
