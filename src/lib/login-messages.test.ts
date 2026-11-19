import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./origin";
import { loginErrorText } from "./login-messages";

describe("loginErrorText", () => {
  it.each(["missing", "bad_name", "wrong", "setup"])("has fixed words for %s", (code) => {
    expect(loginErrorText(code)).toBeTruthy();
  });

  it("says how long a lock lasts, with sensible limits", () => {
    expect(loginErrorText("locked", "15")).toMatch(/15 minutes/);
    expect(loginErrorText("locked", "1")).toMatch(/1 minute\./);
    expect(loginErrorText("locked", "9999")).toMatch(/15 minutes/);
    expect(loginErrorText("locked", "abc")).toMatch(/15 minutes/);
    expect(loginErrorText("locked", undefined)).toMatch(/15 minutes/);
  });

  it("shows nothing for an unknown code, so a link cannot inject its own message", () => {
    expect(loginErrorText("Your account is locked, call 555-0100")).toBeNull();
    expect(loginErrorText(undefined)).toBeNull();
    expect(loginErrorText("")).toBeNull();
    expect(loginErrorText(["wrong"])).toBeNull();
  });

  it("says password, never passcode", () => {
    for (const code of ["missing", "bad_name", "wrong", "locked", "setup"]) {
      expect(loginErrorText(code, "5")).not.toMatch(/passcode/i);
    }
  });
});

describe("isSameOrigin", () => {
  const host = "lang.example";

  it("accepts a post from our own site", () => {
    expect(isSameOrigin("https://lang.example", host, "same-origin")).toBe(true);
  });

  it("refuses a post from another site", () => {
    expect(isSameOrigin("https://evil.example", host, null)).toBe(false);
    expect(isSameOrigin("https://lang.example.evil.example", host, null)).toBe(false);
  });

  it("refuses anything the browser says is cross-site, even without Origin", () => {
    expect(isSameOrigin(null, host, "cross-site")).toBe(false);
    expect(isSameOrigin("https://lang.example", host, "cross-site")).toBe(false);
  });

  it("allows a request with no browser headers at all", () => {
    expect(isSameOrigin(null, host, null)).toBe(true);
  });

  it("refuses a junk Origin", () => {
    expect(isSameOrigin("not a url", host, null)).toBe(false);
    expect(isSameOrigin("https://lang.example", null, null)).toBe(false);
  });
});
