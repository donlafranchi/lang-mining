import { describe, expect, it } from "vitest";
import { installHint, isIos } from "./install";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

describe("isIos", () => {
  it("is true for iPhone and iPad user agents", () => {
    expect(isIos(IPHONE, "iPhone", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)", "iPad", 5)).toBe(true);
  });

  it("is true for an iPad that reports itself as a Mac, which has a touch screen", () => {
    expect(isIos(MAC, "MacIntel", 5)).toBe(true);
  });

  it("is false for a real Mac and for Android", () => {
    expect(isIos(MAC, "MacIntel", 0)).toBe(false);
    expect(isIos(ANDROID, "Linux armv8l", 5)).toBe(false);
  });
});

describe("installHint", () => {
  const base = { standalone: false, dismissed: false, ios: false, canPrompt: false };

  it("shows nothing inside the installed app", () => {
    expect(installHint({ ...base, standalone: true, ios: true, canPrompt: true })).toBeNull();
  });

  it("shows nothing once dismissed", () => {
    expect(installHint({ ...base, dismissed: true, ios: true })).toBeNull();
    expect(installHint({ ...base, dismissed: true, canPrompt: true })).toBeNull();
  });

  it("offers the Install button where the browser provides one", () => {
    expect(installHint({ ...base, canPrompt: true })).toBe("prompt");
  });

  it("shows the Add to Home Screen steps on iPhone, which has no install prompt", () => {
    expect(installHint({ ...base, ios: true })).toBe("ios");
  });

  it("shows nothing in a desktop browser with no install prompt", () => {
    expect(installHint(base)).toBeNull();
  });
});
