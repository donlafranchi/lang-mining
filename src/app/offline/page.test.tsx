import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The offline page is shown when scripts may not be available, so its button must work without any.
describe("offline page", () => {
  const source = readFileSync(join(process.cwd(), "src/app/offline/page.tsx"), "utf8");

  it("retries with a plain link, not a script", () => {
    expect(source).toMatch(/<a[^>]*href=""/);
    expect(source).toMatch(/Try again/);
  });

  it("uses no client component", () => {
    expect(source).not.toMatch(/use client/);
    expect(source).not.toMatch(/OfflineRetry/);
  });
});
