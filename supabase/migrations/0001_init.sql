-- lang-mining: text and URL ingestion
-- All access goes through server routes using the service role key.
-- RLS is enabled with no policies, so the anon key can read and write nothing.

create table sessions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('text', 'url')),
  source_url text,
  title text not null,
  dialect text not null check (dialect in (
    'puerto_rican', 'mexican', 'caribbean_general',
    'rioplatense', 'castilian', 'neutral_latin_american'
  )),
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

-- Transient by design: the full source text is deleted after delete_after.
create table source_texts (
  session_id uuid primary key references sessions (id) on delete cascade,
  text text not null,
  delete_after timestamptz not null
);

create index source_texts_delete_after_idx on source_texts (delete_after);

-- One enrichment per (session, dialect) so re-running with another dialect keeps both.
create table enrichments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  dialect text not null,
  json jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (session_id, dialect)
);

alter table sessions enable row level security;
alter table source_texts enable row level security;
alter table enrichments enable row level security;
