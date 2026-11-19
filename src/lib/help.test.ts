import { describe, expect, it } from "vitest";
import { batchLimits, DEFAULT_HELP, helpLabel, HELP_LEVELS, isHelpLevel, resolveHelp } from "./help";

describe("help levels", () => {
  it("lists full, medium and light, full first and the default", () => {
    expect(HELP_LEVELS.map((h) => h.id)).toEqual(["full", "medium", "light"]);
    expect(DEFAULT_HELP).toBe("full");
  });

  it.each(["full", "medium", "light"])("accepts %s", (v) => {
    expect(isHelpLevel(v)).toBe(true);
  });

  it.each(["", "FULL", "max", "none", 1, null, undefined])("rejects %j", (v) => {
    expect(isHelpLevel(v)).toBe(false);
  });

  it("falls back to full for anything unknown", () => {
    expect(resolveHelp(undefined)).toBe("full");
    expect(resolveHelp("nope")).toBe("full");
    expect(resolveHelp("light")).toBe("light");
  });

  it("has a readable label for each level", () => {
    for (const h of HELP_LEVELS) expect(helpLabel(h.id).length).toBeGreaterThan(4);
  });
});

describe("batchLimits", () => {
  it("makes Farsi batches smaller as help goes up", () => {
    expect(batchLimits("fa", "full").maxParagraphs).toBe(2);
    expect(batchLimits("fa", "medium").maxParagraphs).toBe(3);
    expect(batchLimits("fa", "light").maxParagraphs).toBe(5);
    expect(batchLimits("fa", "full").maxChars).toBeLessThan(batchLimits("fa", "light").maxChars);
  });

  it("leaves Spanish batches alone at every level", () => {
    const base = batchLimits("es", "full");
    expect(base).toEqual({ maxParagraphs: 5, maxChars: 3000 });
    expect(batchLimits("es", "light")).toEqual(base);
    expect(batchLimits("es", "medium")).toEqual(base);
  });
});
