-- KOSTKA TCG – žebříček ligy (leaderboard)
--
-- Samostatné tabulky (prefix `lb_`), nezávislé na events/registrations/results.
-- Data se zadávají ručně každý týden v adminu (žádný externí API ingest).
-- Bodování je inspirované brněnským Hero Comics: +3 účast, +3 výhra, +1 remíza,
-- +0 prohra; hodnoty jsou ale editovatelné na sezónu (viz sloupce points_*).
--
-- Přístup: veškeré čtení i zápis jde přes service role klíč server-side
-- (viz src/lib/adminAuth.ts, stránky /leaderboard a /leaderboard/sprava jsou
-- za admin loginem). Proto na těchto tabulkách ZÁMĚRNĚ nejsou žádné RLS policy
-- ani granty pro anon/authenticated – Data API role se k nim vůbec nedostanou.

create table if not exists lb_seasons (
  id uuid primary key default gen_random_uuid(),
  game text not null default 'Lorcana',
  name text not null,
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  points_win int not null default 3,
  points_draw int not null default 1,
  points_loss int not null default 0,
  points_participation int not null default 3,
  prize_pool_label text,
  prize_pool_value text,
  prize_pool_note text,
  created_at timestamptz not null default now()
);

create table if not exists lb_players (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references lb_seasons (id) on delete cascade,
  display_name text not null,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists lb_players_season_name_idx
  on lb_players (season_id, lower(display_name));

create table if not exists lb_rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references lb_seasons (id) on delete cascade,
  label text not null,
  played_on date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lb_rounds_season_idx on lb_rounds (season_id, sort_order);

create table if not exists lb_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references lb_rounds (id) on delete cascade,
  player_id uuid not null references lb_players (id) on delete cascade,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  bonus_points int not null default 0,
  bonus_note text,
  created_at timestamptz not null default now()
);

create unique index if not exists lb_entries_round_player_idx
  on lb_entries (round_id, player_id);

create index if not exists lb_entries_player_idx on lb_entries (player_id);

alter table lb_seasons enable row level security;
alter table lb_players enable row level security;
alter table lb_rounds enable row level security;
alter table lb_entries enable row level security;

-- Data API role (anon/authenticated) na tyto tabulky nesmí vůbec – Supabase jim
-- přes ALTER DEFAULT PRIVILEGES dává SELECT na nové tabulky automaticky, tak to
-- explicitně odebereme. Server sahá na data jen přes service role klíč.
revoke all on lb_seasons from anon, authenticated;
revoke all on lb_players from anon, authenticated;
revoke all on lb_rounds from anon, authenticated;
revoke all on lb_entries from anon, authenticated;
