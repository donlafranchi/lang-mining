// The small tags under a verb: what kind of form it is, who it is for, and whether it is irregular. The model words
// these its own way ("present progressive (gerund)", person "none"), so they are tidied here.

type VerbMeta = { tense: string; mood: string; person: string; irregular: boolean };

const EMPTY = new Set(["", "none", "n/a", "na", "no person", "-", "—"]);

export function verbTags(v: VerbMeta): string[] {
  const tense = v.tense.toLowerCase();
  const mood = v.mood.toLowerCase();
  const tags: string[] = [];
  if (tense.includes("gerund") || mood.includes("gerund")) tags.push("gerund (-ing)");
  else if (tense.includes("participle") || mood.includes("participle")) tags.push("past participle");
  else {
    const ordinary = mood === "indicative" || mood === "imperative" || EMPTY.has(mood) || tense.includes(mood);
    tags.push(ordinary ? v.tense : `${v.tense} ${v.mood}`);
    if (!EMPTY.has(v.person.trim().toLowerCase())) tags.push(v.person);
  }
  if (v.irregular) tags.push("irregular");
  return tags;
}
