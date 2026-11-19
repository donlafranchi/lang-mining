import { describe, expect, it } from "vitest";
import { cleanTitle, MAX_TITLE_CHARS } from "./titles";

describe("cleanTitle", () => {
  it("trims and collapses spaces and line breaks", () => {
    expect(cleanTitle("  La  vida\n en la isla ")).toEqual({ ok: true, title: "La vida en la isla" });
  });
  it("keeps Persian and accents", () => {
    expect(cleanTitle("گربه و موش — ¿Qué tal?")).toEqual({ ok: true, title: "گربه و موش — ¿Qué tal?" });
  });
  it("refuses empty, blank and non-text titles", () => {
    expect(cleanTitle("   ").ok).toBe(false);
    expect(cleanTitle(undefined).ok).toBe(false);
    expect(cleanTitle(42).ok).toBe(false);
  });
  it("refuses a title that is too long", () => {
    expect(cleanTitle("x".repeat(MAX_TITLE_CHARS + 1)).ok).toBe(false);
    expect(cleanTitle("x".repeat(MAX_TITLE_CHARS)).ok).toBe(true);
  });
});
