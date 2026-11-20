# 040 Persistent header with avatar menu

- A bar on every page: avatar (first letter of the name) on the left, "Hand to Brain: A Language Learning App" beside it (links home).
- The avatar opens a menu with everything the old top line had: Signed in as, Settings, Admin (owner), light/dark switch, Sign out. Closes on outside tap, Escape or choosing a link.
- The header asks `/api/me` who is signed in when a page opens, so pages stay static and the offline page never caches a name. Hidden on the login page.
- Removed the old top line and the big name on the home and sign-in pages. Sticky Farsi tabs now sit under the header.
