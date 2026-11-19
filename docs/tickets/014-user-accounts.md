# Ticket 014: Simple user accounts, per-user lessons and decks

## Outcome
Friends and family (under 5 people) each have their own sign-in, their own saved articles and their own vocabulary deck. Nobody can open another person's lessons or deck.

## Decision recorded
Sign-in is a name plus a personal passcode, kept as a salted hash. No email, no Supabase Auth. The first sign-in with the existing `APP_PASSCODE` creates the owner. The owner adds, resets and removes people on an admin page. (Don, Nov 2026)

## In scope
- Table `app_users` and `user_id` on `sessions` and `deck_items` (migration 0005). Existing lessons and deck cards go to the owner when the owner is created
- Login page with name and passcode. First sign-in ever, with `APP_PASSCODE`, creates the owner account with the name you type
- Signed session cookie (HMAC with `SESSION_SECRET`), one year. The server checks the user still exists and that the passcode has not been reset since
- Account lock: 5 wrong passcodes lock that account for 15 minutes
- Owner-only admin page: add a person (name and passcode), reset a passcode (signs them out everywhere), remove a person (deletes their lessons and deck, with a confirm). Cannot remove yourself or the last owner
- Every lesson and deck read and write is limited to the signed-in user: list, open, delete, rebuild, save a word, save many, quiz, review, remove a card. Someone else's id is "not found"
- Sign out, and who you are signed in as, on the home screen
- The old single-passcode cookie and unlock page are replaced
- Docs: CLAUDE.md, spec, README

## Out of scope
- Email, password reset by email, social sign-in
- The shared vocabulary table and the shared-words page (next ticket)
- Sharing a lesson between people
- Changing your own passcode (ask the owner to reset it)
- Per-person model or help settings (still per device)

## Acceptance criteria (pass or fail)
1. A session token verifies only with the secret it was signed with, and a changed, expired or malformed token is rejected
2. Passcodes are stored as a salted scrypt hash, two hashes of the same passcode differ, and a passcode under 6 characters is refused
3. With no users, signing in with `APP_PASSCODE` and a name creates an admin, adopts the existing lessons and deck, and signs in. A wrong passcode creates nothing
4. With users, a wrong name and a wrong passcode give the same answer, 5 wrong passcodes lock the account for 15 minutes, a right passcode clears the count
5. Only an admin can add, reset or remove a person. A name already in use is refused. The last admin and yourself cannot be removed
6. Resetting a passcode invalidates that person's existing sign-in
7. Every query in the lesson and deck code filters by the signed-in user's id, and a lesson or card belonging to someone else is reported as not found, including rebuild, delete and review
8. The passcode gate still lets through the login page, login endpoint, service worker, offline page, manifest and icons, and gates everything else
9. A request with no valid session cookie gets 401 on the API and a redirect to the login page elsewhere
10. No API keys or passcodes in the repo

## Notes
- Test-first for tokens, passwords, lockout, login, admin rules and query scoping
- This needs migration 0005 and `SESSION_SECRET` set before it can merge. Both are human steps. Merging earlier would lock the owner out
