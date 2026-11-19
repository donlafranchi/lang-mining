"""A small web service: send paragraphs, get every word's dictionary form, part of speech and grammar back."""

from __future__ import annotations

import hmac
import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from analyzers import analyze
from conjugation import conjugate, conjugate_all

MAX_PARAGRAPHS = 200
MAX_CHARS = 100_000
MAX_VERBS = 200

app = FastAPI(title="lang-mining analysis", docs_url=None, redoc_url=None)


class AnalyzeRequest(BaseModel):
    language: Literal["es", "fa"]
    paragraphs: list[str] = Field(max_length=MAX_PARAGRAPHS)


class VerbRequest(BaseModel):
    lemma: str = Field(min_length=1, max_length=60)
    # spaCy's grammar features for the form as written, for example "Mood=Ind Tense=Past Person=3".
    morph: str = Field(default="", max_length=200)


class ConjugateAllRequest(BaseModel):
    language: Literal["es"]
    lemma: str = Field(min_length=1, max_length=60)


class ConjugateRequest(BaseModel):
    language: Literal["es"]
    verbs: list[VerbRequest] = Field(max_length=MAX_VERBS)


def check_key(provided: str | None) -> None:
    expected = os.environ.get("ANALYSIS_KEY", "")
    # No key set means the service refuses everything, never "open to anyone".
    if not expected or not provided or not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Not allowed.")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/analyze")
def analyze_route(body: AnalyzeRequest, x_analysis_key: str | None = Header(default=None)) -> dict:
    check_key(x_analysis_key)
    if sum(len(p) for p in body.paragraphs) > MAX_CHARS:
        raise HTTPException(status_code=413, detail="Too much text.")
    return {"language": body.language, "paragraphs": analyze(body.language, body.paragraphs)}


@app.post("/conjugate")
def conjugate_route(body: ConjugateRequest, x_analysis_key: str | None = Header(default=None)) -> dict:
    check_key(x_analysis_key)
    results = []
    for v in body.verbs:
        try:
            results.append(conjugate(v.lemma, v.morph))
        except Exception:
            # A verb the conjugator cannot handle is left out, never an error for the whole lesson.
            results.append(None)
    return {"language": body.language, "verbs": results}


@app.post("/conjugate-all")
def conjugate_all_route(body: ConjugateAllRequest, x_analysis_key: str | None = Header(default=None)) -> dict:
    check_key(x_analysis_key)
    try:
        return conjugate_all(body.lemma)
    except Exception:
        raise HTTPException(status_code=422, detail="Cannot conjugate that verb.")
