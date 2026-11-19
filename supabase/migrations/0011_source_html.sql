-- The page's HTML as fetched, kept for lessons made from a link, so extraction problems (stray "3 minute read" lines
-- and the like) can be studied and fixed. Public web pages only; capped in size by the app.
create table if not exists source_html (
  session_id uuid primary key references sessions (id) on delete cascade,
  html text not null,
  created_at timestamptz not null default now()
);
alter table source_html enable row level security;
