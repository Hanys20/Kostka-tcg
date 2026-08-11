import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient, setSessionCookies, jsonResponse } from "../../../lib/adminAuth";

export const prerender = false;

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export async function POST({ request, cookies }: APIContext) {
  try {
    const body = await request.json();
    const nick = typeof body?.nick === "string" ? body.nick.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!nick || !password) {
      return jsonResponse({ ok: false, message: "Vyplňte přezdívku i heslo." }, 400);
    }

    const invalidCredentials = () => jsonResponse({ ok: false, message: "Špatná přezdívka nebo heslo." }, 401);

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .ilike("nickname", nick)
      .maybeSingle();

    if (!profile) {
      return invalidCredentials();
    }

    const { data: authUser, error: authUserError } = await service.auth.admin.getUserById(profile.id);
    if (authUserError || !authUser.user?.email) {
      return invalidCredentials();
    }

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    });

    if (signInError || !signIn.session) {
      return invalidCredentials();
    }

    setSessionCookies(cookies, signIn.session);
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}
