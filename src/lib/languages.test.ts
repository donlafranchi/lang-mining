import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES, resolveLanguage } from "./languages";

describe("languages", () => {
  it("lists Spanish and Farsi, Spanish first", () => {
    expect(LANGUAGES.map((l) => l.id)).toEqual(["es", "fa"]);
    expect(DEFAULT_LANGUAGE).toBe("es");
  });

  it.each(["es", "fa"])("accepts %s", (v) => {
    expect(isLanguage(v)).toBe(true);
  });

  it.each(["", "en", "fa-IR", "FA", 7, null, undefined])("rejects %j", (v) => {
    expect(isLanguage(v)).toBe(false);
  });

  it("defaults to Spanish when nothing is sent", () => {
    expect(resolveLanguage(undefined)).toBe("es");
    expect(resolveLanguage("fa")).toBe("fa");
  });
});
