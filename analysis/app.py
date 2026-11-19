"""A small web service: send paragraphs, get every word's dictionary form, part of speech and grammar back."""

from __future__ import annotations

import hmac
import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from analyzers import analyze

MAX_PARAGRAPHS = 200
MAX_CHARS = 100_000

app = FastAPI(title="lang-mining analysis", docs_url=None, redoc_url=None)


class AnalyzeRequest(BaseModel):
    language: Literal["es", "fa"]
    paragraphs: list[str] = Field(max_length=MAX_PARAGRAPHS)


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
