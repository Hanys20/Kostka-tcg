# KOSTKA TCG – web

Web pro hernu KOSTKA TCG (Ostrava) – prezentace, přehled turnajů/lig a rezervační systém
s uživatelskými účty a administrací.

Projektová paměť a kontext (klient, funkční specifikace, datový model, otevřené otázky)
je v [`CLAUDE.md`](./CLAUDE.md). Zdrojové podklady od klienta (dotazník, logo, fotky, font)
jsou v [`client-materials/`](./client-materials).

## Tech stack

- [Astro](https://astro.build) + React ostrůvky (TypeScript)
- Tailwind CSS v4
- [Supabase](https://supabase.com) (Postgres, Auth, Row Level Security)
- Hosting: [Cloudflare Pages](https://pages.cloudflare.com) (`@astrojs/cloudflare`)

## Vývoj

```bash
npm install
cp .env.example .env   # doplnit PUBLIC_SUPABASE_URL a PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

- `npm run dev` – spustí vývojový server
- `npm run build` – produkční build (ověřuje kompatibilitu s Cloudflare adaptérem)
- `npm run preview` – náhled produkčního buildu

## Supabase

Návrh databázového schématu (profiles, events, registrations, results) je v
[`supabase/migrations/`](./supabase/migrations). Před ostrým nasazením ho projít s klientem –
viz sekce „Otevřené otázky" v `CLAUDE.md`.
