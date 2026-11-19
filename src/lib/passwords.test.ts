import { describe, expect, it } from "vitest";
import { hashPasscode, MIN_PASSCODE_LENGTH, validatePasscode, verifyPasscode } from "./passwords";

describe("passcode hashing", () => {
  it("verifies the right passcode and rejects a wrong one", async () => {
    const stored = await hashPasscode("correct horse");
    expect(await verifyPasscode("correct horse", stored)).toBe(true);
    expect(await verifyPasscode("correct horsf", stored)).toBe(false);
    expect(await verifyPasscode("", stored)).toBe(false);
  });

  it("uses a new salt each time, so the same passcode hashes differently", async () => {
    const a = await hashPasscode("same passcode");
    const b = await hashPasscode("same passcode");
    expect(a).not.toBe(b);
    expect(await verifyPasscode("same passcode", a)).toBe(true);
    expect(await verifyPasscode("same passcode", b)).toBe(true);
  });

  it("never stores the passcode itself", async () => {
    const stored = await hashPasscode("hunter2hunter2");
    expect(stored).not.toContain("hunter2");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("handles non-ASCII passcodes", async () => {
    const stored = await hashPasscode("گذرواژه‌ی من");
    expect(await verifyPasscode("گذرواژه‌ی من", stored)).toBe(true);
    expect(await verifyPasscode("گذرواژه", stored)).toBe(false);
  });

  it.each(["", "plain", "scrypt$", "scrypt$1$2$3$x$y", "bcrypt$abc", "scrypt$16384$8$1$!!$!!"])(
    "treats a malformed stored value %j as a mismatch, never a crash",
    async (stored) => {
      expect(await verifyPasscode("anything", stored)).toBe(false);
    },
  );
});

describe("validatePasscode", () => {
  it("needs at least 6 characters", () => {
    expect(MIN_PASSCODE_LENGTH).toBe(6);
    expect(validatePasscode("12345")).not.toBeNull();
    expect(validatePasscode("123456")).toBeNull();
  });

  it("refuses an empty or all-space passcode and absurdly long ones", () => {
    expect(validatePasscode("")).not.toBeNull();
    expect(validatePasscode("      ")).not.toBeNull();
    expect(validatePasscode("x".repeat(500))).not.toBeNull();
  });
});
