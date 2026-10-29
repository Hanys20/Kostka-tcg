import type { APIContext } from "astro";
import { requireAdmin, createServiceClient, jsonResponse } from "../../../lib/adminAuth";

export const prerender = false;

// Stav maratonu = jeden JSON dokument v řádku `main` (viz migrace 20261029000000).
const ROW_ID = "main";
const MAX_BYTES = 2_000_000;

// Postgres "undefined_table" / PostgREST "tabulka není ve schema cache".
const missingTable = (code?: string) => code === "42P01" || code === "PGRST205";

const noStore = (body: Record<string, unknown>, status: number) => {
  const res = jsonResponse(body, status);
  res.headers.set("cache-control", "no-store");
  return res;
};

export async function GET({ url, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  const service = createServiceClient();
  const since = url.searchParams.get("since");

  // Polling leaderboardu: nejdřív jen číslo verze, celý stav až když se změnil.
  if (since !== null) {
    const { data, error } = await service.from("marathon_state").select("rev").eq("id", ROW_ID).maybeSingle();
    if (error) return noStore({ ok: false, missingTable: missingTable(error.code), message: error.message }, 503);
    const rev = data?.rev ?? 0;
    if (String(rev) === since) return noStore({ ok: true, rev, changed: false }, 200);
  }

  const { data, error } = await service
    .from("marathon_state")
    .select("rev, state, updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) return noStore({ ok: false, missingTable: missingTable(error.code), message: error.message }, 503);
  return noStore({ ok: true, changed: true, rev: data?.rev ?? 0, state: data?.state ?? null }, 200);
}

export async function PUT({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return noStore({ ok: false, message: "Stav maratonu je moc velký." }, 413);

  let body: { state?: unknown; baseRev?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return noStore({ ok: false, message: "Neplatný JSON." }, 400);
  }
  const state = body.state;
  const baseRev = Number(body.baseRev);
  if (!state || typeof state !== "object" || Array.isArray(state) || !Number.isInteger(baseRev) || baseRev < 0) {
    return noStore({ ok: false, message: "Chybí stav nebo verze." }, 400);
  }

  const service = createServiceClient();
  const now = new Date().toISOString();

  if (baseRev === 0) {
    // První zápis – řádek ještě neexistuje. Kdyby ho mezitím založil někdo jiný,
    // insert spadne na primárním klíči a vrátíme konflikt níž.
    const { data, error } = await service
      .from("marathon_state")
      .insert({ id: ROW_ID, state, rev: 1, updated_at: now })
      .select("rev")
      .maybeSingle();
    if (!error && data) return noStore({ ok: true, rev: data.rev }, 200);
    if (error && error.code !== "23505") {
      return noStore({ ok: false, missingTable: missingTable(error.code), message: error.message }, 503);
    }
  } else {
    const { data, error } = await service
      .from("marathon_state")
      .update({ state, rev: baseRev + 1, updated_at: now })
      .eq("id", ROW_ID)
      .eq("rev", baseRev)
      .select("rev");
    if (error) return noStore({ ok: false, missingTable: missingTable(error.code), message: error.message }, 503);
    if (data && data.length) return noStore({ ok: true, rev: data[0].rev }, 200);
  }

  // Konflikt: mezitím zapsalo jiné zařízení – vrátíme aktuální stav.
  const { data: current } = await service.from("marathon_state").select("rev, state").eq("id", ROW_ID).maybeSingle();
  return noStore({ ok: false, conflict: true, rev: current?.rev ?? 0, state: current?.state ?? null }, 409);
}
