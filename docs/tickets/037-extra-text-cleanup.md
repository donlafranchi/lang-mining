# 037 Extra text in paragraphs

- Cleaner drops whole short lines that are page furniture: reading time ("3 minute read", "5 minutos de lectura"), bylines ("Por Juan Pérez"), publish and update dates, "listen to this", ad labels. Real sentences that start the same way are kept (tests).
- The page HTML is kept for link lessons (migration 0011 `source_html`, 400,000 character cap). The owner sees "Download the page HTML" on a link lesson; it includes the extracted text, so we can compare what was kept and what was cut.
- Not covered: furniture glued to a real paragraph on one line. That needs the HTML to see the markup, hence the capture.
