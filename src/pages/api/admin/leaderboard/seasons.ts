import type { APIContext } from "astro";
import { requireAdmin, createServiceClient, jsonResponse } from "../../../../lib/adminAuth";

export const prerender = false;

const SEASON_COLUMNS =
  "id, game, name, starts_on, ends_on, is_active, points_win, points_draw, points_loss, points_participation, prize_pool_label, prize_pool_value, prize_pool_note, created_at";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strOrNull = (v: unknown) => {
  const s = str(v);
  return s ? s : null;
};
const intOr = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export async function GET({ cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  const service = createServiceClient();
  const { data, error } = await service
    .from("lb_seasons")
    .select(SEASON_COLUMNS)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return jsonResponse({ ok: false, message: error.message }, 500);
  return jsonResponse({ ok: true, seasons: data ?? [] }, 200);
}

export async function POST({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const name = str(body?.name);
    const game = str(body?.game) || "Lorcana";
    if (!name) return jsonResponse({ ok: false, message: "Vyplňte název sezóny." }, 400);

    const service = createServiceClient();
    const isActive = body?.isActive === true;

    if (isActive) {
      await service.from("lb_seasons").update({ is_active: false }).eq("game", game);
    }

    const { data, error } = await service
      .from("lb_seasons")
      .insert({
        name,
        game,
        starts_on: strOrNull(body?.startsOn),
        ends_on: strOrNull(body?.endsOn),
        is_active: isActive,
        points_win: intOr(body?.pointsWin, 3),
        points_draw: intOr(body?.pointsDraw, 1),
        points_loss: intOr(body?.pointsLoss, 0),
        points_participation: intOr(body?.pointsParticipation, 3),
        prize_pool_label: strOrNull(body?.prizePoolLabel),
        prize_pool_value: strOrNull(body?.prizePoolValue),
        prize_pool_note: strOrNull(body?.prizePoolNote),
      })
      .select(SEASON_COLUMNS)
      .single();

    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true, season: data }, 201);
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" },
      500
    );
  }
}

export async function PATCH({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const id = str(body?.id);
    if (!id) return jsonResponse({ ok: false, message: "Chybí id sezóny." }, 400);

    const service = createServiceClient();
    const { data: current, error: readErr } = await service
      .from("lb_seasons")
      .select("game")
      .eq("id", id)
      .maybeSingle();
    if (readErr) return jsonResponse({ ok: false, message: readErr.message }, 500);
    if (!current) return jsonResponse({ ok: false, message: "Sezóna nenalezena." }, 404);

    const patch: Record<string, unknown> = {};
    if (body?.name !== undefined) {
      const name = str(body.name);
      if (!name) return jsonResponse({ ok: false, message: "Název nesmí být prázdný." }, 400);
      patch.name = name;
    }
    if (body?.game !== undefined) patch.game = str(body.game) || "Lorcana";
    if (body?.startsOn !== undefined) patch.starts_on = strOrNull(body.startsOn);
    if (body?.endsOn !== undefined) patch.ends_on = strOrNull(body.endsOn);
    if (body?.pointsWin !== undefined) patch.points_win = intOr(body.pointsWin, 3);
    if (body?.pointsDraw !== undefined) patch.points_draw = intOr(body.pointsDraw, 1);
    if (body?.pointsLoss !== undefined) patch.points_loss = intOr(body.pointsLoss, 0);
    if (body?.pointsParticipation !== undefined)
      patch.points_participation = intOr(body.pointsParticipation, 3);
    if (body?.prizePoolLabel !== undefined) patch.prize_pool_label = strOrNull(body.prizePoolLabel);
    if (body?.prizePoolValue !== undefined) patch.prize_pool_value = strOrNull(body.prizePoolValue);
    if (body?.prizePoolNote !== undefined) patch.prize_pool_note = strOrNull(body.prizePoolNote);

    const targetGame = (patch.game as string) ?? current.game;
    if (body?.isActive !== undefined) {
      patch.is_active = body.isActive === true;
      if (patch.is_active) {
        await service
          .from("lb_seasons")
          .update({ is_active: false })
          .eq("game", targetGame)
          .neq("id", id);
      }
    }

    if (Object.keys(patch).length === 0) {
      return jsonResponse({ ok: true }, 200);
    }

    const { data, error } = await service
      .from("lb_seasons")
      .update(patch)
      .eq("id", id)
      .select(SEASON_COLUMNS)
      .single();

    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true, season: data }, 200);
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
    const id = str(body?.id);
    if (!id) return jsonResponse({ ok: false, message: "Chybí id sezóny." }, 400);

    const service = createServiceClient();
    const { error } = await service.from("lb_seasons").delete().eq("id", id);
    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" },
      500
    );
  }
}
