-- Lines the owner marked "Not part of the article" on a site (a video title, a date label, "Descubre más"), so the next
-- article from that site is cleaned of them automatically. line_key is the line lowercased with numbers made generic.
create table if not exists site_blocklist (
  site text not null,
  line_key text not null,
  example text not null,
  created_at timestamptz not null default now(),
  primary key (site, line_key)
);
alter table site_blocklist enable row level security;
