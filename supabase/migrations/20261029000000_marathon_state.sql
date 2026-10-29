-- KOSTKA – maraton deskových her (/admin/maraton)
--
-- Celý stav maratonu (účastníci, body, nastavení, historie) je jeden JSON
-- dokument – aplikace ho drží vcelku a posílá vcelku, takže stačí jeden řádek.
-- `rev` slouží k optimistické kontrole souběhu: zápis projde jen s aktuální
-- verzí, jinak API vrátí 409 a klient si načte novější stav.
--
-- Přístup jen přes service role server-side (src/pages/api/admin/maraton.ts,
-- za admin loginem) – stejně jako lb_* tabulky žádné policy ani granty.

create table if not exists marathon_state (
  id text primary key default 'main',
  state jsonb not null,
  rev bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table marathon_state enable row level security;
revoke all on table marathon_state from anon, authenticated;
