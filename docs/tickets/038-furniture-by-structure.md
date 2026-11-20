# 038 Page furniture removed by structure

No language model. Three layers, all in `src/lib/ingest/extract.ts`:
1. Before the article is picked out: remove navigation, footers, forms, players, `<time>`, hidden boxes, and boxes whose class or id says what they are (share, related, comments, byline, date, ads...). A huge wrapper with such a word in its class is never removed.
2. On a page written in ordinary paragraphs (two or more real `<p>`): remove small boxes that hold no paragraph and do not read like a sentence ("Título del video", "Fecha de publicación 4 horas"), and short blocks that are mostly links ("Descubre más", related lists). Links and spans inside a real sentence are kept. A page with almost no paragraph tags is left alone.
3. After: whole-line phrase list (reading time, bylines, dates, "Descubre más", video labels) and a link-share check.
Not verified on the real article; send its HTML (Download the page HTML) to check.
Next if still leaking: a "Not part of the article" button that adds a line to a per-site list.
