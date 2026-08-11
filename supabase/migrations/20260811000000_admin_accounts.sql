-- Skutečná správa admin účtů (viz CLAUDE.md, /admin bylo dřív jen natvrdo
-- zapsané heslo v klientském JS bez skutečné autorizace na API).
--
-- `is_primary` označuje jednoho "hlavního" admina, který jediný smí v
-- administraci přidávat/mazat/upravovat účty ostatních adminů.
alter table profiles
  add column if not exists is_primary boolean not null default false;

-- Přezdívka slouží jako přihlašovací jméno adminů (viz /api/admin/login) –
-- mezi adminy musí být jedinečná (case-insensitive), aby šlo podle ní
-- jednoznačně dohledat účet.
create unique index if not exists profiles_admin_nickname_idx
  on profiles (lower(nickname))
  where role = 'admin';

-- Bez tohoto triggeru by si libovolný přihlášený uživatel mohl přes
-- `profiles_insert_own`/`profiles_update_own` (které kontrolují jen
-- `auth.uid() = id`, ne obsah zapisovaných sloupců) sám nastavit
-- role='admin' nebo is_primary=true a získat tak admin přístup.
-- Tyto dva sloupce proto smí zapsat jen server běžící pod service role
-- klíčem (viz src/lib/adminAuth.ts) – auth.role() = 'service_role' platí
-- jen pro požadavky podepsané service role klíčem, nikdy pro běžné
-- přihlášené uživatele.
create or replace function public.profiles_guard_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.role = 'admin' or new.is_primary then
      raise exception 'Nedostatečná oprávnění pro nastavení admin role.';
    end if;

    if tg_op = 'UPDATE' then
      if old.role is distinct from new.role then
        raise exception 'Nedostatečná oprávnění pro změnu role.';
      end if;
      if old.is_primary is distinct from new.is_primary then
        raise exception 'Nedostatečná oprávnění pro změnu primárního adminu.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_fields_trigger on profiles;
create trigger profiles_guard_privileged_fields_trigger
  before insert or update on profiles
  for each row execute function public.profiles_guard_privileged_fields();
