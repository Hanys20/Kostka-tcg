# KOSTKA TCG – web

Paměť projektu pro Claude Code. Zdrojové podklady od klienta jsou v `client-materials/`
(dotazník, logo, fotky, font) – tento soubor je jejich zpracovaný výtah + technická rozhodnutí.

## Klient

- **Firma:** KOSTKA TCG – herna a prodej trading card games (Lorcana, Pokémon, Riftbound),
  pořádání turnajů, lig a prerelease akcí nových sad.
- **Kontakty:** Vojtěch Kielkovský, Jan Mrázek · +420 773 334 488 · info@kostkatcg.cz
- **Pobočka:** Dolní 782/65, 700 30 Ostrava-Jih-Zábřeh (MSK kraj, případně celá ČR)
- **Doména:** kostkatcg.cz

## Cíle webu

- Primární konverze: **zarezervovat termín turnaje**.
- Sekundárně: informovat (o nás, kontakt, provoz), budovat značku a důvěryhodnost.
- Fáze 2 (později): prodej karet online (e-shop).

## Cílová skupina

- Hráči 20–40 let, „nerd", ochotní utrácet za karty. Mobile-first (chodí hlavně z mobilu).
- Přichází hlavně z doporučení, Instagramu a veletrhů.
- Bolest, kterou řeší: v Ostravě je jen jedna herna – chybí dostupnější/přátelštější varianta.

## Značka a tón

- Pozicování: **„Herna pro hráče, od hráčů pro hráče"**.
- USP: lepší ceny, osobní přístup, přátelská atmosféra.
- Vyhnout se: levnému vzhledu, korporátnímu stylu, agresivnímu marketingu.
- Konkurenti (reference, ne kopírovat): blacklotus.cz, imago.cz, planetaher.cz, deklcb.cz.
- **UX vzor pro rezervační systém: www.deklcb.cz** – klient to výslovně zmínil jako styl,
  který se mu líbí pro přihlašování na turnaje.

## Design

- Dojem: minimalistický a čistý, prémiový, technologický/moderní.
- Barvy (z loga, `client-materials/Logo/`): tyrkysová `#00b4d4`, tmavá `#36363f`, bílá.
  V Tailwindu zapsané jako `kostka-cyan`, `kostka-dark`, `kostka-white`
  (viz `src/styles/global.css`, `@theme`).
- Font: **Raleway** (varianty Black + Medium), dodán jako variabilní `.ttf`
  v `client-materials/Fonty/`, zkopírován do `public/fonts/`.
- Ilustrace na míru (ne stock).
- Loga: `Logo-02.svg` (plné s wordmarkem) a `Logo-03.svg` (jen ikona kostky) –
  zkopírováno do `public/images/logo-full.svg` a `logo-icon.svg`.
- Fotky z reálných akcí klienta jsou v `client-materials/Fotky/` – **fotobanka není potřeba**,
  poznámka „fotobanka??" v dotazníku je tímto vyřešená.

## Mapa stránek

Veřejné: Home (hero + nadcházející turnaje + CTA), O nás, Turnaje (přepínač
Nadcházející / Proběhlé / Liga), detail turnaje + registrace, Kontakt + mapa, FAQ,
Přihlášení/Registrace, GDPR. Jen čeština (jiné jazykové verze nejsou plánované).

Auth-gated: Profil („moje karta" – historie výsledků, umístění, achievementy, editace profilu).

Admin (role `admin`): správa termínů turnajů/lig, detail termínu se seznamem hráčů
a zápisem výsledků.

## Funkční specifikace (klíčové – z volných poznámek dotazníku)

Jde fakticky o **vlastní rezervačně-turnajový systém**, ne jen prezentaci:

- **Přihlášený uživatel** vidí na homepage možnost registrace na termín turnaje bez
  nutnosti znovu vyplňovat údaje (natáhne se z jeho účtu). Má osobní kartu s historií
  aktivity (výsledky z turnajů, umístění, splněné achievementy) a může upravit profil.
- **Nepřihlášený uživatel** se může na turnaj/ligu zaregistrovat i jako host – vyplní
  jméno, e-mail, nick.
- **Administrace** umí: vypisovat termíny turnajů a lig, prohlížet a editovat již
  vytvořené termíny, po rozkliknutí termínu zobrazit přihlášené hráče s možností ručně
  přidat/odebrat hráče, a u každého hráče zapsat počet výher/proher/remíz, které se uloží
  do systému.
- **Rezervační systém je vlastní** (ne Reenio/Calendly) a **bez platební brány** –
  účastník platí až na místě.
- Rozlišujeme „liga" (pravidelné opakující se hraní, každý týden) a „turnaje"
  (jednorázové akce, prerelease apod.).

## Datový model (Supabase)

Návrh v `supabase/migrations/00000000000000_init.sql`:

- `profiles` – id (FK `auth.users`), full_name, nickname, phone, birth_date, role (`user`/`admin`)
- `events` – id, type (`tournament`/`league`), title, description, game, starts_at, location,
  capacity, status (`upcoming`/`past`/`cancelled`), created_by
- `registrations` – id, event_id, user_id (nullable pro hosty), guest_name, guest_email,
  guest_nickname
- `results` – id, event_id, registration_id, wins, losses, draws, placement

RLS: `events` a `results` jsou veřejně čitelné (aby šly zobrazit nadcházející/proběhlé
turnaje i historii bez přihlášení), zápis jen pro `admin`. `registrations` může vytvořit
kdokoliv (i host), číst/mazat/upravovat smí jen vlastník záznamu nebo `admin`.
Migrace je **návrh k ověření**, ne finální schéma – před ostrým nasazením projít s klientem.

## Tech stack a proč

- **Frontend:** Astro + React ostrůvky (TypeScript), Tailwind CSS v4 (CSS-first konfigurace
  přes `@theme` v `src/styles/global.css`, ne `tailwind.config.js`).
  Astro renderuje statické/rychlé stránky (Home, O nás, FAQ) pro dobré SEO a React se
  použije jen tam, kde je potřeba interaktivita (rezervace, přihlášení, profil, admin).
- **Backend/DB/Auth:** Supabase (Postgres + Auth + Row Level Security). Klient přistupuje
  přímo přes `supabase-js` (`src/lib/supabase.ts`) – žádný vlastní API server není potřeba,
  zabezpečení řeší RLS politiky.
- **Hosting:** Cloudflare Pages (klient to sám navrhl v dotazníku), přes `@astrojs/cloudflare`
  adaptér. Nasazení z GitHubu (auto-deploy při push na `main`).
- Tento stack byl odsouhlasen s klientem/uživatelem – viz plán v
  `~/.claude/plans/eh-vytvo-il-jsem-ti-typed-breeze.md` (Cloudflare Pages + Supabase dává
  smysl, protože web potřebuje účty, admin panel a evidenci výsledků, ne jen prezentaci).

## Struktura repozitáře

```
src/
  components/{ui,auth,tournaments,admin}/  – React ostrůvky
  layouts/Layout.astro                     – hlavní layout (header/nav/footer)
  pages/                                   – Astro stránky dle mapy stránek výše
  lib/supabase.ts                          – Supabase klient
  styles/global.css                        – Tailwind + brand @theme + Raleway @font-face
public/
  fonts/Raleway-VariableFont_wght.ttf
  images/logo-full.svg, logo-icon.svg
supabase/migrations/                       – SQL migrace (draft)
client-materials/                          – originální podklady od klienta (needit)
```

## Otevřené otázky pro klienta (dotazník je v těchto bodech prázdný/neúplný)

- **Rozpočet a harmonogram** (sekce 09 dotazníku) – termín spuštění, termín dodání
  podkladů, rozpočet nejsou vyplněné.
- **SEO/analytika/právní náležitosti** (sekce 08) – žádný z checkboxů (GA, GSC, cookie
  lišta, zásady ochrany osobních údajů) není zaškrtnutý, jen stránka GDPR je v seznamu
  stránek a doména/hosting jsou vyplněné. Je potřeba doladit, co z toho klient chce.
- Konkrétní texty, slogany a přesné FAQ otázky – v dotazníku „domyslíme".
- Klíčová slova pro SEO („na jaké fráze má být web nalezitelný") – nevyplněno.

## Stav projektu

- Scaffolding hotový (Astro + React + Tailwind v4 + Cloudflare adaptér + Supabase klient,
  placeholder stránky, návrh DB migrace). Skutečný obsah, texty a doladění designu jsou
  další krok.
- Git repozitář zatím jen lokální, bez GitHub remote/pushe (čeká na založení repa klientem/
  uživatelem).
- Supabase projekt zatím nezaložen – `.env.example` obsahuje placeholder proměnné
  `PUBLIC_SUPABASE_URL` a `PUBLIC_SUPABASE_ANON_KEY`.
