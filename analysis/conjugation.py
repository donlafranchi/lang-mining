"""Spanish conjugation tables, built from rules and templates (verbecc), not from a language model."""

from __future__ import annotations

import json
import logging
from functools import lru_cache

# The six persons a learner sees, with the written pronoun for each and the verbecc pronouns that give them.
PERSONS = [
    ("yo", ("yo",)),
    ("tú", ("tú",)),
    ("él/ella/usted", ("él", "ella", "usted")),
    ("nosotros", ("nosotros",)),
    ("vosotros", ("vosotros",)),
    ("ellos/ellas/ustedes", ("ellos", "ellas", "ustedes")),
]

# Templates that mean "completely regular". Anything else is irregular in some way.
REGULAR_TEMPLATES = {"cort:ar", "deb:er", "viv:ir"}


@lru_cache(maxsize=1)
def _conjugator():
    logging.disable(logging.CRITICAL)  # verbecc is noisy
    from verbecc import CompleteConjugator
    from verbecc.core.defs.types.lang_code import LangCodeISO639_1

    return CompleteConjugator(lang=LangCodeISO639_1.es)


def feats(morph: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in morph.replace("|", " ").split():
        if "=" in part:
            k, v = part.split("=", 1)
            out[k] = v
    return out


def tense_key(morph: str) -> tuple[str, str]:
    """The (mood, tense) names verbecc uses for the form described by spaCy's grammar features."""
    f = feats(morph)
    mood, tense = f.get("Mood", ""), f.get("Tense", "")
    if mood == "Cnd":
        return "condicional", "presente"
    if mood == "Imp":
        return "imperativo", "afirmativo"
    if mood == "Sub":
        return "subjuntivo", "pretérito-imperfecto-1" if tense == "Imp" else "presente"
    if mood == "Ind":
        return "indicativo", {
            "Pres": "presente",
            "Past": "pretérito-perfecto-simple",
            "Imp": "pretérito-imperfecto",
            "Fut": "futuro",
            "Pqp": "pretérito-pluscuamperfecto",
        }.get(tense, "presente")
    # Participles, gerunds and infinitives have no person: show the present, which is what a learner meets most.
    return "indicativo", "presente"


def _bare(phrase: str, pronouns: tuple[str, ...]) -> str:
    """'yo doy' to 'doy'. Reflexive verbs keep their pronoun ('me lavo')."""
    for p in pronouns:
        if phrase.startswith(p + " "):
            return phrase[len(p) + 1 :]
    return phrase


def _table(rows: list[dict]) -> dict[str, str]:
    table: dict[str, str] = {}
    for label, pronouns in PERSONS:
        for row in rows:
            if row.get("pr") in pronouns and row.get("c"):
                table[label] = _bare(row["c"][0], pronouns)
                break
    return table


# The order a learner meets them in. Anything verbecc adds beyond these is left out.
ALL_TENSES = [
    ("indicativo", "presente"),
    ("indicativo", "pretérito-perfecto-simple"),
    ("indicativo", "pretérito-imperfecto"),
    ("indicativo", "futuro"),
    ("condicional", "presente"),
    ("subjuntivo", "presente"),
    ("subjuntivo", "pretérito-imperfecto-1"),
    ("imperativo", "afirmativo"),
    ("indicativo", "pretérito-perfecto-compuesto"),
    ("indicativo", "pretérito-pluscuamperfecto"),
    ("indicativo", "futuro-perfecto"),
    ("condicional", "perfecto"),
    ("subjuntivo", "pretérito-perfecto"),
]


def conjugate_all(lemma: str) -> dict:
    """Every common tense of a verb, for the 'more forms' view."""
    data = json.loads(_conjugator().conjugate(lemma).to_json())
    tenses = []
    for mood, tense in ALL_TENSES:
        rows = data["moods"].get(mood, {}).get(tense)
        if rows:
            tenses.append({"mood": mood, "tense": tense, "table": _table(rows)})
    return {"lemma": lemma, "irregular": data["verb"].get("template") not in REGULAR_TEMPLATES, "tenses": tenses}


def conjugate(lemma: str, morph: str) -> dict:
    data = json.loads(_conjugator().conjugate(lemma).to_json())
    mood, tense = tense_key(morph)
    rows = data["moods"].get(mood, {}).get(tense) or data["moods"]["indicativo"]["presente"]
    table = _table(rows)
    verb = data["verb"]
    return {
        "lemma": lemma,
        "irregular": verb.get("template") not in REGULAR_TEMPLATES,
        "mood": mood,
        "tense": tense,
        "table": table,
    }
