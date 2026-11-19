// The database stores a conjugation table as jsonb, which hands the keys back in its own order (shortest first), so a
// table shows "yo, tú, nosotros, vosotros, él/ella/usted...". Tables are put back in the order a learner expects:
// singular persons first, then plural, first person before second before third.

const RANKS: [RegExp, number][] = [
  [/^(yo|من)$/u, 1],
  [/^(tú|tu|تو)$/u, 2],
  [/^vos$/u, 3],
  [/^(él|ella|usted|او|آن)(\b|$)/u, 4],
  [/^(nosotros|nosotras|ما)$/u, 5],
  [/^(vosotros|vosotras|شما)$/u, 6],
  [/^(ellos|ellas|ustedes|آنها|آن‌ها|ایشان)(\b|$)/u, 7],
];

function rank(pronoun: string): number {
  const key = pronoun.trim().toLowerCase();
  for (const [re, r] of RANKS) if (re.test(key)) return r;
  return 100;
}

/** The table's entries in teaching order. Unknown pronouns keep their place after the known ones. */
export function orderedConjugation(table: Record<string, string>): [string, string][] {
  return Object.entries(table)
    .map((entry, i) => ({ entry, i, r: rank(entry[0]) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.entry);
}
