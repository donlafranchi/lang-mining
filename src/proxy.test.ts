import { describe, expect, it } from "vitest";
import { config } from "./proxy";

// The matcher says which paths the passcode gate runs on. Turn it into a regex to check real paths.
const gated = new RegExp(`^${config.matcher[0]}$`);

describe("passcode gate matcher", () => {
  it.each([
    "/sw.js",
    "/offline",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/favicon.ico",
    "/login",
    "/api/login",
    "/_next/static/chunks/a.js",
  ])("lets %s through without the passcode", (path) => {
    expect(gated.test(path)).toBe(false);
  });

  it.each(["/", "/deck", "/quiz", "/admin", "/api/admin/users", "/api/logout", "/sessions/3f2b8c1e-9a4d-4e7b-8c5a-1d2e3f4a5b6c", "/api/sessions", "/api/deck", "/api/deck/abc/review"])(
    "still gates %s",
    (path) => {
      expect(gated.test(path)).toBe(true);
    },
  );
});
