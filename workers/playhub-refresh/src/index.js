// Cloudflare Worker se Cron Triggerem – pravidelně (viz wrangler.toml) projde
// nadcházející události (turnaje i ligy) uložené v Supabase, u těch s odkazem
// na PlayHub znovu načte a naparsuje jejich stránku a aktualizuje obsazenost/cenu/kapacitu.
// Používá stejný parser jako ruční import v administraci (src/lib/playhub-import.js),
// aby se logika parsování PlayHub HTML neduplikovala.
import { createClient } from "@supabase/supabase-js";
import { parsePlayHubEvent } from "../../../src/lib/playhub-import.js";

const PLAYHUB_EVENT_URL = /ravensburgerplay(?:hub)?\.com\/events\//i;
const USER_AGENT = "Mozilla/5.0 (compatible; KostkaTCG/1.0; +https://kostkatcg.cz)";

async function refreshOneEvent(supabase, event) {
  const response = await fetch(event.registration_url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    console.error(`PlayHub vrátil ${response.status} pro turnaj ${event.id} (${event.registration_url})`);
    return;
  }

  const html = await response.text();
  const parsed = parsePlayHubEvent(html, { sourceUrl: event.registration_url });
  const priceText = parsed.price && parsed.currency ? `${parsed.price} ${parsed.currency}` : parsed.price;

  const update = {};
  if (parsed.spotsTaken !== null && parsed.spotsTaken !== event.spots_taken) {
    update.spots_taken = parsed.spotsTaken;
  }
  if (parsed.spotsTotal !== null && parsed.spotsTotal !== event.capacity) {
    update.capacity = parsed.spotsTotal;
  }
  if (priceText && priceText !== event.price) {
    update.price = priceText;
  }

  if (Object.keys(update).length === 0) {
    return;
  }

  const { error } = await supabase.from("events").update(update).eq("id", event.id);
  if (error) {
    console.error(`Nepodařilo se uložit aktualizaci turnaje ${event.id}:`, error.message);
  } else {
    console.log(`Turnaj ${event.id} aktualizován:`, update);
  }
}

async function refreshPlayHubEvents(env) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: events, error } = await supabase
    .from("events")
    .select("id, registration_url, capacity, spots_taken, price")
    .eq("status", "upcoming")
    .not("registration_url", "is", null);

  if (error) {
    console.error("Nepodařilo se načíst turnaje ze Supabase:", error.message);
    return;
  }

  const playhubEvents = (events || []).filter((event) => PLAYHUB_EVENT_URL.test(event.registration_url || ""));
  console.log(`Obnovuji ${playhubEvents.length} turnajů z PlayHubu…`);

  for (const event of playhubEvents) {
    try {
      await refreshOneEvent(supabase, event);
    } catch (err) {
      console.error(`Chyba při obnově turnaje ${event.id}:`, err instanceof Error ? err.message : err);
    }
  }
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(refreshPlayHubEvents(env));
  },
  // Ruční spuštění pro debugování mimo cron – worker běží na veřejné *.workers.dev
  // adrese, takže vyžadujeme sdílený token (env.REFRESH_TOKEN), aby si obnovu
  // nemohl vyžádat kdokoliv zvenčí.
  async fetch(request, env) {
    const token = new URL(request.url).searchParams.get("token");
    if (!env.REFRESH_TOKEN || token !== env.REFRESH_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
    await refreshPlayHubEvents(env);
    return new Response("PlayHub refresh proběhl.", { status: 200 });
  },
};
