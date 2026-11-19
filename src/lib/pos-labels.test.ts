import { describe, expect, it } from "vitest";
import { posLabel } from "./pos-labels";

describe("posLabel", () => {
  it("writes short tags out in full and leaves unknown ones alone", () => {
    expect(posLabel("adj")).toBe("adjective");
    expect(posLabel("Noun")).toBe("noun");
    expect(posLabel("phrase")).toBe("phrase");
  });
});
