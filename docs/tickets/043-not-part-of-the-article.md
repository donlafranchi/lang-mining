# 043 "Not part of the article" and idioms first

- Owner only: a "Not part of the article" link under each paragraph, with a confirm. It removes the paragraph from the lesson and from the stored source text (so a re-run does not bring it back).
- Short lines (200 characters or less) are also remembered for the site (migration 0012 `site_blocklist`; key = line lowercased with numbers made generic, so "Fecha de publicación 4 horas" also catches "12 horas"). The next article from that site is cleaned of them before anything else. No model.
- Longer paragraphs are removed from that lesson only.
- Before migration 0012 the button still removes the paragraph; it just cannot remember it.
- Idioms now sit above the vocabulary in each paragraph.
- Only the owner can use it, because a wrong click changes every later article from the site.
