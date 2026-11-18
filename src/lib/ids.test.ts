import { describe, expect, it } from "vitest";
import { isUuid } from "./ids";

describe("isUuid", () => {
  it("accepts a standard uuid", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e7b-8c5a-1d2e3f4a5b6c")).toBe(true);
  });

  it("accepts an uppercase uuid", () => {
    expect(isUuid("3F2B8C1E-9A4D-4E7B-8C5A-1D2E3F4A5B6C")).toBe(true);
  });

  it.each(["", "abc", "123", "3f2b8c1e-9a4d-4e7b-8c5a-1d2e3f4a5b6", "3f2b8c1e-9a4d-4e7b-8c5a-1d2e3f4a5b6cc", "../etc/passwd", "1; drop table sessions"])(
    "rejects %j",
    (v) => {
      expect(isUuid(v)).toBe(false);
    },
  );
});
