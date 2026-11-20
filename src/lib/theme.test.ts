import { describe, expect, it } from "vitest";
import { THEME_KEY, isTheme, themeScript } from "./theme";

describe("theme", () => {
  it("knows the three choices", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("system")).toBe(true);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("the page script sets data-theme from the saved choice, and leaves it off for system or junk", () => {
    const run = (saved: string | null) => {
      const root: { dataset: Record<string, string>; removeAttribute?: (k: string) => void } = { dataset: {} };
      const storage = { getItem: (k: string) => (k === THEME_KEY ? saved : null) };
      new Function("document", "localStorage", themeScript())({ documentElement: root }, storage);
      return root.dataset.theme;
    };
    expect(run("dark")).toBe("dark");
    expect(run("light")).toBe("light");
    expect(run("system")).toBeUndefined();
    expect(run("nonsense")).toBeUndefined();
    expect(run(null)).toBeUndefined();
  });

  it("the page script survives storage being blocked", () => {
    const blocked = { getItem: () => { throw new Error("denied"); } };
    expect(() => new Function("document", "localStorage", themeScript())({ documentElement: { dataset: {} } }, blocked)).not.toThrow();
  });
});
