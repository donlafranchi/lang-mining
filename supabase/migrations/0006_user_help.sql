-- Each person picks how much help their lessons give, per language. Null means the language's default.
alter table app_users add column if not exists help_es text check (help_es in ('full','medium','light'));
alter table app_users add column if not exists help_fa text check (help_fa in ('full','medium','light'));
