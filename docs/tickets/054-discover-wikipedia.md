# 054 Discover: find reading on Wikipedia
- New Discover page (button on the home page): pick Spanish or Farsi, then "Surprise me" (random article with enough text) or search a topic. Each result has "Mine it".
- Mining takes the first few paragraphs only (about 3,500 characters, headings dropped) so a lesson stays short and cheap. Text is fetched on the server from the article title, never taken from the browser. The lesson keeps the article's title.
- Also a short "More places to read" list (open in the browser, paste the link): Muy Interesante, Xataka (Spanish); Radio Zamaneh, BBC Persian (Farsi). Links written from memory, check them.
- Not built: mining a whole article, other sites in-app, section choice.
- Not verified live: the container cannot reach Wikipedia; the MediaWiki calls are covered by tests with fake answers.
