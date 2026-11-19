import Link from "next/link";
import { locatePatternMarks, splitMarked, type Piece } from "@/lib/highlight";
import { patternKind, type PatternUse } from "@/lib/patterns";

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
  const parts = splitMarked(text, forms, locatePatternMarks(text, marks));
  return (
    <>
      {parts.map((part, i) =>
        part.mark ? (
          <Link key={i} href={`/study/patterns?language=${language}#${part.mark}`} className={`mark mark-${patternKind(part.mark)}`}>
            <Pieces pieces={part.pieces} />
          </Link>
        ) : (
          <Pieces key={i} pieces={part.pieces} />
        ),
      )}
    </>
  );
}
