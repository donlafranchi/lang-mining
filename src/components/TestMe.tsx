"use client";

import { useState } from "react";
import { isCorrect, type Question } from "@/lib/test-me";

/** A short typed quiz at the end of a paragraph: type the English, or tap Show answer. Nothing is saved. */
export function TestMe({ questions }: { questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<"asking" | "right" | "wrong" | "shown">("asking");
  const [score, setScore] = useState(0);

  if (questions.length === 0) return null;
  const q = questions[index];
  const done = index >= questions.length;

  function check() {
    if (isCorrect(typed, q.answers)) {
      setState("right");
      setScore((s) => s + 1);
    } else {
      setState("wrong");
    }
  }
  function next() {
    setIndex((i) => i + 1);
    setTyped("");
    setState("asking");
  }
  function restart() {
    setIndex(0);
    setTyped("");
    setState("asking");
    setScore(0);
  }

  return (
    <details className="item">
      <summary>
        <span className="lead">Test me</span>
      </summary>
      <div className="body stack">
        {done ? (
          <>
            <div className="lead">
              {score} of {questions.length} right
            </div>
            <button className="btn secondary" onClick={restart}>
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="muted">
              {index + 1} / {questions.length} · type the English
            </div>
            <div className="testme-prompt" lang="es">
              {q.prompt}
              <span className="muted"> · {q.pos}</span>
            </div>
            {state === "asking" || state === "wrong" ? (
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
                  onChange={(e) => {
                    setTyped(e.target.value);
                    if (state === "wrong") setState("asking");
                  }}
                  placeholder="type the English"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  aria-label="English meaning"
                />
                {state === "wrong" && <p className="error">Not quite. Try again, or show the answer.</p>}
                <div className="deck-links">
                  <button className="btn" type="submit" disabled={!typed.trim()}>
                    Check
                  </button>
                  <button className="btn secondary" type="button" onClick={() => setState("shown")}>
                    Show answer
                  </button>
                </div>
              </form>
            ) : (
              <div className="stack">
                <div className="testme-answer">
                  {state === "right" && <span className="testme-right">Right!</span>}
                  <span className="testme-meaning">{q.answers.join(", ")}</span>
                  <span className="muted">{q.lemma}</span>
                </div>
                <button className="btn" onClick={next}>
                  {index + 1 < questions.length ? "Next" : "Finish"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
