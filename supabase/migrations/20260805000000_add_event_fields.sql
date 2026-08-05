alter table events
  add column if not exists slug text,
  add column if not exists registration_url text;

create unique index if not exists events_slug_idx
  on events (slug);

create index if not exists events_starts_at_idx
  on events (starts_at);

update events
set slug = coalesce(
  slug,
  lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || to_char(starts_at, 'YYYY-MM-DD')
)
where slug is null;

update events
set registration_url = coalesce(registration_url, 'https://www.ravensburgerplayhub.com/')
where registration_url is null;
