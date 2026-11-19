import os

import pytest
from fastapi.testclient import TestClient

os.environ["ANALYSIS_KEY"] = "test-key"

from analyzers import analyze  # noqa: E402
from app import app  # noqa: E402

client = TestClient(app)
KEY = {"x-analysis-key": "test-key"}


def words(result):
    return {t["text"]: t for t in result["tokens"]}


def test_spanish_gives_dictionary_forms_pos_and_grammar():
    [r] = analyze("es", ["Ella ha dado un libro a los niños."])
    w = words(r)
    assert w["dado"]["lemma"] == "dar" and w["dado"]["pos"] == "verb"
    assert "Tense=Past" in w["dado"]["morph"] and "VerbForm=Part" in w["dado"]["morph"]
    assert w["ha"]["lemma"] == "haber" and "Person=3" in w["ha"]["morph"]
    assert w["niños"]["lemma"] == "niño" and w["niños"]["pos"] == "noun"


def test_offsets_point_into_the_original_text():
    text = "Ella ha dado un libro."
    [r] = analyze("es", [text])
    for t in r["tokens"]:
        assert text[t["start"] : t["end"]] == t["text"]


def test_persian_gives_dictionary_forms_and_infinitives():
    text = "او کتاب‌ها را خواند و من می‌روم."
    [r] = analyze("fa", [text])
    w = words(r)
    assert w["کتاب‌ها"]["lemma"] == "کتاب"
    assert w["خواند"]["lemma"] == "خواندن" and w["خواند"]["pos"] == "verb"
    assert w["می‌روم"]["lemma"] == "رفتن" and w["می‌روم"]["pos"] == "verb"
    for t in r["tokens"]:
        assert text[t["start"] : t["end"]] == t["text"]


def test_each_paragraph_is_analysed_separately_and_in_order():
    r = analyze("es", ["Hola mundo.", "Adiós."])
    assert len(r) == 2 and words(r[1]).keys() >= {"Adiós"}


def test_service_requires_the_key():
    body = {"language": "es", "paragraphs": ["Hola."]}
    assert client.post("/analyze", json=body).status_code == 401
    assert client.post("/analyze", json=body, headers={"x-analysis-key": "wrong"}).status_code == 401
    ok = client.post("/analyze", json=body, headers=KEY)
    assert ok.status_code == 200 and ok.json()["paragraphs"][0]["tokens"][0]["text"] == "Hola"


def test_service_refuses_everything_when_no_key_is_configured(monkeypatch):
    monkeypatch.delenv("ANALYSIS_KEY")
    r = client.post("/analyze", json={"language": "es", "paragraphs": ["Hola."]}, headers=KEY)
    assert r.status_code == 401


def test_service_rejects_other_languages_and_too_much_text():
    assert client.post("/analyze", json={"language": "fr", "paragraphs": ["x"]}, headers=KEY).status_code == 422
    big = {"language": "es", "paragraphs": ["a" * 60_000, "b" * 60_000]}
    assert client.post("/analyze", json=big, headers=KEY).status_code == 413


def test_health_needs_no_key():
    assert client.get("/health").json() == {"ok": True}


# --- conjugation ---
from conjugation import conjugate, tense_key  # noqa: E402


def test_irregular_verbs_are_flagged_and_regular_ones_are_not():
    assert conjugate("dar", "Mood=Ind Tense=Pres Person=3")["irregular"] is True
    assert conjugate("hablar", "Mood=Ind Tense=Pres Person=3")["irregular"] is False
    assert conjugate("comer", "Mood=Ind Tense=Pres")["irregular"] is False
    assert conjugate("tener", "Mood=Ind Tense=Pres")["irregular"] is True


def test_table_has_the_six_persons_in_the_tense_of_the_form():
    t = conjugate("hablar", "Mood=Ind Number=Sing Person=3 Tense=Past VerbForm=Fin")
    assert t["tense"] == "pretérito-perfecto-simple"
    assert t["table"] == {
        "yo": "hablé", "tú": "hablaste", "él/ella/usted": "habló",
        "nosotros": "hablamos", "vosotros": "hablasteis", "ellos/ellas/ustedes": "hablaron",
    }
    present = conjugate("dar", "Mood=Ind Tense=Pres")["table"]
    assert present["yo"] == "doy" and present["nosotros"] == "damos"
    assert conjugate("ir", "Mood=Ind Tense=Pres")["table"]["yo"] == "voy"


def test_participles_show_the_present_and_other_moods_are_mapped():
    assert tense_key("Tense=Past VerbForm=Part") == ("indicativo", "presente")
    assert tense_key("Mood=Sub Tense=Pres") == ("subjuntivo", "presente")
    assert tense_key("Mood=Ind Tense=Imp") == ("indicativo", "pretérito-imperfecto")
    assert tense_key("Mood=Cnd") == ("condicional", "presente")
    assert conjugate("hablar", "Mood=Ind Tense=Fut")["table"]["yo"] == "hablaré"


def test_reflexive_verbs_keep_their_pronoun():
    assert conjugate("lavarse", "Mood=Ind Tense=Pres")["table"]["yo"] == "me lavo"


def test_conjugate_route_needs_the_key_and_skips_verbs_it_cannot_do():
    body = {"language": "es", "verbs": [{"lemma": "dar", "morph": "Mood=Ind Tense=Pres"}]}
    assert client.post("/conjugate", json=body).status_code == 401
    ok = client.post("/conjugate", json=body, headers=KEY).json()
    assert ok["verbs"][0]["table"]["yo"] == "doy"


def test_conjugate_all_lists_the_common_tenses_with_six_persons_each():
    from conjugation import conjugate_all

    r = conjugate_all("dar")
    keys = [(t["mood"], t["tense"]) for t in r["tenses"]]
    assert keys[0] == ("indicativo", "presente") and ("subjuntivo", "presente") in keys
    assert r["tenses"][0]["table"]["yo"] == "doy"
    assert all(len(t["table"]) == (5 if t["mood"] == "imperativo" else 6) for t in r["tenses"])


def test_conjugate_all_route_needs_the_key():
    body = {"language": "es", "lemma": "dar"}
    assert client.post("/conjugate-all", json=body).status_code == 401
    ok = client.post("/conjugate-all", json=body, headers=KEY).json()
    assert ok["lemma"] == "dar" and len(ok["tenses"]) > 5


def test_conjugate_all_adds_progressive_tenses_made_from_estar_and_the_gerund():
    from conjugation import conjugate_all

    tenses = {(t["mood"], t["tense"]): t["table"] for t in conjugate_all("tener")["tenses"]}
    assert tenses[("progresivo", "presente")]["yo"] == "estoy teniendo"
    assert tenses[("progresivo", "pretérito-imperfecto")]["nosotros"] == "estábamos teniendo"
    assert tenses[("progresivo", "pretérito-perfecto-compuesto")]["yo"] == "he estado teniendo"


def test_reflexive_verbs_and_estar_get_no_progressive_tenses():
    from conjugation import conjugate_all

    for lemma in ("lavarse", "estar"):
        assert not [t for t in conjugate_all(lemma)["tenses"] if t["mood"] == "progresivo"]
