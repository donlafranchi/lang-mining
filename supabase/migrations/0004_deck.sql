-- lang-mining: vocabulary deck and quiz
-- One row per saved word. The rest of the app works without this table; the deck and quiz need it.

create table if not exists deck_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'vocab' check (kind in ('vocab')),
  language text not null default 'es' check (language in ('es', 'fa')),
  -- Normalised word, so saving the same word twice does nothing.
  key text not null,
  payload jsonb not null,
  session_id uuid references sessions (id) on delete set null,
  -- 0 is learning (due in minutes), 1 to 6 are the day intervals.
  box int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (language, kind, key)
);

create index if not exists deck_items_due_idx on deck_items (language, next_review_at);

-- Same as the other tables: all access goes through server routes with the service role key.
alter table deck_items enable row level security;
