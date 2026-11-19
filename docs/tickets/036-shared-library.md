# 036 Shared library

- A lesson built from a link carries a `library_key` (version, language, help level, normalized address). The next person who adds the same article gets a copy at once, with no model run, and the page opens ready.
- Only link articles are shared (pasted text may be private). Language and help level must match, so a copy is exactly what would have been built.
- Each person gets their own copy (rename, delete, study); nothing about the first person is read or copied.
- Best effort: if the column is missing (migration 0010 not run) or anything fails, the lesson is built as usual.
- A re-run takes that lesson out of the library. Bump `LIBRARY_VERSION` in `src/lib/library.ts` to stop reusing older copies when lessons get better.
- Needs Don: run migration 0010. Lessons built before it are not in the library; only new ones are.
