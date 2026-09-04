# playhub-refresh (Cloudflare Worker)

Samostatný Cloudflare Worker (mimo hlavní Astro/Pages projekt) s Cron Triggerem
(`wrangler.toml`, každých 15 minut). Projde v Supabase všechny nadcházející
události (turnaje i ligy, `status = upcoming`) s odkazem na PlayHub
(`registration_url` obsahující `ravensburgerplay(hub).com/events/…`), znovu
načte jejich stránku na PlayHubu a aktualizuje `spots_taken`, `capacity`
a `price`, pokud se změnily. Parsování HTML sdílí s ručním importem
v administraci – viz `src/lib/playhub-import.js` v kořeni repa.

Cron Triggers jsou funkce Workers, ne Pages, proto je to samostatný
`wrangler.toml`/deploy vedle hlavního Cloudflare Pages projektu.

## Nasazení

1. Založit Supabase projekt (zatím není hotovo – viz CLAUDE.md) a získat
   `service_role` klíč (Project Settings → API). **Nepoužívat anon klíč** –
   worker musí zapisovat bez ohledu na RLS politiky psané pro přihlášené uživatele.
2. `cd workers/playhub-refresh && npm install`
3. Lokální vývoj: zkopírovat `.dev.vars.example` do `.dev.vars` a doplnit
   hodnoty, pak `npm run dev`.
4. Nasazení: `npm run deploy` (poprvé si vyžádá přihlášení přes `wrangler login`).
5. Nastavit produkční secrets (jednou, neukládají se do repa):
   ```
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put REFRESH_TOKEN
   ```
6. Ověřit ručně: `GET https://kostka-tcg-playhub-refresh.<subdomain>.workers.dev/?token=<REFRESH_TOKEN>`
   nebo sledovat logy přes `npm run tail`.

## Poznámka

Turnaje bez PlayHub odkazu (obecný fallback `https://www.ravensburgerplayhub.com/`
bez `/events/…`) worker přeskakuje – nemá co refreshovat.
