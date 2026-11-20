"use client";

import { useState } from "react";
import { locatePatternMarks, splitMarked, type Piece } from "@/lib/highlight";
import { patternKind, type PatternUse } from "@/lib/patterns";
import { glossKey, type Gloss } from "@/lib/enrichment/farsi-rows";
import { PatternSheet } from "./PatternSheet";

/** Words with a known meaning become tappable. Other text, and the spaces between words, stay plain. */
function Tappable({
  text,
  className,
  title,
  glosses,
  onWord,
}: {
  text: string;
  className?: string;
  title?: string;
  glosses?: Map<string, Gloss>;
  onWord?: (g: Gloss) => void;
}) {
  if (!glosses || !onWord) {
    return className ? (
      <span className={className} title={title}>
        {text}
      </span>
    ) : (
      <>{text}</>
    );
  }
  return (
    <>
      {text.split(/(\s+)/).map((token, i) => {
        const gloss = token.trim() ? glosses.get(glossKey(token)) : undefined;
        if (!gloss)
          return className && token.trim() ? (
            <span key={i} className={className} title={title}>
              {token}
            </span>
          ) : (
            token
          );
        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            className={`tap-word${className ? ` ${className}` : ""}`}
            title={title}
            onClick={() => onWord(gloss)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onWord(gloss);
              }
            }}
          >
            {token}
          </span>
        );
      })}
    </>
  );
}

function Pieces({
  pieces,
  glosses,
  onWord,
}: {
  pieces: Piece[];
  glosses?: Map<string, Gloss>;
  onWord?: (g: Gloss) => void;
}) {
  return (
    <>
      {pieces.map((piece, i) => (
        <Tappable
          key={i}
          text={piece.text}
          className={piece.rank ? "core-word" : undefined}
          title={piece.rank ? `core word #${piece.rank}` : undefined}
          glosses={glosses}
          onWord={onWord}
        />
      ))}
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
  glosses,
  onWord,
}: {
  text: string;
  forms: Record<string, number>;
  marks?: PatternUse[];
  language?: string;
  /** When given, words found here can be tapped and `onWord` is told which. */
  glosses?: Map<string, Gloss>;
  onWord?: (g: Gloss) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const located = locatePatternMarks(text, marks);
  const parts = splitMarked(text, forms, located);
  return (
    <>
      {parts.map((part, i) =>
        part.mark ? (
          <button
            key={i}
            type="button"
            className={`mark mark-${patternKind(part.mark)}`}
            onClick={() => setOpen(part.mark!)}
          >
            <Pieces pieces={part.pieces} />
          </button>
        ) : (
          <Pieces
            key={i}
            pieces={part.pieces}
            glosses={glosses}
            onWord={onWord}
          />
        ),
      )}
      {open && (
        <PatternSheet
          id={open}
          quote={marks.find((m) => m.id === open)?.quote}
          language={language}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
