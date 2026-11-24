"use client";

import Link from "next/link";
import { useState } from "react";
import type { DeckItem } from "@/lib/deck";
import type { Language } from "@/lib/languages";
import { HandwritingPad } from "./HandwritingPad";

type Cards = Pick<DeckItem, "id" | "payload">[];

/**
 * Writing practice, apart from the quizzes: each saved word is shown with its meaning, its sound and an example all
 * together, and you copy it with a finger or a stylus. Nothing is checked or scheduled. The movement is the point.
 */
export function WritePractice({
  cards,
  language,
}: {
  cards: Cards;
  language: Language;
}) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  const dir = language === "fa" ? "rtl" : "ltr";

  if (!card) {
    return (
      <div className="card stack">
        <div className="lead">Done</div>
        <p>You wrote {cards.length} words.</p>
        <Link
          className="btn secondary"
          href={`/study/write?language=${language}`}
          prefetch={false}
        >
          Write more
        </Link>
      </div>
    );
  }

  const p = card.payload;
  return (
    <div className="stack">
      <p className="muted" aria-live="polite">
        {index + 1} / {cards.length}
      </p>
      <div className="card quiz-card stack">
        <div className="quiz-word" dir={dir} lang={language}>
          {p.lemma}
        </div>
        {p.transliteration && (
          <div className="translit">{p.transliteration}</div>
        )}
        <div className="quiz-answer">{p.english}</div>
        {p.part_of_speech && <div className="muted">{p.part_of_speech}</div>}
        {p.example && (
          <div dir={dir} lang={language}>
            “{p.example}”
          </div>
        )}
      </div>
      <HandwritingPad key={card.id} />
      <div className="deck-links">
        <button
          type="button"
          className="btn secondary"
          onClick={() => setIndex(index + 1)}
        >
          Skip
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setIndex(index + 1)}
        >
          {index + 1 < cards.length ? "Next word" : "Finish"}
        </button>
      </div>
    </div>
  );
}
