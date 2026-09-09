import type { APIContext } from "astro";
import { requireAdmin, createServiceClient, jsonResponse } from "../../../../lib/adminAuth";

export const prerender = false;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const nonNegInt = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};
const anyInt = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/** Vrátí hráče sezóny daného kola sloučené s jejich zápisem (pokud existuje). */
export async function GET({ url, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  const roundId = url.searchParams.get("round");
  if (!roundId) return jsonResponse({ ok: false, message: "Chybí id kola." }, 400);

  const service = createServiceClient();
  const { data: round, error: roundErr } = await service
    .from("lb_rounds")
    .select("id, season_id, label")
    .eq("id", roundId)
    .maybeSingle();
  if (roundErr) return jsonResponse({ ok: false, message: roundErr.message }, 500);
  if (!round) return jsonResponse({ ok: false, message: "Kolo nenalezeno." }, 404);

  const [{ data: players, error: pErr }, { data: entries, error: eErr }] = await Promise.all([
    service
      .from("lb_players")
      .select("id, display_name")
      .eq("season_id", round.season_id)
      .order("display_name", { ascending: true }),
    service
      .from("lb_entries")
      .select("player_id, wins, draws, losses, bonus_points, bonus_note")
      .eq("round_id", roundId),
  ]);
  if (pErr) return jsonResponse({ ok: false, message: pErr.message }, 500);
  if (eErr) return jsonResponse({ ok: false, message: eErr.message }, 500);

  const byPlayer = new Map((entries ?? []).map((e) => [e.player_id, e]));
  const rows = (players ?? []).map((p) => {
    const e = byPlayer.get(p.id);
    return {
      playerId: p.id,
      displayName: p.display_name,
      played: !!e,
      wins: e?.wins ?? 0,
      draws: e?.draws ?? 0,
      losses: e?.losses ?? 0,
      bonusPoints: e?.bonus_points ?? 0,
      bonusNote: e?.bonus_note ?? "",
    };
  });

  return jsonResponse({ ok: true, round, rows }, 200);
}

/**
 * Hromadné uložení kola. Body: { roundId, entries: [{ playerId, played?, wins,
 * draws, losses, bonusPoints, bonusNote }] }.
 * `played:false` (nebo samé nuly bez poznámky/bonusu) → zápis se smaže, hráč
 * v tom kole nehrál a nezapočítá se mu ani účast.
 */
export async function PUT({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const roundId = str(body?.roundId);
    if (!roundId) return jsonResponse({ ok: false, message: "Chybí id kola." }, 400);
    if (!Array.isArray(body?.entries))
      return jsonResponse({ ok: false, message: "Chybí seznam zápisů." }, 400);

    const service = createServiceClient();
    const { data: round, error: roundErr } = await service
      .from("lb_rounds")
      .select("id, season_id")
      .eq("id", roundId)
      .maybeSingle();
    if (roundErr) return jsonResponse({ ok: false, message: roundErr.message }, 500);
    if (!round) return jsonResponse({ ok: false, message: "Kolo nenalezeno." }, 404);

    const { data: seasonPlayers } = await service
      .from("lb_players")
      .select("id")
      .eq("season_id", round.season_id);
    const validIds = new Set((seasonPlayers ?? []).map((p) => p.id));

    const toUpsert: Array<Record<string, unknown>> = [];
    const toDelete: string[] = [];

    for (const raw of body.entries) {
      const playerId = str(raw?.playerId);
      if (!playerId || !validIds.has(playerId)) continue;

      const wins = nonNegInt(raw?.wins);
      const draws = nonNegInt(raw?.draws);
      const losses = nonNegInt(raw?.losses);
      const bonusPoints = anyInt(raw?.bonusPoints);
      const bonusNote = str(raw?.bonusNote);
      const explicitlyPlayed = raw?.played === true;
      const explicitlyAbsent = raw?.played === false;
      const hasData =
        wins > 0 || draws > 0 || losses > 0 || bonusPoints !== 0 || bonusNote.length > 0;

      if (explicitlyAbsent || (!explicitlyPlayed && !hasData)) {
        toDelete.push(playerId);
        continue;
      }

      toUpsert.push({
        round_id: roundId,
        player_id: playerId,
        wins,
        draws,
        losses,
        bonus_points: bonusPoints,
        bonus_note: bonusNote || null,
      });
    }

    if (toDelete.length) {
      const { error } = await service
        .from("lb_entries")
        .delete()
        .eq("round_id", roundId)
        .in("player_id", toDelete);
      if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    }

    if (toUpsert.length) {
      const { error } = await service
        .from("lb_entries")
        .upsert(toUpsert, { onConflict: "round_id,player_id" });
      if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    }

    return jsonResponse({ ok: true, saved: toUpsert.length, cleared: toDelete.length }, 200);
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" },
      500
    );
  }
}

export async function DELETE({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const roundId = str(body?.roundId);
    const playerId = str(body?.playerId);
    if (!roundId) return jsonResponse({ ok: false, message: "Chybí id kola." }, 400);

    const service = createServiceClient();
    let q = service.from("lb_entries").delete().eq("round_id", roundId);
    if (playerId) q = q.eq("player_id", playerId);
    const { error } = await q;
    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" },
      500
    );
  }
}
