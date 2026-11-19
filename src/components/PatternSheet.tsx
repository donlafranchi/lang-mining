"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { exampleFor, patternById, patternKind } from "@/lib/patterns";

/**
 * One grammar pattern in a popup over the lesson: its name as a heading, a single example with its English, and a
 * short explanation. Closing it leaves the learner exactly where they were.
 */
export function PatternSheet(props: { id: string; quote?: string; language: string; onClose: () => void }) {
  const router = useRouter();
  const pattern = patternById(props.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { onClose } = props;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pattern) return null;
  const example = exampleFor(pattern, props.quote);

  async function gotIt() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/patterns/seen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: props.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        onClose();
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={pattern.title} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="sheet-body">
          <div className={`sheet-heading mark mark-${patternKind(pattern.id)}`}>{pattern.title}</div>
          <div className="sheet-example" dir="auto">
            {example.text}
          </div>
          {example.translit && <div className="translit">{example.translit}</div>}
          <div className="sheet-english">{example.english}</div>
          <p className="muted">{pattern.build}</p>
          <p>{pattern.explanation}</p>
          <div className="deck-links">
            <button type="button" className="btn" onClick={() => void gotIt()} disabled={busy}>
              {busy ? "Saving…" : "Got it"}
            </button>
            <Link className="btn secondary" href={`/study/patterns?language=${props.language}#${pattern.id}`}>
              More examples
            </Link>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/** "Language patterns" under a paragraph, laid out like the word list: what the text says, which pattern it is, its recipe. Tapping a row opens the popup. */
export function PatternRows(props: { uses: { id: string; quote: string }[]; language: string }) {
  const [open, setOpen] = useState<{ id: string; quote: string } | null>(null);
  if (props.uses.length === 0) return null;
  return (
    <div className="stack">
      <div className="section-label">Language patterns</div>
      <div className="word-list">
        {props.uses.map((u) => {
          const pattern = patternById(u.id)!;
          return (
            <button key={u.id} type="button" className="word-row pattern-row" onClick={() => setOpen(u)}>
              <div className="word-main">
                <div className="word-entry">
                  <div className="lead" dir="auto">
                    {u.quote || pattern.title}
                  </div>
                  <div className="word-line">
                    <span className="muted">pattern:</span> <span className={`mark mark-${patternKind(u.id)}`}>{pattern.title}</span>
                  </div>
                  <div className="word-line muted">{pattern.build}</div>
                </div>
              </div>
              <span className="muted" aria-hidden="true">
                ›
              </span>
            </button>
          );
        })}
      </div>
      {open && <PatternSheet id={open.id} quote={open.quote} language={props.language} onClose={() => setOpen(null)} />}
    </div>
  );
}
