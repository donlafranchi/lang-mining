"use client";

import { useState } from "react";
import { patternById, type Pattern, type PatternUse } from "@/lib/patterns";

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
            <div key={x.text} className="word-row">
              <div className="word-main">
                <div className="lead" dir="auto">
                  {x.text}
                </div>
                {x.translit && <div className="translit">{x.translit}</div>}
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

/** "New to you" cards for the patterns in a lesson this person has not been shown yet. */
export function NewPatterns(props: { patterns: { pattern: Pattern; quotes: string[] }[]; seen: string[] }) {
  const fresh = props.patterns.filter((x) => !props.seen.includes(x.pattern.id));
  if (fresh.length === 0) return null;
  return (
    <div className="stack">
      <div className="section-label">New to you</div>
      {fresh.map((x) => (
        <PatternCard key={x.pattern.id} pattern={x.pattern} quotes={x.quotes} isNew />
      ))}
    </div>
  );
}

/** Reference cards for patterns in this lesson the person already knows. */
export function KnownPatterns(props: { patterns: { pattern: Pattern; quotes: string[] }[]; seen: string[] }) {
  const known = props.patterns.filter((x) => props.seen.includes(x.pattern.id));
  if (known.length === 0) return null;
  return (
    <div className="stack">
      <div className="section-label">Patterns you know</div>
      {known.map((x) => (
        <PatternCard key={x.pattern.id} pattern={x.pattern} quotes={x.quotes} isNew={false} />
      ))}
    </div>
  );
}

/** Small tags under a paragraph saying which patterns it uses. */
export function PatternTags({ uses }: { uses: PatternUse[] | undefined }) {
  const shown = (uses ?? []).filter((u) => patternById(u.id));
  if (shown.length === 0) return null;
  return (
    <div className="tags">
      {shown.map((u) => (
        <span key={u.id} className="pill" dir="auto">
          {patternById(u.id)!.title.replace(/ \(.*\)$/, "")}
          {u.quote ? `: ${u.quote}` : ""}
        </span>
      ))}
    </div>
  );
}
