import { describe, expect, it } from "vitest";
import { batchLimits, defaultHelp, helpLabel, HELP_LEVELS, isHelpLevel, resolveHelp } from "./help";

describe("help levels", () => {
  it("lists full, medium and light", () => {
    expect(HELP_LEVELS.map((h) => h.id)).toEqual(["full", "medium", "light"]);
  });

  it("defaults to light for Spanish, which keeps today's lessons, and full for Farsi", () => {
    expect(defaultHelp("es")).toBe("light");
    expect(defaultHelp("fa")).toBe("full");
  });

  it.each(["full", "medium", "light"])("accepts %s", (v) => {
    expect(isHelpLevel(v)).toBe(true);
  });

  it.each(["", "FULL", "max", "none", 1, null, undefined])("rejects %j", (v) => {
    expect(isHelpLevel(v)).toBe(false);
  });

  it("falls back to the language's default for anything missing or unknown", () => {
    expect(resolveHelp(undefined, "fa")).toBe("full");
    expect(resolveHelp("nope", "fa")).toBe("full");
    expect(resolveHelp(undefined, "es")).toBe("light");
    expect(resolveHelp("nope", "es")).toBe("light");
  });

  it("uses a valid level for either language", () => {
    expect(resolveHelp("full", "es")).toBe("full");
    expect(resolveHelp("medium", "fa")).toBe("medium");
    expect(resolveHelp("light", "fa")).toBe("light");
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

  it("makes Spanish batches smaller as help goes up, with light unchanged from before", () => {
    expect(batchLimits("es", "light")).toEqual({ maxParagraphs: 5, maxChars: 3000 });
    expect(batchLimits("es", "medium").maxParagraphs).toBe(4);
    expect(batchLimits("es", "full").maxParagraphs).toBe(3);
    expect(batchLimits("es", "full").maxChars).toBeLessThan(batchLimits("es", "light").maxChars);
  });

  it("keeps Farsi batches unchanged", () => {
    expect(batchLimits("fa", "full")).toEqual({ maxParagraphs: 2, maxChars: 1200 });
    expect(batchLimits("fa", "medium")).toEqual({ maxParagraphs: 3, maxChars: 2000 });
    expect(batchLimits("fa", "light")).toEqual({ maxParagraphs: 5, maxChars: 3000 });
  });
});
