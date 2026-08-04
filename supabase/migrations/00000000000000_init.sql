-- KOSTKA TCG – initial schema draft
-- Pozn.: jde o výchozí návrh dle dotazníku, před nasazením ověřit s klientem
-- (viz CLAUDE.md, sekce "Funkční specifikace").

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  nickname text,
  phone text,
  birth_date date,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('tournament', 'league')),
  title text not null,
  description text,
  game text, -- Lorcana / Pokémon / Riftbound
  starts_at timestamptz not null,
  location text,
  capacity int,
  status text not null default 'upcoming' check (status in ('upcoming', 'past', 'cancelled')),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid references profiles (id) on delete set null,
  guest_name text,
  guest_email text,
  guest_nickname text,
  created_at timestamptz not null default now(),
  constraint registration_identity check (
    user_id is not null or (guest_name is not null and guest_email is not null)
  )
);

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  registration_id uuid not null references registrations (id) on delete cascade,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  placement int,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table results enable row level security;

-- profiles: uživatel vidí a upravuje jen sám sebe, admin vidí vše
create policy "profiles_select_own_or_admin" on profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- events: veřejně čitelné, jen admin zapisuje
create policy "events_select_public" on events
  for select using (true);

create policy "events_write_admin" on events
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- registrations: kdokoliv může vytvořit rezervaci (i host), číst může jen
-- vlastník registrace nebo admin
create policy "registrations_insert_anyone" on registrations
  for insert with check (true);

create policy "registrations_select_own_or_admin" on registrations
  for select using (
    auth.uid() = user_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "registrations_admin_manage" on registrations
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "registrations_admin_delete" on registrations
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- results: veřejně čitelné (výsledky/historie), zapisuje jen admin
create policy "results_select_public" on results
  for select using (true);

create policy "results_write_admin" on results
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
