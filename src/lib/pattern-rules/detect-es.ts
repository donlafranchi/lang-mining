// Finds Spanish grammar patterns from the analyzer's output, by rules, with no model involved. A rule looks at the
// words next to each other: for example "he/has/ha/hemos/han" followed by a participle. The small spaCy model
// mislabels some auxiliaries ("hayas", "vuelvas"), so the few verbs these patterns hang on are recognised by their
// written forms as well as by the analyzer's dictionary form. The catalog in patterns-es.ts has the teaching; this only
// says where a pattern appears and quotes it.

import type { AnalyzedToken } from "../analysis/contract";
import type { PatternUse } from "../patterns";

const forms = (s: string) => new Set(s.split(/\s+/));

const HABER_PRES = forms("he has ha hemos habéis han");
const HABER_IMP = forms("había habías habíamos habíais habían");
const HABER_SUB = forms("haya hayas hayamos hayáis hayan");
const ESTAR = forms("estoy estás está estamos estáis están estaba estabas estábamos estaban estuve estuvo estuvimos estuvieron esté estés estén estaré estará estarán estaría");
const IR = forms("voy vas va vamos vais van iba ibas íbamos ibais iban fui fue fuimos fueron iré irá iremos irán vaya vayas vayamos vayan");
const SEGUIR = forms("sigo sigues sigue seguimos siguen seguía seguías seguíamos seguían siguió siguieron continúo continúas continúa continuamos continúan continuaba continuaban continuó");
const ACABAR = forms("acabo acabas acaba acabamos acaban acabé acabó acabaron acababa acababan");
const VOLVER = forms("vuelvo vuelves vuelve volvemos vuelven volví volvió volvieron volvía volvían vuelva vuelvas volvamos vuelvan");
const TENER = forms("tengo tienes tiene tenemos tienen tenía tenías teníamos tenían tuve tuvo tuvimos tuvieron tendré tendrá tendrán tendría");
const DEBER = forms("debo debes debe debemos deben debía debían debió debería deberías deberían");
const SER = forms("es son fue fueron era eran será serán sería sea sean");
const HACE = forms("hace hacía");
const LLEVAR = forms("llevo llevas lleva llevamos llevan llevaba llevaban llevó");
const GUSTAR = forms(
  "gusta gustan gustó gustaba gustaría encanta encantan encantaba duele duelen dolía falta faltan faltaba importa importan interesa interesan molesta molestan fascina fascinan queda quedan",
);
// Forms that are commands in almost every use. Other commands look like ordinary verbs, so they are not guessed.
const COMMANDS = forms("ven ten haz di sal ve pon sé oye mira escucha dime dame dinos dile dale mire oiga venga pase siga vaya");

const DATIVE = forms("me te le les nos os");
const OBJECT_FIRST = forms("me te se nos os le les");
const OBJECT_SECOND = forms("lo la los las");
const TIME = forms("año mes día semana hora minuto segundo rato tiempo siglo década momento noche");
const IRREGULAR_PARTICIPLES = forms("visto hecho dicho escrito puesto vuelto abierto roto muerto cubierto resuelto frito satisfecho");

function feats(t: AnalyzedToken): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of t.morph.split(/[\s|]+/)) {
    const [k, v] = part.split("=");
    if (k && v) m.set(k, v);
  }
  return m;
}
const has = (t: AnalyzedToken | undefined, key: string, value: string) => !!t && (feats(t).get(key) ?? "").split(",").includes(value);
const word = (t: AnalyzedToken | undefined) => (t ? t.text.toLowerCase() : "");

const isParticiple = (t: AnalyzedToken | undefined) =>
  !!t && (has(t, "VerbForm", "Part") || IRREGULAR_PARTICIPLES.has(word(t)) || /(ad|id)[oa]s?$/.test(word(t)) && word(t).length > 4);
const isGerund = (t: AnalyzedToken | undefined) => !!t && (has(t, "VerbForm", "Ger") || (/(ando|iendo|yendo)$/.test(word(t)) && word(t) !== "cuando"));
const isInfinitive = (t: AnalyzedToken | undefined) =>
  !!t && (has(t, "VerbForm", "Inf") || (t.pos === "verb" && /[aei]r(l[oa]s?|me|te|se|nos|os|le|les)?$/.test(word(t)) && word(t).length > 3));
const isPunct = (t: AnalyzedToken | undefined) => !t || t.pos === "other";

/** The next word, stepping over at most one adverb ("ha ya dado"). Punctuation ends the look. */
function nextWord(tokens: AnalyzedToken[], i: number): AnalyzedToken | undefined {
  const a = tokens[i + 1];
  if (!a || isPunct(a)) return undefined;
  if (a.pos === "adv") {
    const b = tokens[i + 2];
    return b && !isPunct(b) ? b : undefined;
  }
  return a;
}

export function detectSpanishPatterns(tokens: AnalyzedToken[], text: string): PatternUse[] {
  const found = new Map<string, string>();
  const add = (id: string, from: AnalyzedToken, to: AnalyzedToken) => {
    if (!found.has(id)) found.set(id, text.slice(from.start, to.end));
  };

  tokens.forEach((t, i) => {
    const w = word(t);
    const next = tokens[i + 1];
    const after = tokens[i + 2];
    const part = nextWord(tokens, i);

    if (HABER_PRES.has(w) && isParticiple(part)) add("present_perfect", t, part!);
    if (HABER_IMP.has(w) && isParticiple(part)) add("pluperfect", t, part!);
    if (HABER_SUB.has(w) && isParticiple(part)) add("subjunctive_perfect", t, part!);

    if (ESTAR.has(w) && isGerund(part)) add("progressive", t, part!);
    if (SEGUIR.has(w) && isGerund(part)) add("continuing", t, part!);

    if (IR.has(w) && word(next) === "a" && isInfinitive(after)) add("near_future", t, after!);
    if (ACABAR.has(w) && word(next) === "de" && isInfinitive(after)) add("just_did", t, after!);
    if (VOLVER.has(w) && word(next) === "a" && isInfinitive(after)) add("again", t, after!);

    if (TENER.has(w) && word(next) === "que" && isInfinitive(after)) add("obligation", t, after!);
    if (DEBER.has(w) && isInfinitive(next)) add("obligation", t, next!);

    // ser + participle, but only where the participle really is one (not an adjective like "es cansado").
    if (SER.has(w) && next && has(next, "VerbForm", "Part") && !isPunct(next)) add("passive_ser", t, next);

    if (GUSTAR.has(w)) {
      for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
        if (DATIVE.has(word(tokens[k]))) {
          add("gustar_type", tokens[k], t);
          break;
        }
      }
    }

    // Two pronouns together (se lo, me lo), one pronoun right before a verb (lo vi), or one attached to the end (verlo).
    if (OBJECT_FIRST.has(w) && OBJECT_SECOND.has(word(next)) && after && !isPunct(after)) add("object_pronouns", t, after);
    else if (OBJECT_SECOND.has(w) && next && next.pos === "verb") add("object_pronouns", t, next);
    if (t.pos === "verb" && / él$/.test(t.lemma) && /(l[oa]s?|me|te|se|nos|os|le|les)$/.test(w)) add("object_pronouns", t, t);
    // Two pronouns glued to a command (dámelo, díselo): the analyzer often calls these nouns.
    if (/^[a-záéíóúñ]{2,}(me|te|se|nos|os|le|les)(lo|la|los|las)$/.test(w)) add("object_pronouns", t, t);

    const atClauseStart = i === 0 || isPunct(tokens[i - 1]);
    if (COMMANDS.has(w) && atClauseStart && (t.pos === "verb" || t.pos === "noun")) add("commands", t, t);
    if (t.pos === "verb" && has(t, "Mood", "Imp")) add("commands", t, t);
    if (w === "no" && atClauseStart && next && has(next, "Mood", "Sub")) add("commands", t, next);
    // "no comes" read as a plain present is ambiguous, but a clause-initial "no" + second person -as/-es is a command.
    if (w === "no" && atClauseStart && next && next.pos === "verb" && has(next, "Person", "2") && /[ae]s$/.test(word(next)) && !has(next, "Tense", "Past")) add("commands", t, next);

    if (HACE.has(w)) {
      for (let k = i + 1; k <= Math.min(tokens.length - 1, i + 4); k++) {
        const n = tokens[k];
        if (isPunct(n)) break;
        if (TIME.has(n.lemma) || TIME.has(word(n))) {
          add("hace_time", t, n);
          break;
        }
        // "hace mucho que no te veo", but not "hace mucho frío".
        if (word(n) === "mucho" && k === i + 1 && (word(tokens[k + 1]) === "que" || isPunct(tokens[k + 1]))) {
          add("hace_time", t, n);
          break;
        }
      }
    }

    if (LLEVAR.has(w)) {
      for (let k = i + 1; k <= Math.min(tokens.length - 1, i + 5); k++) {
        const n = tokens[k];
        if (isGerund(n)) {
          add("llevar_gerund", t, n);
          break;
        }
        if (isPunct(n) || n.pos === "verb") break;
      }
    }
  });

  return [...found].map(([id, quote]) => ({ id, quote }));
}
