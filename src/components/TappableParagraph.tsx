"use client";

import { useEffect, useState } from "react";
import type { Gloss } from "@/lib/enrichment/farsi-rows";
import type { PatternUse } from "@/lib/patterns";
import { posLabel } from "@/lib/pos-labels";
import { HighlightedText } from "./HighlightedText";
import { SaveWordButton } from "./SaveWordButton";

/** A paragraph whose words can be tapped: a small popup shows how to say it, what it means, and adds it to the study list. */
export function TappableParagraph(props: {
  text: string;
  forms: Record<string, number>;
  marks?: PatternUse[];
  language: "es" | "fa";
  glosses: Map<string, Gloss>;
  sessionId: string;
}) {
  const [open, setOpen] = useState<Gloss | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const dir = props.language === "fa" ? "rtl" : "ltr";
  return (
    <>
      <HighlightedText
        text={props.text}
        forms={props.forms}
        marks={props.marks}
        language={props.language}
        glosses={props.glosses}
        onWord={setOpen}
      />
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(null)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={open.written}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="sheet-close"
              onClick={() => setOpen(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="sheet-body">
              <div className="sheet-example" lang={props.language} dir={dir}>
                {open.written}
              </div>
              {open.translit && <div className="translit">{open.translit}</div>}
              <div className="sheet-english">{open.meaning}</div>
              <div className="muted">
                {posLabel(open.pos)}
                {open.lemma !== open.written ? (
                  <>
                    {" · from "}
                    <span lang={props.language} dir={dir}>
                      {open.lemma}
                    </span>
                  </>
                ) : null}
              </div>
              <SaveWordButton
                word={open.save}
                language={props.language}
                sessionId={props.sessionId}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
