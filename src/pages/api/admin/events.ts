import { createClient } from "@supabase/supabase-js";

export const prerender = false;

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { title, type, game, date, startTime, endTime, capacity } = body;

    if (!title || !type || !game || !date || !startTime || !endTime || !capacity) {
      return new Response(
        JSON.stringify({ ok: false, message: "Chybějící pole pro vytvoření události." }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
    const slug = toSlug(`${title}-${date}`);

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { error } = await supabase.from("events").insert({
      type,
      title,
      game,
      starts_at: startsAt,
      capacity,
      status: "upcoming",
      description: `Začátek ${startTime}–${endTime}`,
      slug,
    });

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, message: error.message }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, slug }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
