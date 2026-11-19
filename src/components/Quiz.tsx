"use client";

import Link from "next/link";
import { useState } from "react";
import type { DeckItem } from "@/lib/deck";
import type { Language } from "@/lib/languages";
import type { Rating } from "@/lib/srs";
import { HandwritingPad } from "./HandwritingPad";

export type QuizMode = "read" | "write";

type Cards = Pick<DeckItem, "id" | "payload">[];

const RATINGS: { id: Rating; label: string; hint: string }[] = [
  { id: "again", label: "Again", hint: "10 min" },
  { id: "good", label: "Good", hint: "next box" },
  { id: "easy", label: "Easy", hint: "skip ahead" },
];

export function Quiz(props: { cards: Cards; language: Language; mode: QuizMode }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tally, setTally] = useState<Record<Rating, number>>({ again: 0, good: 0, easy: 0 });

  const dir = props.language === "fa" ? "rtl" : "ltr";
  const card = props.cards[index];
  const total = props.cards.length;

  async function rate(rating: Rating) {
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/deck/${card.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
      setFlipped(false);
      setHasInk(false);
      setIndex((i) => i + 1);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (!card) {
    return (
      <div className="card stack">
        <div className="lead">Done</div>
        <p>
          {total} reviewed: {tally.again} again, {tally.good} good, {tally.easy} easy.
        </p>
        <p className="muted">Cards you missed come back in 10 minutes.</p>
        <Link className="btn secondary" href={`/quiz?language=${props.language}&mode=${props.mode}`}>
          Check for more
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted" aria-live="polite">
        {index + 1} / {total}
      </p>

      {props.mode === "write" ? (
        <div className="stack">
          <div className="card quiz-card stack">
            <div className="muted">Write this in {props.language === "fa" ? "Farsi" : "Spanish"}</div>
            <div className="quiz-word">{card.payload.english}</div>
            {card.payload.part_of_speech && <div className="muted">{card.payload.part_of_speech}</div>}
          </div>
          {/* Keyed on the card so the pad starts blank for every word. */}
          <HandwritingPad key={card.id} locked={flipped} onInkChange={setHasInk} />
          {flipped && (
            <div className="card quiz-card stack">
              <div className="muted">The word</div>
              <div className="quiz-word" dir={dir} lang={props.language}>
                {card.payload.lemma}
              </div>
              {card.payload.transliteration && <div className="translit">{card.payload.transliteration}</div>}
              {card.payload.example && (
                <div dir={dir} lang={props.language}>
                  “{card.payload.example}”
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card quiz-card stack">
          <div className="quiz-word" dir={dir} lang={props.language}>
            {card.payload.lemma}
          </div>

          {flipped && (
            <div className="stack">
              {card.payload.transliteration && <div className="translit">{card.payload.transliteration}</div>}
              <div className="quiz-answer">{card.payload.english}</div>
              {card.payload.part_of_speech && <div className="muted">{card.payload.part_of_speech}</div>}
              {card.payload.example && (
                <div dir={dir} lang={props.language}>
                  “{card.payload.example}”
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {!flipped ? (
        <button className="btn" onClick={() => setFlipped(true)}>
          {props.mode === "write" && !hasInk ? "Skip writing, show the word" : "Show answer"}
        </button>
      ) : (
        <div className="rate-row">
          {RATINGS.map((r) => (
            <button key={r.id} className={r.id === "good" ? "btn" : "btn secondary"} onClick={() => rate(r.id)} disabled={busy}>
              {r.label}
              <span className="rate-hint">{r.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
