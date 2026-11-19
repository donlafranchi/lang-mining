"use client";

import { useState } from "react";
import type { Pattern } from "@/lib/patterns";

/** The teaching for one pattern. When it is new to the person it opens with a Got it button that remembers it. */
export function PatternCard(props: { pattern: Pattern; quotes: string[]; isNew: boolean }) {
  const { pattern, quotes } = props;
  const [isNew, setIsNew] = useState(props.isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function gotIt() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/patterns/seen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: pattern.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setIsNew(false);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <details className="item" open={isNew}>
      <summary>
        <span className="lead">{pattern.title}</span>
        {isNew && <span className="pill">new to you</span>}
      </summary>
      <div className="body stack">
        {quotes.length > 0 && (
          <div>
            <span className="muted">In your text: </span>
            {quotes.map((q, i) => (
              <span key={q}>
                {i > 0 && ", "}
                <span className="lead">{q}</span>
              </span>
            ))}
          </div>
        )}
        <div>
          <span className="muted">Built from: </span>
          {pattern.build}
        </div>
        <div>{pattern.explanation}</div>
        <div className="word-list">
          {pattern.examples.map((x) => (
            <div key={x.spanish} className="word-row">
              <div className="word-main">
                <div className="lead">{x.spanish}</div>
                <div className="muted">{x.english}</div>
              </div>
            </div>
          ))}
        </div>
        {isNew && (
          <button className="btn" onClick={() => void gotIt()} disabled={busy}>
            {busy ? "Saving…" : "Got it"}
          </button>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </details>
  );
}
