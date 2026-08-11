import type { APIContext } from "astro";
import { requireAdmin, jsonResponse } from "../../../lib/adminAuth";

export const prerender = false;

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

export async function GET({ cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const { data, error } = await auth.session.client
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

export async function POST({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const { title, type, game, date, startTime, endTime, capacity, registrationUrl, price, spotsTaken } = body;

    if (!title || !type || !game || !date || !startTime || !endTime || !capacity) {
      return jsonResponse({ ok: false, message: "Chybějící pole pro vytvoření události." }, 400);
    }

    const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
    const slug = toSlug(`${title}-${date}`);

    const { data, error } = await auth.session.client
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

export async function PATCH({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

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

    const { error } = await auth.session.client
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

export async function DELETE({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return jsonResponse({ ok: false, message: "Chybí id mazané události." }, 400);
    }

    const { error } = await auth.session.client.from("events").delete().eq("id", id);

    if (error) {
      return jsonResponse({ ok: false, message: error.message }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}
