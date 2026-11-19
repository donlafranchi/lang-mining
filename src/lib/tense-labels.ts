const LABELS: Record<string, string> = {
  "indicativo/presente": "Present",
  "indicativo/pretérito-perfecto-simple": "Preterite (simple past)",
  "indicativo/pretérito-imperfecto": "Imperfect (was doing)",
  "indicativo/futuro": "Future",
  "condicional/presente": "Conditional (would)",
  "subjuntivo/presente": "Present subjunctive",
  "subjuntivo/pretérito-imperfecto-1": "Imperfect subjunctive",
  "imperativo/afirmativo": "Commands",
  "indicativo/pretérito-perfecto-compuesto": "Present perfect (has done)",
  "indicativo/pretérito-pluscuamperfecto": "Pluperfect (had done)",
  "indicativo/futuro-perfecto": "Future perfect (will have done)",
  "condicional/perfecto": "Conditional perfect (would have done)",
  "subjuntivo/pretérito-perfecto": "Present perfect subjunctive",
};

/** A tense as the conjugation service names it, in plain English for the "more forms" view. */
export function tenseLabel(mood: string, tense: string): string {
  return LABELS[`${mood}/${tense}`] ?? `${mood} ${tense.replace(/-/g, " ")}`;
}
