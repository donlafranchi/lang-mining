import { describe, expect, it } from "vitest";
import { nameKey, validateName } from "./user-names";

describe("nameKey", () => {
  it("ignores case, outer spaces and repeated spaces", () => {
    expect(nameKey("  Maria  Lopez ")).toBe("maria lopez");
    expect(nameKey("DON")).toBe(nameKey("don"));
  });

  it("treats accented and plain letters as different names", () => {
    expect(nameKey("José")).not.toBe(nameKey("Jose"));
  });

  it("normalises the same letters written two ways", () => {
    expect(nameKey("José")).toBe(nameKey("José"));
  });
});

describe("validateName", () => {
  it("accepts ordinary names, including non-Latin ones", () => {
    expect(validateName("Don")).toBeNull();
    expect(validateName("Maria Lopez")).toBeNull();
    expect(validateName("علی")).toBeNull();
  });

  it.each(["", "   ", "x".repeat(41)])("refuses %j", (name) => {
    expect(validateName(name)).not.toBeNull();
  });

  it("refuses control characters", () => {
    expect(validateName("a\u0000b")).not.toBeNull();
    expect(validateName("a\nb")).not.toBeNull();
  });
});
