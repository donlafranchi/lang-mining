import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SPLASH_SIZES, splashFile, splashMedia, startupImages } from "./splash";

describe("splash screens", () => {
  it("has a picture on disk for every screen size", () => {
    for (const s of SPLASH_SIZES) expect(existsSync(join(process.cwd(), "public", splashFile(s))), splashFile(s)).toBe(true);
  });
  it("names each picture by its pixel size and matches it to its screen", () => {
    expect(splashFile({ width: 393, height: 852, ratio: 3 })).toBe("/splash/1179x2556.png");
    expect(splashMedia({ width: 393, height: 852, ratio: 3 })).toContain("(device-width: 393px) and (device-height: 852px)");
    expect(startupImages()).toHaveLength(SPLASH_SIZES.length);
  });
  it("has no two sizes that would match the same screen", () => {
    const media = SPLASH_SIZES.map(splashMedia);
    expect(new Set(media).size).toBe(media.length);
  });
});
