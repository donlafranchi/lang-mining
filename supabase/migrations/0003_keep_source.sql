-- lang-mining: keep source text
-- The retention job is gone, so new source text rows are saved without a delete_after date.
-- Safe to run before or after the matching code change: old code still writes the column, new code leaves it null.

alter table source_texts alter column delete_after drop not null;
