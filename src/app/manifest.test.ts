import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const m = manifest();

/** Width and height from a PNG header, so a wrong "sizes" claim fails the test. */
function pngSize(path: string): string {
  const buf = readFileSync(join(process.cwd(), "public", path));
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

describe("web manifest", () => {
  it("installs as a full-screen app that starts at the home screen", () => {
    expect(m.name).toBe("Hand to Brain");
    expect(m.short_name).toBe("Hand to Brain");
    expect(m.id).toBe("/");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.orientation).toBe("portrait");
  });

  it("describes both languages, not just Spanish", () => {
    expect(m.description).toMatch(/Spanish/);
    expect(m.description).toMatch(/Farsi/);
  });

  it("uses the Coastal Slate colours", () => {
    expect(m.theme_color).toBe("#576668");
    expect(m.background_color).toBe("#f3f0f1");
  });

  it("has 192 and 512 icons for both any and maskable use", () => {
    for (const size of ["192x192", "512x512"]) {
      for (const purpose of ["any", "maskable"]) {
        const icon = m.icons?.find((i) => i.sizes === size && i.purpose === purpose);
        expect(icon, `${size} ${purpose}`).toBeDefined();
        expect(icon?.type).toBe("image/png");
      }
    }
  });

  it("points every icon at a real file of the size it claims", () => {
    for (const icon of m.icons ?? []) {
      expect(icon.src.startsWith("/icons/")).toBe(true);
      expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  });

  it("has shortcuts to the deck and the quiz", () => {
    const urls = (m.shortcuts ?? []).map((s) => s.url);
    expect(urls).toEqual(["/deck", "/quiz"]);
    for (const s of m.shortcuts ?? []) {
      expect(s.name.length).toBeGreaterThan(0);
    }
  });
});
