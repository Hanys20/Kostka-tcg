# KOSTKA TCG – web

Paměť projektu pro Claude Code. Zdrojové podklady od klienta jsou v `client-materials/`
(dotazník, logo, fotky, font) – tento soubor je jejich zpracovaný výtah + technická rozhodnutí.

## Git workflow

Po dokončení každé změny v tomto repozitáři automaticky proveď `git commit` a `git push`
na `main` bez čekání na explicitní potvrzení uživatele. Commituj jen soubory relevantní
k provedené změně (ne nesouvisející netracknuté soubory, které se v repu objeví).

**Nasazení není automatické z GitHubu** – žádný CI/CD tam není napojený, jen ruční
`wrangler deploy` (viz „Stav projektu"). Proto po každé změně, která ovlivňuje
hlavní web (cokoliv v `src/`, `public/`, `astro.config.mjs`, `wrangler.jsonc`),
kromě commit+push ještě z kořene repa spusť `npm run build && npx wrangler deploy`
a nasaď na `https://kostka-tcg.kostka-tcg.workers.dev`, ať živý web nikdy
nezůstane pozadu za repem (viz incident 2026-08-06, kdy web zůstal nasazený
jen z prvního uploadu a chyběla v něm skoro celá práce z toho dne).
Pokud `npm run build` selže na `EPERM`/zamčeném `dist/client`, zkontroluj
zaseklé staré `node.exe` procesy (`npm run dev`/`wrangler dev` z dřívějška
– běžný problém, protože repo leží v OneDrive) a ukonči je před opakováním
buildu. Změny ve `workers/playhub-refresh/` nasazuj zvlášť podle README
v tom adresáři (`wrangler deploy --config wrangler.toml`), nesouvisí
s hlavním webem.

## Klient

- **Firma:** KOSTKA TCG – herna a prodej trading card games (Lorcana, Pokémon, Riftbound),
  pořádání turnajů, lig a prerelease akcí nových sad.
- **Kontakty:** Vojtěch Kielkovský, Jan Mrázek · +420 773 334 488 · kostkatcg@gmail.com
- **IČO:** 299 34 249
- **Pobočka:** Dolní 782/65, 700 30 Ostrava-Zábřeh (MSK kraj, případně celá ČR)
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
- Barvy (z nového loga, `client-materials/Logo/Pro použití na web_*.svg`): fialová
  `#644595`, tmavá `#36363f`, bílá. V Tailwindu zapsané jako `kostka-purple`,
  `kostka-dark`, `kostka-white` (viz `src/styles/global.css`, `@theme`).
  `kostka-purple` je theme-aware stejně jako `kostka-white`/`kostka-bg`/`kostka-surface`:
  v `@theme` (tmavý motiv, výchozí) je to světlejší odstín `#9d7fe0` kvůli kontrastu
  na skoro černém pozadí, v `html[data-theme="light"]` se přepíná na přesný odstín
  z loga `#644595` (na bílém pozadí má sám o sobě dost kontrastu).
  Nahrazeno 2026-08-10 – původní paleta byla tyrkysová `#00b4d4` podle staršího loga.
- Font: **Raleway** (varianty Black + Medium), dodán jako variabilní `.ttf`
  v `client-materials/Fonty/`, zkopírován do `public/fonts/`.
- Ilustrace na míru (ne stock).
- Loga: `client-materials/Logo/Pro použití na web_Logo.svg` (plné s wordmarkem),
  `..._Ikona favicon.svg` (jen ikona kostky) a `..._Badge.svg` (kulatý odznak,
  zatím na webu nepoužitý) – zkopírováno/odvozeno do `public/images/logo-full.svg`,
  `logo-full-white.svg` (bílý wordmark pro tmavý motiv, ikona zůstává fialová),
  `logo-icon.svg` a `logo-icon-white.svg`.
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
- **Pravidelná obnova PlayHub dat:** samostatný Cloudflare Worker s Cron Triggerem
  (`workers/playhub-refresh/`, viz README tam) – Cron Triggers jsou funkce Workers,
  ne Pages, proto jde o zvlášť nasazovaný kousek infrastruktury vedle hlavního Pages
  projektu. Každých 15 minut projde turnaje s PlayHub odkazem a přepíše
  `spots_taken`/`capacity`/`price` v Supabase, takže stránky zůstávají statické
  a rychlé (žádný dotaz na PlayHub při renderu). Sdílí parser
  `src/lib/playhub-import.js` s ručním importem v administraci.
- Tento stack byl odsouhlasen s klientem/uživatelem – viz plán v
  `~/.claude/plans/eh-vytvo-il-jsem-ti-typed-breeze.md` (Cloudflare Pages + Supabase dává
  smysl, protože web potřebuje účty, admin panel a evidenci výsledků, ne jen prezentaci).

## Struktura repozitáře

```
src/
  components/{ui,auth,tournaments,admin}/  – React ostrůvky
  layouts/Layout.astro                     – hlavní layout (header/nav/footer)
  pages/                                   – Astro stránky dle mapy stránek výše
  pages/turnaje/[slug].astro               – detail turnaje/ligy + rezervační formulář (SSR podle slugu, ne statické cesty)
  data/tournaments.ts                      – čtení turnajů/lig ze Supabase (žádná mock data, viz Stav projektu)
  lib/supabase.ts                          – Supabase klient
  assets/gallery/                          – fotky klienta zpracované přes astro:assets (optimalizace)
  styles/global.css                        – Tailwind + brand @theme + Raleway @font-face
public/
  fonts/Raleway-VariableFont_wght.ttf
  images/logo-full.svg, logo-icon.svg
supabase/migrations/                       – SQL migrace (draft)
client-materials/                          – originální podklady od klienta (needit)
workers/playhub-refresh/                   – samostatný Cloudflare Worker (Cron Trigger),
                                              pravidelně obnovuje obsazenost/cenu turnajů
                                              z PlayHubu v Supabase (viz README v adresáři)
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
  návrh DB migrace).
- **Vizuální nastřel homepage a podstránek hotový.** Homepage, `/turnaje` a detail
  turnaje jsou od 2026-08-06 živě napojené na Supabase (viz níže) – zbytek
  (`/profil`, `/admin` mimo eventy) pořád na mock datech, dokud nepřibude auth:
  - Homepage (`src/pages/index.astro`): hero s fotkou, USP, rezervační kalendář
    (`ReservationCalendar.astro`) + nejbližší termíny, nadcházející turnaje
    (`TournamentCard.astro`), předešlé turnaje (`PastTournamentCard.astro`), galerie
    z fotek klienta, teaser O nás, teaser FAQ, kontakt/mapa placeholder.
  - Header (`Layout.astro`): sticky menu, odkazy „Přihlásit se" (`/prihlaseni`) a
    „Registrovat se" (`/registrace`), tlačítko „zpět nahoru".
  - `/turnaje` – plný kalendář + rozdělení Liga / Turnaje a prerelease + proběhlé.
  - `/turnaje/[slug]` – detail termínu s rezervačním formulářem (host i přihlášený).
  - `/profil` – karta hráče, statistiky, historie výsledků, nastavení (mock data).
  - `/admin` – tabulka termínů, detail termínu se seznamem hráčů a zápisem
    výher/proher/remíz (mock data, needituje se).
  - `/o-nas`, `/kontakt`, `/faq`, `/gdpr` doplněny o obsah.
  - Fotky použité v designu jsou v `src/assets/gallery/` (přes `astro:assets` – automatická
    optimalizace/responsive srcset při buildu, odpovídá požadavku „rychlé
    načítání/optimalizace obrázků" z dotazníku).
- **Další krok:** až se odsouhlasí vizuál, napojit reálná data na Supabase (nahradit
  `src/data/tournaments.ts`), zprovoznit auth (přihlášení/registrace) a formuláře.
- Git repozitář lokální i na GitHubu: `https://github.com/Hanys20/Kostka-tcg`.
- **Supabase projekt založen** (2026-08-06): `kostka-tcg`, org Visargy, region
  `eu-central-1` (Frankfurt), ref `xlcasytxoeiiwmvizyga`. Migrace ze
  `supabase/migrations/` napushnuté (`supabase db push`). Lokální `.env` (needituje
  se do gitu, viz `.gitignore`) má reálné `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY`/
  `SUPABASE_SERVICE_ROLE_KEY`. DB heslo bylo vygenerované a předané uživateli mimo repo
  (jen pro `supabase link`/`db push`, k Data API se nepoužívá).
  Pozn.: `00000000000000_init.sql` byl přejmenován na `00000000000000_initial_schema.sql`
  – Supabase CLI soubor s názvem přesně `init` při `db push` přeskakuje.
- Tabulka `events` má v produkci aspoň 1 turnaj s PlayHub odkazem (ověřeno
  2026-08-06 přes worker – viz níže).
- **2026-08-06: odstraněna mock data turnajů/lig a homepage/`/turnaje`/detail
  turnaje přepojeny na živé čtení ze Supabase.** Původně `src/data/tournaments.ts`
  vracel fallback mock pole, kdykoliv Supabase dotaz selhal nebo vrátil prázdno
  – to smazáno, teď při prázdné/chybové odpovědi vrací `[]` a stránky ukážou
  „Zatím tu nejsou žádné termíny…“. Skutečná příčina, proč se nově vytvořený
  turnaj z `/admin` neobjevoval na veřejné stránce, ale byla jiná: `index.astro`,
  `turnaje/index.astro` a `turnaje/[slug].astro` neměly `export const
  prerender = false`, takže je Astro (output `static` + Cloudflare adaptér)
  prerenderoval jen při buildu – nová data z admin API (zapisuje do Supabase
  za běhu) se propsala až po dalším git push/deploy. Přidán `prerender = false`
  na všechny tři, takže se teď načítají živě při každém requestu (SSR).
  `turnaje/[slug].astro` navíc přestal používat `getStaticPaths` (neslučitelné
  s `prerender = false`) a místo toho dotahuje konkrétní událost podle
  `Astro.params.slug` přes novou `getEventBySlug()` – neznámý slug přesměruje
  na `/turnaje`. Ověřeno end-to-end přes běžící dev server: vytvoření/smazání
  turnaje přes `/api/admin/events` se ihned projeví na `/` i `/turnaje` bez
  rebuildu.
- **`workers/playhub-refresh/` je od 2026-08-06 nasazený na Cloudflare** –
  `wrangler deploy` proběhl (`https://kostka-tcg-playhub-refresh.kostka-tcg.workers.dev`,
  cron `*/15 * * * *`), secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `REFRESH_TOKEN`) nastavené přes `wrangler secret put`. Ověřeno ručním
  zavoláním s tokenem + `wrangler tail`: worker se připojí na Supabase, najde
  turnaje s PlayHub odkazem a projde refresh. Obsazenost/cena turnajů
  z PlayHubu se tedy teď obnovuje automaticky každých 15 minut, ne jen při
  ručním (re)importu přes administraci.
  Past: **pozor na `wrangler` v `workers/playhub-refresh/` bez `--config
  wrangler.toml`** – v kořeni repa je `.wrangler/deploy/config.json` (vytváří
  ho Astro Cloudflare adaptér při buildu hlavního webu) a wrangler ho najde
  při hledání nahoru stromem adresářů, takže příkazy jako `deployments list`/
  `secret list` bez explicitního `--config` tiše přesměruje na hlavní Pages
  projekt `kostka-tcg` místo na tenhle worker. Vždy používat
  `--config wrangler.toml` v tomto adresáři.
- **Admin (`/admin`) je od 2026-08-06 plně napojený na Supabase** – `/api/admin/events`
  má teď GET/POST/PATCH/DELETE (dřív jen POST), seznam událostí se načítá živě
  z DB (ne z localStorage/mock dat) a u každého řádku jsou tlačítka Upravit/Smazat.
  Přihlášení do admina je pořád jen natvrdo v klientském JS (nick `admin`/heslo
  `admin123`, žádná reálná autorizace na API), stejně jako předtím – zabezpečit
  admin API skutečným auth zůstává otevřené.
- `src/lib/playhub-import.js` byl zpevněný proti React/react-intl hydration
  komentářům (`<!-- -->`), které umí rozdělit interpolovaný text ("54 of 80")
  a useknout prostý regex hned za prvním číslem – přidán i fallback na
  "Roster (X)" nadpis. Testy v `tests/playhub-import.test.mjs`.
- Kontrast v `src/styles/global.css`: rozbalené `<select>` možnosti a
  `::placeholder` byly v jednom z motivů prakticky nečitelné (bílý text na
  bílém/průhledném pozadí) – opraveno globálně pro oba motivy.
