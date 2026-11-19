# 024 Paragraph splitting

Tested how HTML becomes paragraphs with typical page structures. Worked already: <p> tags, a div per paragraph, double <br>. Failed (one wall of text): paragraphs separated by a single <br>, plain text with blank lines inside one block, only spans. Fixed:
- Every <br> and every blank line inside a text block now starts a new piece. Short pieces (address lines, poem lines) are joined back to their neighbours when lesson paragraphs are made.
- The cap on one study paragraph drops from 1,200 characters (about 200 words) to 600 (about 100 words). Longer paragraphs are cut at sentence ends into even pieces, not 600 plus a small tail.
- A page with no breaks at all (all spans) still comes out as one block, now cut into roughly 100-word pieces.
Not tested on live sites (no internet in the build sandbox); send a link that still looks wrong.
