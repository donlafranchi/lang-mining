"use client";

import { useRef, useState, type ReactNode } from "react";

/** Swipeable pages, one per paragraph, with a position indicator and Previous and Next buttons. Shared by Spanish and Farsi. */
export function Pager({ pages, label }: { pages: ReactNode[]; label: string }) {
  const pager = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = pages.length;

  function onScroll() {
    const el = pager.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  }

  function go(to: number) {
    const el = pager.current;
    if (!el) return;
    const clamped = Math.min(total - 1, Math.max(0, to));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  return (
    <>
      <div className="pager-bar">
        <button className="btn secondary small" onClick={() => go(index - 1)} disabled={index === 0}>
          ← Previous
        </button>
        <span className="muted" aria-live="polite">
          {index + 1} / {total}
        </span>
        <button className="btn secondary small" onClick={() => go(index + 1)} disabled={index >= total - 1}>
          Next →
        </button>
      </div>

      <div className="pager" ref={pager} onScroll={onScroll}>
        {pages.map((page, i) => (
          <section key={i} className="page stack" aria-label={`${label} ${i + 1} of ${total}`}>
            {page}
          </section>
        ))}
      </div>
    </>
  );
}
