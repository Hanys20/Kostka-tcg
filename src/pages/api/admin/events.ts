import { createClient } from "@supabase/supabase-js";

export const prerender = false;

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Service role klíč obchází RLS – admin API musí zapisovat/mazat bez ohledu
// na politiky psané pro přihlášené uživatele (viz supabase/migrations).
const getSupabase = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("id, slug, title, type, game, starts_at, capacity, status, registration_url, price, spots_taken, description")
      .order("starts_at", { ascending: false });

    if (error) {
      return jsonResponse({ ok: false, message: error.message }, 500);
    }

    return jsonResponse({ ok: true, events: data }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { title, type, game, date, startTime, endTime, capacity, registrationUrl, price, spotsTaken } = body;

    if (!title || !type || !game || !date || !startTime || !endTime || !capacity) {
      return jsonResponse({ ok: false, message: "Chybějící pole pro vytvoření události." }, 400);
    }

    const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
    const slug = toSlug(`${title}-${date}`);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .insert({
        type,
        title,
        game,
        starts_at: startsAt,
        capacity,
        status: "upcoming",
        description: `Začátek ${startTime}–${endTime}`,
        slug,
        registration_url: registrationUrl || null,
        price: price || null,
        spots_taken: spotsTaken || 0,
      })
      .select("id, slug")
      .single();

    if (error) {
      return jsonResponse({ ok: false, message: error.message }, 500);
    }

    return jsonResponse({ ok: true, id: data.id, slug: data.slug }, 201);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}

export async function PATCH({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { id, title, type, game, date, startTime, endTime, capacity, registrationUrl, price, spotsTaken, status } = body;

    if (!id) {
      return jsonResponse({ ok: false, message: "Chybí id upravované události." }, 400);
    }
    if (!title || !type || !game || !date || !startTime || !endTime || !capacity) {
      return jsonResponse({ ok: false, message: "Chybějící pole pro úpravu události." }, 400);
    }

    const startsAt = new Date(`${date}T${startTime}:00`).toISOString();

    const supabase = getSupabase();
    const { error } = await supabase
      .from("events")
      .update({
        type,
        title,
        game,
        starts_at: startsAt,
        capacity,
        description: `Začátek ${startTime}–${endTime}`,
        registration_url: registrationUrl || null,
        price: price || null,
        spots_taken: spotsTaken ?? 0,
        ...(status ? { status } : {}),
      })
      .eq("id", id);

    if (error) {
      return jsonResponse({ ok: false, message: error.message }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}

export async function DELETE({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return jsonResponse({ ok: false, message: "Chybí id mazané události." }, 400);
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      return jsonResponse({ ok: false, message: error.message }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}
