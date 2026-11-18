-- lang-mining: Farsi lessons
-- Adds the language of each session. Existing and new Spanish sessions default to 'es'.
-- The app works for Spanish without this; it is needed before the first Farsi lesson.

alter table sessions
  add column if not exists language text not null default 'es'
  check (language in ('es', 'fa'));
