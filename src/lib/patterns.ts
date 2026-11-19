// Grammar patterns that are built from more than one word, so they are taught once as a pattern, with examples
// across different verbs, instead of as a separate item for every verb. Written by hand, never by the model, so the
// teaching is the same every time. The model only says which pattern appears in a paragraph.

export type PatternExample = { spanish: string; english: string };

export type Pattern = {
  id: string;
  title: string;
  /** The recipe, short enough to scan. */
  build: string;
  /** One or two plain sentences for an English speaker. */
  explanation: string;
  examples: PatternExample[];
  /** One line for the model, so it can recognise the pattern. */
  hint: string;
};

export const SPANISH_PATTERNS: Pattern[] = [
  {
    id: "present_perfect",
    title: "Present perfect (ha dado, he comido)",
    build: "haber (he, has, ha, hemos, han) + past participle (-ado, -ido)",
    explanation:
      "Says what someone has done, with a link to now, like English “has given”. The participle never changes, only haber does. Nothing goes between the two words: “no lo he visto”, never “he no visto”.",
    examples: [
      { spanish: "Ella ha dado una charla.", english: "She has given a talk." },
      { spanish: "Hemos comido muy bien.", english: "We have eaten very well." },
      { spanish: "¿Has visto mi teléfono?", english: "Have you seen my phone?" },
      { spanish: "Ya han llegado los invitados.", english: "The guests have already arrived." },
      { spanish: "Nunca he vivido en el mar.", english: "I have never lived by the sea." },
    ],
    hint: "haber (he, has, ha, hemos, han) + a past participle, such as ha dado, han vivido",
  },
  {
    id: "pluperfect",
    title: "Past perfect (había comido)",
    build: "había, habías, había, habíamos, habían + past participle",
    explanation:
      "Something that had already happened before another moment in the past, like English “had eaten”.",
    examples: [
      { spanish: "Cuando llegué, ya había salido.", english: "When I arrived, she had already left." },
      { spanish: "No habíamos visto esa película.", english: "We hadn't seen that film." },
      { spanish: "Me dijo que había perdido las llaves.", english: "He told me he had lost the keys." },
      { spanish: "¿Habías estado aquí antes?", english: "Had you been here before?" },
    ],
    hint: "había/habías/habíamos/habían + a past participle",
  },
  {
    id: "subjunctive_perfect",
    title: "Perfect subjunctive (haya hablado)",
    build: "haya, hayas, haya, hayamos, hayan + past participle",
    explanation:
      "The present perfect after phrases of doubt, wish or feeling: “espero que hayas llegado bien”, I hope you have arrived safely.",
    examples: [
      { spanish: "Espero que hayas dormido bien.", english: "I hope you slept well." },
      { spanish: "Es posible que haya llovido.", english: "It may have rained." },
      { spanish: "No creo que lo hayan hecho.", english: "I don't think they have done it." },
    ],
    hint: "haya/hayas/hayamos/hayan + a past participle, usually after que",
  },
  {
    id: "progressive",
    title: "Happening now (estoy comiendo)",
    build: "estar (estoy, estás, está, estamos, están) + gerund (-ando, -iendo)",
    explanation:
      "An action in progress right now, like English “is eating”. Spanish uses it less than English does, only for what is happening at this moment.",
    examples: [
      { spanish: "Estoy leyendo un libro.", english: "I am reading a book." },
      { spanish: "Los niños están jugando afuera.", english: "The kids are playing outside." },
      { spanish: "¿Qué estás haciendo?", english: "What are you doing?" },
      { spanish: "Estaba durmiendo cuando llamaste.", english: "I was sleeping when you called." },
    ],
    hint: "estar (any tense) + a gerund ending in -ando or -iendo, such as estoy leyendo",
  },
  {
    id: "continuing",
    title: "Keep doing (sigue trabajando)",
    build: "seguir or continuar + gerund",
    explanation: "Someone is still doing something, or keeps on doing it.",
    examples: [
      { spanish: "Sigue lloviendo.", english: "It is still raining." },
      { spanish: "Ella continúa trabajando en el café.", english: "She keeps working at the café." },
      { spanish: "Seguimos esperando una respuesta.", english: "We are still waiting for an answer." },
    ],
    hint: "seguir or continuar (any form) + a gerund",
  },
  {
    id: "near_future",
    title: "Going to (va a comer)",
    build: "ir (voy, vas, va, vamos, van) + a + infinitive",
    explanation:
      "What is about to happen or what someone plans to do, like English “is going to”. It is the everyday way to talk about the future.",
    examples: [
      { spanish: "Voy a llamar a mi madre.", english: "I'm going to call my mother." },
      { spanish: "Vamos a viajar en mayo.", english: "We are going to travel in May." },
      { spanish: "Va a llover esta tarde.", english: "It is going to rain this afternoon." },
      { spanish: "¿Vas a venir a la fiesta?", english: "Are you going to come to the party?" },
    ],
    hint: "ir (any form) + a + an infinitive, such as va a llover",
  },
  {
    id: "just_did",
    title: "Just did (acaba de llegar)",
    build: "acabar de + infinitive",
    explanation:
      "Something happened a moment ago. Despite “acabar” meaning to finish, here it means “has just”.",
    examples: [
      { spanish: "Acabo de llegar.", english: "I have just arrived." },
      { spanish: "Ella acaba de salir.", english: "She just left." },
      { spanish: "Acabamos de comer.", english: "We just ate." },
    ],
    hint: "acabar de + an infinitive",
  },
  {
    id: "again",
    title: "Do again (vuelve a intentar)",
    build: "volver a + infinitive",
    explanation: "Doing something again. Spanish has no word for “re-”, so it says “return to” the action.",
    examples: [
      { spanish: "Volví a leer el correo.", english: "I read the email again." },
      { spanish: "No vuelvas a hacerlo.", english: "Don't do it again." },
      { spanish: "Vuelven a abrir el museo en abril.", english: "They are reopening the museum in April." },
    ],
    hint: "volver (any form) + a + an infinitive",
  },
  {
    id: "obligation",
    title: "Have to (tiene que salir)",
    build: "tener que + infinitive (or deber + infinitive)",
    explanation:
      "Something that must be done. “Tener que” is a plain have-to, while “deber” sounds more like should or ought to.",
    examples: [
      { spanish: "Tengo que trabajar hoy.", english: "I have to work today." },
      { spanish: "Tienes que probar este plato.", english: "You have to try this dish." },
      { spanish: "Debemos salir temprano.", english: "We should leave early." },
    ],
    hint: "tener que or deber + an infinitive",
  },
  {
    id: "passive_ser",
    title: "Passive voice (fue escrito)",
    build: "ser + past participle, which agrees with the thing (escrito, escrita, escritos)",
    explanation:
      "The thing that receives the action is the subject: “la casa fue construida”, the house was built. Unlike with haber, here the participle changes to match the subject.",
    examples: [
      { spanish: "La carta fue escrita por mi abuelo.", english: "The letter was written by my grandfather." },
      { spanish: "Los libros son vendidos aquí.", english: "The books are sold here." },
      { spanish: "El puente fue destruido en la guerra.", english: "The bridge was destroyed in the war." },
    ],
    hint: "ser (any tense) + a past participle that agrees with the subject, often with por",
  },
];

const BY_ID = new Map(SPANISH_PATTERNS.map((p) => [p.id, p]));

export function patternById(id: string): Pattern | undefined {
  return BY_ID.get(id);
}

/** The pattern list as lines for the model prompt. */
export function patternPromptLines(): string {
  return SPANISH_PATTERNS.map((p) => `  - ${p.id}: ${p.hint}`).join("\n");
}

export type PatternUse = { id: string; quote: string };

/** The patterns used anywhere in a lesson, each once, with every quote where it appears. Unknown ids are dropped. */
export function lessonPatterns(paragraphs: { patterns?: PatternUse[] }[]): { pattern: Pattern; quotes: string[] }[] {
  const found = new Map<string, string[]>();
  for (const p of paragraphs) {
    for (const use of p.patterns ?? []) {
      if (!BY_ID.has(use.id)) continue;
      const quotes = found.get(use.id) ?? [];
      if (use.quote.trim() && !quotes.includes(use.quote.trim())) quotes.push(use.quote.trim());
      found.set(use.id, quotes);
    }
  }
  return [...found].map(([id, quotes]) => ({ pattern: BY_ID.get(id)!, quotes }));
}
