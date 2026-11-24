"use client";

import Link from "next/link";
import { useState } from "react";
import type { DeckItem } from "@/lib/deck";
import type { Language } from "@/lib/languages";
import type { Rating } from "@/lib/srs";
import { answerVariants, checkAnswer } from "@/lib/test-me";
import { HandwritingPad } from "./HandwritingPad";

type Cards = Pick<DeckItem, "id" | "payload">[];

const RATINGS: { id: Rating; label: string; hint: string }[] = [
  { id: "again", label: "Again", hint: "10 min" },
  { id: "good", label: "Good", hint: "next box" },
  { id: "easy", label: "Easy", hint: "skip ahead" },
];

export function Quiz(props: { cards: Cards; language: Language }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState("");
  // Each card starts by writing the word with a finger (copying it from above), then comes the translation.
  const [writeFirst, setWriteFirst] = useState(true);
  const [writing, setWriting] = useState(true);
  const [written, setWritten] = useState(false);
  // How the typed answer went: right (or close), wrong, or null when they tapped Show answer instead.
  const [result, setResult] = useState<"exact" | "close" | "wrong" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tally, setTally] = useState<Record<Rating, number>>({
    again: 0,
    good: 0,
    easy: 0,
  });

  const dir = props.language === "fa" ? "rtl" : "ltr";
  const card = props.cards[index];
  const total = props.cards.length;

  function check() {
    if (!card) return;
    setResult(checkAnswer(typed, answerVariants(card.payload.english)));
    setFlipped(true);
  }

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
      setTyped("");
      setResult(null);
      setWriting(writeFirst);
      setWritten(false);
      setIndex((i) => i + 1);
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    }
    setBusy(false);
  }

  if (!card) {
    return (
      <div className="card stack">
        <div className="lead">Done</div>
        <p>
          {total} reviewed: {tally.again} again, {tally.good} good, {tally.easy}{" "}
          easy.
        </p>
        <p className="muted">Cards you missed come back in 10 minutes.</p>
        <Link
          className="btn secondary"
          href={`/quiz?language=${props.language}`}
        >
          Check for more
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="quiz-top">
        <p className="muted" aria-live="polite">
          {index + 1} / {total}
        </p>
        <button
          type="button"
          className="linklike"
          onClick={() => {
            setWriteFirst(!writeFirst);
            if (!flipped) setWriting(!writeFirst);
          }}
        >
          Writing first: {writeFirst ? "on" : "off"}
        </button>
      </div>

      <div className="card quiz-card stack">
        <div className="quiz-word" dir={dir} lang={props.language}>
          {card.payload.lemma}
        </div>

        {flipped && result && (
          <p className={result === "wrong" ? "error" : "lead"}>
            {result === "exact"
              ? "Right!"
              : result === "close"
                ? "Close enough, you got it."
                : "Not quite."}
            {result !== "wrong" && typed.trim() ? (
              <span className="muted"> You typed “{typed.trim()}”.</span>
            ) : null}
          </p>
        )}

        {flipped && (
          <div className="stack">
            {card.payload.transliteration && (
              <div className="translit">{card.payload.transliteration}</div>
            )}
            <div className="quiz-answer">{card.payload.english}</div>
            {card.payload.part_of_speech && (
              <div className="muted">{card.payload.part_of_speech}</div>
            )}
            {card.payload.example && (
              <div dir={dir} lang={props.language}>
                “{card.payload.example}”
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {!flipped && writing ? (
        <div className="stack">
          <p className="muted">
            Write the word above with your finger, copying it. Then translate
            it.
          </p>
          <HandwritingPad key={card.id} onChange={setWritten} />
          <div className="deck-links">
            <button
              type="button"
              className="btn"
              onClick={() => setWriting(false)}
              disabled={!written}
            >
              Done, now translate
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setWriting(false)}
            >
              Skip writing
            </button>
          </div>
        </div>
      ) : !flipped ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <input
            className="testme-input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="type the English"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            aria-label="English meaning"
          />
          <div className="deck-links">
            <button className="btn" type="submit" disabled={!typed.trim()}>
              Check
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setFlipped(true)}
            >
              Show answer
            </button>
          </div>
        </form>
      ) : result === "wrong" ? (
        // A wrong typed answer counts as Again, unless they say they were right (a synonym we do not have stored).
        <div className="rate-row">
          <button className="btn" onClick={() => rate("again")} disabled={busy}>
            Again
            <span className="rate-hint">10 min</span>
          </button>
          <button
            className="btn secondary"
            onClick={() => rate("good")}
            disabled={busy}
          >
            I was right
            <span className="rate-hint">next box</span>
          </button>
        </div>
      ) : (
        <div className="rate-row">
          {RATINGS.filter((r) => result === null || r.id !== "again").map(
            (r) => (
              <button
                key={r.id}
                className={r.id === "good" ? "btn" : "btn secondary"}
                onClick={() => rate(r.id)}
                disabled={busy}
              >
                {r.label}
                <span className="rate-hint">{r.hint}</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
