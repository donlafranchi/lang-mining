-- Our own lexicon, shared by everyone. Words only, never article text.
-- Filled from every lesson that is built, from the core 2,000 lists, and later from a dictionary import.

create table if not exists lexicon_lemmas (
  language text not null check (language in ('es', 'fa')),
  lemma text not null,
  -- Normalised the same way deck keys are (lower case, spaces tidied), so lookups match.
  lemma_key text not null,
  pos text not null,
  transliteration text,
  level text,
  core_rank int,
  -- Every English gloss seen for this word, each with how many times: [{"english": "...", "count": 3}]
  senses jsonb not null default '[]'::jsonb,
  source text not null default 'llm' check (source in ('llm', 'core', 'dictionary', 'analyzer', 'user')),
  uses int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (language, lemma_key, pos)
);

create index if not exists lexicon_lemmas_core_idx on lexicon_lemmas (language, core_rank) where core_rank is not null;

create table if not exists lexicon_forms (
  language text not null check (language in ('es', 'fa')),
  form_key text not null,
  lemma_key text not null,
  pos text not null,
  -- e.g. "Tense=Pres|Mood=Ind|Person=3" when known
  morph text not null default '',
  uses int not null default 0,
  primary key (language, form_key, lemma_key, pos)
);

alter table lexicon_lemmas enable row level security;
alter table lexicon_forms enable row level security;
