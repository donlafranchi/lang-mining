# 017 Better link parsing

- Pages are decoded with their real charset (header, then the page's meta tag, then UTF-8), so older Spanish sites keep their accents.
- Repeated paragraphs and share/related-link/photo-credit lines are dropped; short headings stay.
- The lesson is titled with the page's own title instead of the site name.
- Fetches look like a phone browser and ask for Spanish/Farsi, since some news sites refuse unknown clients.
- Not verified on live sites from the build sandbox (no outbound network). Paywalled and script-only pages still fail with a clear message; paste the text for those.
