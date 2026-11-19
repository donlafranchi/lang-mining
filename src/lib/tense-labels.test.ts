import { describe, expect, it } from "vitest";
import { tenseLabel } from "./tense-labels";

describe("tenseLabel", () => {
  it("names the service's tenses in plain English", () => {
    expect(tenseLabel("indicativo", "presente")).toBe("Present");
    expect(tenseLabel("indicativo", "pretérito-perfecto-simple")).toBe("Preterite (simple past)");
    expect(tenseLabel("subjuntivo", "presente")).toBe("Present subjunctive");
    expect(tenseLabel("imperativo", "afirmativo")).toBe("Commands");
    expect(tenseLabel("progresivo", "pretérito-imperfecto")).toBe("Past progressive (was doing)");
  });
  it("falls back to the service's own words for one it does not know", () => {
    expect(tenseLabel("indicativo", "algo-nuevo")).toBe("indicativo algo nuevo");
  });
});
