import { splitForHighlight } from "@/lib/highlight";

/** Paragraph text with the words that are among the 2,000 most common underlined. */
export function HighlightedText({ text, forms }: { text: string; forms: Record<string, number> }) {
  return (
    <>
      {splitForHighlight(text, forms).map((piece, i) =>
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
