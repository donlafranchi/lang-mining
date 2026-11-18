import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, isModel, MODELS, resolveModel } from "./models";

describe("isModel", () => {
  it("accepts every listed model", () => {
    for (const m of MODELS) expect(isModel(m.id)).toBe(true);
  });

  it.each(["", "gpt-4", "claude-haiku-5-5 ", 42, null, undefined])("rejects %j", (v) => {
    expect(isModel(v)).toBe(false);
  });
});

describe("resolveModel", () => {
  it("uses a valid request", () => {
    expect(resolveModel("claude-opus-5-5")).toBe("claude-opus-5-5");
  });

  it("falls back to the default for missing or unknown input", () => {
    expect(resolveModel(undefined)).toBe(DEFAULT_MODEL);
    expect(resolveModel("nope")).toBe(DEFAULT_MODEL);
  });
});
