import type { Pattern } from "./patterns";

// Spanish patterns. Examples use only the text and english fields.
export const SPANISH_PATTERNS: Pattern[] = [
  {
    id: "present_perfect",
    title: "Present perfect (ha dado, he comido)",
    build: "haber (he, has, ha, hemos, han) + past participle (-ado, -ido)",
    explanation:
      "Says what someone has done, with a link to now, like English “has given”. The participle never changes, only haber does. Nothing goes between the two words: “no lo he visto”, never “he no visto”.",
    examples: [
      { text: "Ella ha dado una charla.", english: "She has given a talk." },
      { text: "Hemos comido muy bien.", english: "We have eaten very well." },
      { text: "¿Has visto mi teléfono?", english: "Have you seen my phone?" },
      { text: "Ya han llegado los invitados.", english: "The guests have already arrived." },
      { text: "Nunca he vivido en el mar.", english: "I have never lived by the sea." },
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
      { text: "Cuando llegué, ya había salido.", english: "When I arrived, she had already left." },
      { text: "No habíamos visto esa película.", english: "We hadn't seen that film." },
      { text: "Me dijo que había perdido las llaves.", english: "He told me he had lost the keys." },
      { text: "¿Habías estado aquí antes?", english: "Had you been here before?" },
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
      { text: "Espero que hayas dormido bien.", english: "I hope you slept well." },
      { text: "Es posible que haya llovido.", english: "It may have rained." },
      { text: "No creo que lo hayan hecho.", english: "I don't think they have done it." },
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
      { text: "Estoy leyendo un libro.", english: "I am reading a book." },
      { text: "Los niños están jugando afuera.", english: "The kids are playing outside." },
      { text: "¿Qué estás haciendo?", english: "What are you doing?" },
      { text: "Estaba durmiendo cuando llamaste.", english: "I was sleeping when you called." },
    ],
    hint: "estar (any tense) + a gerund ending in -ando or -iendo, such as estoy leyendo",
  },
  {
    id: "continuing",
    title: "Keep doing (sigue trabajando)",
    build: "seguir or continuar + gerund",
    explanation: "Someone is still doing something, or keeps on doing it.",
    examples: [
      { text: "Sigue lloviendo.", english: "It is still raining." },
      { text: "Ella continúa trabajando en el café.", english: "She keeps working at the café." },
      { text: "Seguimos esperando una respuesta.", english: "We are still waiting for an answer." },
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
      { text: "Voy a llamar a mi madre.", english: "I'm going to call my mother." },
      { text: "Vamos a viajar en mayo.", english: "We are going to travel in May." },
      { text: "Va a llover esta tarde.", english: "It is going to rain this afternoon." },
      { text: "¿Vas a venir a la fiesta?", english: "Are you going to come to the party?" },
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
      { text: "Acabo de llegar.", english: "I have just arrived." },
      { text: "Ella acaba de salir.", english: "She just left." },
      { text: "Acabamos de comer.", english: "We just ate." },
    ],
    hint: "acabar de + an infinitive",
  },
  {
    id: "again",
    title: "Do again (vuelve a intentar)",
    build: "volver a + infinitive",
    explanation: "Doing something again. Spanish has no word for “re-”, so it says “return to” the action.",
    examples: [
      { text: "Volví a leer el correo.", english: "I read the email again." },
      { text: "No vuelvas a hacerlo.", english: "Don't do it again." },
      { text: "Vuelven a abrir el museo en abril.", english: "They are reopening the museum in April." },
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
      { text: "Tengo que trabajar hoy.", english: "I have to work today." },
      { text: "Tienes que probar este plato.", english: "You have to try this dish." },
      { text: "Debemos salir temprano.", english: "We should leave early." },
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
      { text: "La carta fue escrita por mi abuelo.", english: "The letter was written by my grandfather." },
      { text: "Los libros son vendidos aquí.", english: "The books are sold here." },
      { text: "El puente fue destruido en la guerra.", english: "The bridge was destroyed in the war." },
    ],
    hint: "ser (any tense) + a past participle that agrees with the subject, often with por",
  },
  {
    id: "gustar_type",
    title: "Liking things (me gusta, me falta, me duele)",
    build: "me / te / le / nos / les + gusta (one thing) or gustan (many things) + the thing",
    explanation:
      "The thing you like is the subject, so the verb agrees with it and the person is an indirect pronoun: “me gusta el café” is literally “the coffee pleases me”. Doler, faltar, encantar, importar and interesar work the same way. Add “a ella” or “a Juan” in front for emphasis or to say who.",
    examples: [
      { text: "Me gusta el café.", english: "I like coffee." },
      { text: "Nos gustan las playas.", english: "We like the beaches." },
      { text: "¿Te gusta bailar?", english: "Do you like to dance?" },
      { text: "A ella le encanta la música.", english: "She loves music." },
      { text: "Me duele la cabeza.", english: "My head hurts." },
      { text: "Nos falta tiempo.", english: "We are short of time." },
    ],
    hint: "gustar-type verbs (gustar, encantar, doler, faltar, importar, interesar) with me/te/le/nos/les, such as me gusta or le duele",
  },
  {
    id: "object_pronouns",
    title: "Pronouns before the verb (lo vi, se lo di)",
    build: "me, te, lo, la, nos, los, las, le, les go before a conjugated verb, or attach to an infinitive, gerund or command",
    explanation:
      "They sit right before the verb: “lo vi”, I saw it. With an infinitive or command they attach to the end: “quiero verlo” or “dámelo”. When le or les meets lo, la, los or las, it becomes se: “se lo di”, I gave it to him.",
    examples: [
      { text: "Lo vi ayer.", english: "I saw him/it yesterday." },
      { text: "Quiero verlo. / Lo quiero ver.", english: "I want to see it." },
      { text: "Me lo dio mi madre.", english: "My mother gave it to me." },
      { text: "Se lo dije a Ana.", english: "I told it to Ana." },
      { text: "Dámelo, por favor.", english: "Give it to me, please." },
    ],
    hint: "object pronouns (me, te, lo, la, nos, los, las, le, les, se lo) before a verb or attached to it, such as se lo di or dámelo",
  },
  {
    id: "ser_estar",
    title: "Ser or estar (es alta, está cansada)",
    build: "ser for what something is; estar for where it is and how it is right now",
    explanation:
      "Both mean “to be”. Ser is identity, origin, characteristics and where an event takes place. Estar is location, temporary state and results. Some adjectives change meaning: “es aburrido” is boring, “está aburrido” is bored.",
    examples: [
      { text: "Ella es alta.", english: "She is tall." },
      { text: "Ella está cansada.", english: "She is tired." },
      { text: "Es de Chile.", english: "He is from Chile." },
      { text: "Está en Chile.", english: "He is in Chile (right now)." },
      { text: "La fiesta es en mi casa.", english: "The party is at my house." },
      { text: "Estoy aburrido. / Soy aburrido.", english: "I am bored. / I am boring." },
    ],
    hint: "ser or estar with an adjective or place where the choice carries meaning, such as es alta, está cansada, está en Chile; only when the paragraph shows a clear contrast or a notable use",
  },
  {
    id: "commands",
    title: "Commands (habla, no comas, venga)",
    build: "tú: the él form (habla, come). Negative and usted: the present subjunctive (no hables, hable)",
    explanation:
      "To tell someone to do something. The affirmative tú command looks like the he/she present form, with a few irregular ones: ven, ten, haz, di, sal, ve, pon, sé. A negative command borrows the subjunctive: “come” but “no comas”. Pronouns attach to the end of an affirmative command.",
    examples: [
      { text: "Habla más despacio.", english: "Speak more slowly." },
      { text: "No comas eso.", english: "Don't eat that." },
      { text: "Ven aquí.", english: "Come here." },
      { text: "Pase, por favor.", english: "Come in, please (to one person you address as usted)." },
      { text: "Díganme la verdad.", english: "Tell me the truth (to several people)." },
    ],
    hint: "commands to someone (imperative), such as habla, no comas, ven, pase, díganme",
  },
  {
    id: "hace_time",
    title: "Time since, or how long (hace + time)",
    build: "hace + a length of time, and a verb in the past (ago) or hace … que + present (for)",
    explanation:
      "“Hace” plus a length of time means that long ago: “llegué hace una hora”. Start with it and add “que”, and it means how long something has been going on: “hace dos años que estudio español”, I have been studying Spanish for two years.",
    examples: [
      { text: "Llegué hace una hora.", english: "I arrived an hour ago." },
      { text: "Hace dos años que estudio español.", english: "I have been studying Spanish for two years." },
      { text: "Nos conocimos hace cinco años.", english: "We met five years ago." },
      { text: "Hace mucho que no te veo.", english: "I haven't seen you in a long time." },
    ],
    hint: "hace + a length of time, such as hace dos años or hace mucho que",
    chunks: [
      { text: "hace dos años", english: "2 years ago" },
      { text: "hace una hora", english: "1 hour ago" },
      { text: "hace mucho", english: "a long time ago" },
      { text: "hace dos años que estudio", english: "I have been studying for 2 years" },
    ],
  },
  {
    id: "llevar_gerund",
    title: "For how long (llevo tres años viviendo aquí)",
    build: "llevar + length of time + gerund",
    explanation: "How long someone has been doing something. “Llevar” here means “to have been”, not “to carry”.",
    examples: [
      { text: "Llevo tres años viviendo aquí.", english: "I have been living here for three years." },
      { text: "Lleva dos horas esperando.", english: "She has been waiting for two hours." },
      { text: "Llevamos todo el día trabajando.", english: "We have been working all day." },
    ],
    hint: "llevar + a length of time + a gerund, such as llevo tres años viviendo",
  },
];
