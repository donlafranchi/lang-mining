import { describe, expect, it } from "vitest";
import { orderedConjugation } from "./conjugation-order";

const keys = (t: Record<string, string>) => orderedConjugation(t).map(([k]) => k);

describe("orderedConjugation", () => {
  it("puts singular before plural: yo, tú, él/ella/usted, nosotros, vosotros, ellos", () => {
    // The order the database hands them back in: shortest key first.
    const scrambled = { yo: "doy", tú: "das", nosotros: "damos", vosotros: "dais", "él/ella/usted": "da", "ellos/ellas/ustedes": "dan" };
    expect(keys(scrambled)).toEqual(["yo", "tú", "él/ella/usted", "nosotros", "vosotros", "ellos/ellas/ustedes"]);
  });
  it("handles the model's own spellings and keeps unknown keys last in their original order", () => {
    expect(keys({ ellos: "a", nosotros: "b", "él / ella": "c", usted: "d", tu: "e", yo: "f", zzz: "g", vos: "h" })).toEqual(["yo", "tu", "vos", "él / ella", "usted", "nosotros", "ellos", "zzz"]);
  });
  it("orders Persian pronouns the same way", () => {
    expect(keys({ ما: "1", شما: "2", من: "3", آنها: "4", او: "5", تو: "6" })).toEqual(["من", "تو", "او", "ما", "شما", "آنها"]);
  });
});
