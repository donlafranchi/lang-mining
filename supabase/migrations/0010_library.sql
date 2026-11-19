-- Shared library: a finished lesson built from a link carries a key (version, language, help level, address), so the
-- next person who adds the same article gets a copy instead of a new model run.
alter table sessions add column if not exists library_key text;
create index if not exists sessions_library_key on sessions (library_key) where library_key is not null;
