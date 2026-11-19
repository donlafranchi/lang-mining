"use client";

import { useState } from "react";
import { locatePatternMarks, splitMarked, type Piece } from "@/lib/highlight";
import { patternKind, type PatternUse } from "@/lib/patterns";
import { PatternSheet } from "./PatternSheet";

function Pieces({ pieces }: { pieces: Piece[] }) {
  return (
    <>
      {pieces.map((piece, i) =>
        piece.rank ? (
          <span key={i} className="core-word" title={`core word #${piece.rank}`}>
            {piece.text}
          </span>
        ) : (
          piece.text
        ),
      )}
    </>
  );
}

/**
 * Paragraph text with the words that are among the 2,000 most common underlined. Patterns listed in `marks` get a
 * marker-pen highlight that links to the patterns page.
 */
export function HighlightedText({
  text,
  forms,
  marks = [],
  language = "es",
}: {
  text: string;
  forms: Record<string, number>;
  marks?: PatternUse[];
  language?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const located = locatePatternMarks(text, marks);
  const parts = splitMarked(text, forms, located);
  return (
    <>
      {parts.map((part, i) =>
        part.mark ? (
          <button key={i} type="button" className={`mark mark-${patternKind(part.mark)}`} onClick={() => setOpen(part.mark!)}>
            <Pieces pieces={part.pieces} />
          </button>
        ) : (
          <Pieces key={i} pieces={part.pieces} />
        ),
      )}
      {open && <PatternSheet id={open} quote={marks.find((m) => m.id === open)?.quote} language={language} onClose={() => setOpen(null)} />}
    </>
  );
}
