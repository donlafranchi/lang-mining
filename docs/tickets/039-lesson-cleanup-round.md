# 039 Lesson cleanup round

- Figure captions and photo credits are dropped ("Fuente de la imagen", "Reuters Pie de foto" no longer reach the vocab); "Fuente: ...", "Pie de foto", "Créditos..." lines too. Real sentences starting "Fuentes cercanas..." stay.
- Proper nouns never appear in the vocab list (filter, and the model is told to skip them).
- Word rows follow dictionary style: bold form, small italic part of speech after it, "irregular" pill at the right, dictionary form with meaning on line 2, a "Conjugation ▾" chip on verbs.
- Article title: site name suffix dropped, up to 120 characters kept whole, and the title is the lesson's first paragraph so its words are explained too.
- Removed the key-word pills; "Overview in English" is now "English Overview".
- Read / Vocab / Idioms tabs switched off for Spanish (SHOW_SPANISH_TABS in SessionView.tsx).
- Still open: extra lines on the real page need its HTML; next step a "Not part of the article" button with a per-site list.
