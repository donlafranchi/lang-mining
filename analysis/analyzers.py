"""Language analysis: for each paragraph, every word with its dictionary form, part of speech and grammar.

Spanish uses spaCy. Persian uses Hazm (dictionary form always; part of speech when a tagger model is available).
Both return the same shape, so the app does not care which engine is behind it.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache

# Universal part-of-speech tags to the short list the app uses.
POS_MAP = {
    "NOUN": "noun",
    "PROPN": "noun",
    "VERB": "verb",
    "AUX": "verb",
    "ADJ": "adj",
    "ADV": "adv",
    "ADP": "prep",
    "PRON": "pron",
    "CCONJ": "conj",
    "SCONJ": "conj",
    "DET": "det",
    "NUM": "num",
    "INTJ": "interj",
}


def short_pos(upos: str) -> str:
    return POS_MAP.get(upos, "other")


@lru_cache(maxsize=1)
def _spanish():
    import spacy

    # Only the parts we use, so it starts fast and stays small.
    return spacy.load("es_core_news_sm", disable=["ner", "parser"])


@lru_cache(maxsize=1)
def _persian():
    from hazm import Lemmatizer, Normalizer, SentenceTokenizer, WordTokenizer

    tagger = None
    model = os.environ.get("HAZM_POS_MODEL")
    if model and os.path.exists(model):
        from hazm import POSTagger

        tagger = POSTagger(model=model)
    return Normalizer(), SentenceTokenizer(), WordTokenizer(), Lemmatizer(), tagger


def analyze_spanish(text: str) -> dict:
    doc = _spanish()(text)
    tokens = []
    for t in doc:
        if t.is_space:
            continue
        tokens.append(
            {
                "text": t.text,
                "start": t.idx,
                "end": t.idx + len(t.text),
                "lemma": t.lemma_.lower() if t.lemma_ else t.text.lower(),
                "pos": short_pos(t.pos_),
                "morph": str(t.morph).replace("|", " ") if t.morph else "",
                "is_word": t.is_alpha,
            }
        )
    return {"tokens": tokens}


_WORD = re.compile(r"[\w‌]+", re.UNICODE)


def analyze_persian(text: str) -> dict:
    normalizer, _sentences, tokenizer, lemmatizer, tagger = _persian()
    # Offsets must point into the ORIGINAL text, so words are found there, not in the normalized copy.
    spans = [(m.group(0), m.start(), m.end()) for m in _WORD.finditer(text)]
    words = [w for w, _, _ in spans]
    pos_tags: list[str] = [""] * len(words)
    if tagger is not None and words:
        try:
            pos_tags = [tag for _w, tag in tagger.tag(words)]
        except Exception:
            pos_tags = [""] * len(words)

    tokens = []
    for (word, start, end), tag in zip(spans, pos_tags):
        lemma = lemmatizer.lemmatize(normalizer.normalize(word))
        is_verb = "#" in lemma
        if is_verb:
            past, _present = lemma.split("#", 1)
            # A Persian infinitive is the past stem plus ن.
            lemma = past + "ن"
        pos = "verb" if is_verb else _hazm_pos(tag)
        tokens.append({"text": word, "start": start, "end": end, "lemma": lemma, "pos": pos, "morph": "", "is_word": True})
    return {"tokens": tokens}


# Hazm's tags (a Persian Universal Dependencies style set) to ours.
HAZM_POS = {
    "NOUN": "noun",
    "PROPN": "noun",
    "VERB": "verb",
    "ADJ": "adj",
    "ADV": "adv",
    "ADP": "prep",
    "PRON": "pron",
    "CCONJ": "conj",
    "SCONJ": "conj",
    "DET": "det",
    "NUM": "num",
    "INTJ": "interj",
    "N": "noun",
    "V": "verb",
    "AJ": "adj",
    "ADV": "adv",
    "P": "prep",
    "PRO": "pron",
    "CON": "conj",
    "NUM": "num",
}


def _hazm_pos(tag: str) -> str:
    # Hazm's older tags end in ",EZ" when an ezafe follows.
    return HAZM_POS.get(tag.split(",")[0], "other") if tag else ""


def analyze(language: str, paragraphs: list[str]) -> list[dict]:
    fn = analyze_persian if language == "fa" else analyze_spanish
    return [fn(p) for p in paragraphs]
