import type { APIContext } from "astro";
import { requireAdmin, createServiceClient, jsonResponse } from "../../../../lib/adminAuth";

export const prerender = false;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strOrNull = (v: unknown) => {
  const s = str(v);
  return s ? s : null;
};

export async function GET({ url, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  const seasonId = url.searchParams.get("season");
  if (!seasonId) return jsonResponse({ ok: false, message: "Chybí id sezóny." }, 400);

  const service = createServiceClient();
  const { data, error } = await service
    .from("lb_rounds")
    .select("id, season_id, label, played_on, sort_order, created_at")
    .eq("season_id", seasonId)
    .order("sort_order", { ascending: true });

  if (error) return jsonResponse({ ok: false, message: error.message }, 500);
  return jsonResponse({ ok: true, rounds: data ?? [] }, 200);
}

export async function POST({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const seasonId = str(body?.seasonId);
    if (!seasonId) return jsonResponse({ ok: false, message: "Chybí id sezóny." }, 400);

    const service = createServiceClient();
    const { data: last } = await service
      .from("lb_rounds")
      .select("sort_order")
      .eq("season_id", seasonId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (last?.sort_order ?? 0) + 1;
    const label = str(body?.label) || `Týden ${nextOrder}`;

    const { data, error } = await service
      .from("lb_rounds")
      .insert({
        season_id: seasonId,
        label,
        played_on: strOrNull(body?.playedOn),
        sort_order: nextOrder,
      })
      .select("id, season_id, label, played_on, sort_order, created_at")
      .single();

    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true, round: data }, 201);
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
    if (!id) return jsonResponse({ ok: false, message: "Chybí id kola." }, 400);

    const patch: Record<string, unknown> = {};
    if (body?.label !== undefined) {
      const label = str(body.label);
      if (!label) return jsonResponse({ ok: false, message: "Název kola nesmí být prázdný." }, 400);
      patch.label = label;
    }
    if (body?.playedOn !== undefined) patch.played_on = strOrNull(body.playedOn);
    if (body?.sortOrder !== undefined) {
      const n = Number(body.sortOrder);
      if (Number.isFinite(n)) patch.sort_order = Math.trunc(n);
    }

    if (!Object.keys(patch).length) return jsonResponse({ ok: true }, 200);

    const service = createServiceClient();
    const { error } = await service.from("lb_rounds").update(patch).eq("id", id);
    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true }, 200);
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
    if (!id) return jsonResponse({ ok: false, message: "Chybí id kola." }, 400);

    const service = createServiceClient();
    const { error } = await service.from("lb_rounds").delete().eq("id", id);
    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" },
      500
    );
  }
}
