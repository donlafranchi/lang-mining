-- Which grammar patterns each person has already been shown, so a pattern is presented as new only once.
create table if not exists user_patterns_seen (
  user_id uuid not null references app_users(id) on delete cascade,
  pattern_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, pattern_id)
);
alter table user_patterns_seen enable row level security;
