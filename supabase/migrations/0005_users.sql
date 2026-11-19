-- lang-mining: user accounts
-- Run this BEFORE the code that uses it goes live, or sign-in cannot work.
-- Safe to run more than once.

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Lowercased, trimmed name, so two spellings of one name cannot both exist.
  name_key text not null unique,
  -- Salted scrypt hash. The passcode itself is never stored.
  passcode_hash text not null,
  is_admin boolean not null default false,
  -- Goes up when a passcode is reset, which signs that person out everywhere.
  token_version int not null default 1,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

alter table app_users enable row level security;

-- Each lesson belongs to a person. Lessons made before accounts have no owner; the owner takes them on first sign-in.
alter table sessions add column if not exists user_id uuid references app_users (id) on delete cascade;
create index if not exists sessions_user_created_idx on sessions (user_id, created_at desc);

-- Each deck card belongs to a person, and one person has one card per word.
alter table deck_items add column if not exists user_id uuid references app_users (id) on delete cascade;
alter table deck_items drop constraint if exists deck_items_language_kind_key_key;
create unique index if not exists deck_items_user_word_idx on deck_items (user_id, language, kind, key);
drop index if exists deck_items_due_idx;
create index if not exists deck_items_user_due_idx on deck_items (user_id, language, next_review_at);
