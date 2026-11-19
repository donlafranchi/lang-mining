import { describe, expect, it } from "vitest";
import { verbTags } from "./verb-meta";

const v = (tense: string, mood: string, person: string, irregular = false) => ({ tense, mood, person, irregular });

describe("verbTags", () => {
  it("names a gerund plainly and drops the empty person", () => {
    expect(verbTags(v("present progressive (gerund)", "none", "none", true))).toEqual(["gerund (-ing)", "irregular"]);
    expect(verbTags(v("gerund", "non-finite (table shows the present)", "no person"))).toEqual(["gerund (-ing)"]);
  });
  it("names a participle plainly", () => {
    expect(verbTags(v("past participle", "non-finite (table shows the present)", "no person"))).toEqual(["past participle"]);
    expect(verbTags(v("past participle", "participle", "n/a"))).toEqual(["past participle"]);
  });
  it("gives tense and person for a finite form, and mood only when it is not the ordinary one", () => {
    expect(verbTags(v("preterite", "indicative", "él/ella/usted"))).toEqual(["preterite", "él/ella/usted"]);
    expect(verbTags(v("present", "subjunctive", "yo"))).toEqual(["present subjunctive", "yo"]);
    expect(verbTags(v("command", "imperative", "tú"))).toEqual(["command", "tú"]);
  });
});
