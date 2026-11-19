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
