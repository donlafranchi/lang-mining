# Ticket 015: Keep the paragraphs when a link is pasted

## Outcome
Paste an article link and get the same paragraph-by-paragraph lesson as pasting the text, with the paragraphs split where the page splits them.

## Problem
The link reader took the page's plain text. Most sites send their HTML squashed together with nothing between the tags, so the plain text had no line breaks, the whole article looked like one paragraph, and the lesson became one huge card.

## In scope
- Build the article text from the page's own tags: a paragraph, heading, list item, caption, quote or table cell each end a paragraph, and so does a double line break inside a block
- Links, bold, italics and spans stay inside their paragraph
- Single line breaks become spaces, extra spaces and line breaks inside a paragraph are collapsed, entities are decoded
- No blank paragraphs, no more than one blank line between paragraphs
- Text that sits next to a nested block is kept, a quote that wraps paragraphs is not repeated
- Persian text and its zero-width joiners are kept as they are
- If a page has text but no usable tags, fall back to its plain text

## Out of scope
- Finding the article on pages that need a login or run scripts to show their text (still "no readable text")
- Pulling text out of images or PDFs
- Changing how pasted text is split

## Acceptance criteria (pass or fail)
1. A page whose paragraphs have nothing between the tags comes out as separate paragraphs, one per tag
2. The paragraph splitter then finds exactly the paragraphs the page has, and 12 paragraphs stay 12
3. List items, captions and quotes are separate paragraphs, a quote is not repeated
4. A paragraph with links and emphasis inside is one paragraph with the words in order
5. A double line break splits a block and a single one is a space
6. Whitespace is collapsed, entities decoded, blank paragraphs dropped
7. Scripts and styles never appear, and Persian paragraphs and their joiners survive
8. Existing behaviour is kept: plain text, scripts removed, and a readable error when there is nothing
9. No API keys in the repo

## Notes
- Test-first. The new tests failed before the fix, which confirms the cause
- Not tested on a live site from the build environment (outbound access to news sites is blocked there)
