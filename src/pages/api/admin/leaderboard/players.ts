import type { APIContext } from "astro";
import { requireAdmin, createServiceClient, jsonResponse } from "../../../../lib/adminAuth";

export const prerender = false;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Profilový obrázek se ukládá jako `data:` URI (base64). Prohlížeč ho ve správě
// zmenší na 256 px, takže reálně jde o jednotky až desítky kB – limit 700 kB je
// jen bezpečnostní strop proti odeslání originálu.
const AVATAR_MAX_LEN = 700_000;
const AVATAR_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

/** Vrátí ověřenou hodnotu avataru, `null` (smazat), nebo `false` když je neplatná. */
function validateAvatar(value: unknown): string | null | false {
  if (value === null) return null;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > AVATAR_MAX_LEN || !AVATAR_RE.test(trimmed)) return false;
  return trimmed;
}

export async function GET({ url, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  const seasonId = url.searchParams.get("season");
  if (!seasonId) return jsonResponse({ ok: false, message: "Chybí id sezóny." }, 400);

  const service = createServiceClient();
  const { data, error } = await service
    .from("lb_players")
    .select("id, season_id, display_name, note, avatar_url, created_at")
    .eq("season_id", seasonId)
    .order("display_name", { ascending: true });

  if (error) return jsonResponse({ ok: false, message: error.message }, 500);
  return jsonResponse({ ok: true, players: data ?? [] }, 200);
}

export async function POST({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const seasonId = str(body?.seasonId);
    if (!seasonId) return jsonResponse({ ok: false, message: "Chybí id sezóny." }, 400);

    const rawNames: string[] = Array.isArray(body?.names)
      ? body.names
      : typeof body?.name === "string"
        ? [body.name]
        : [];

    // Deduplikace v rámci požadavku (case-insensitive), prázdné pryč.
    const seen = new Set<string>();
    const names: string[] = [];
    for (const raw of rawNames) {
      const name = str(raw);
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    if (!names.length) return jsonResponse({ ok: false, message: "Zadejte aspoň jedno jméno." }, 400);

    const service = createServiceClient();
    const { data: existing } = await service
      .from("lb_players")
      .select("display_name")
      .eq("season_id", seasonId);
    const existingKeys = new Set((existing ?? []).map((p) => p.display_name.toLowerCase()));

    const toInsert = names
      .filter((n) => !existingKeys.has(n.toLowerCase()))
      .map((display_name) => ({ season_id: seasonId, display_name }));

    let added: unknown[] = [];
    if (toInsert.length) {
      const { data, error } = await service
        .from("lb_players")
        .insert(toInsert)
        .select("id, season_id, display_name, note, avatar_url, created_at");
      if (error) return jsonResponse({ ok: false, message: error.message }, 500);
      added = data ?? [];
    }

    return jsonResponse(
      { ok: true, added, skipped: names.length - toInsert.length },
      201
    );
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
    if (!id) return jsonResponse({ ok: false, message: "Chybí id hráče." }, 400);

    const patch: Record<string, unknown> = {};
    if (body?.displayName !== undefined) {
      const name = str(body.displayName);
      if (!name) return jsonResponse({ ok: false, message: "Jméno nesmí být prázdné." }, 400);
      patch.display_name = name;
    }
    if (body?.note !== undefined) patch.note = str(body.note) || null;
    if (body?.avatarUrl !== undefined) {
      const avatar = validateAvatar(body.avatarUrl);
      if (avatar === false) {
        return jsonResponse(
          { ok: false, message: "Neplatný obrázek (očekává se PNG/JPEG/WebP do 700 kB)." },
          400
        );
      }
      patch.avatar_url = avatar;
    }

    if (!Object.keys(patch).length) return jsonResponse({ ok: true }, 200);

    const service = createServiceClient();
    const { error } = await service.from("lb_players").update(patch).eq("id", id);
    if (error) {
      const message =
        error.code === "23505" ? "Hráč s tímto jménem už v sezóně je." : error.message;
      return jsonResponse({ ok: false, message }, 400);
    }
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
    if (!id) return jsonResponse({ ok: false, message: "Chybí id hráče." }, 400);

    const service = createServiceClient();
    const { error } = await service.from("lb_players").delete().eq("id", id);
    if (error) return jsonResponse({ ok: false, message: error.message }, 500);
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" },
      500
    );
  }
}
