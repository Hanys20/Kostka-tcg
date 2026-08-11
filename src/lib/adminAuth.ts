import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const ACCESS_COOKIE = "kostka_admin_at";
const REFRESH_COOKIE = "kostka_admin_rt";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 dní

const cookieOptions = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
};

export const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Service role klíč obchází RLS i trigger `profiles_guard_privileged_fields_trigger`
// (viz migrace 20260811000000) – smí ho používat jen server, nikdy klient.
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Klient podepsaný přístupovým tokenem konkrétního přihlášeného admina –
// zápisy přes něj procházejí přes RLS politiky (`is_admin()` v events/results),
// takže i případná chyba v app-level kontrole níže je kryta na úrovni DB.
function createUserClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function setSessionCookies(
  cookies: AstroCookies,
  session: { access_token: string; refresh_token: string; expires_in: number }
) {
  cookies.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions, maxAge: session.expires_in });
  cookies.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
}

export function clearSessionCookies(cookies: AstroCookies) {
  cookies.delete(ACCESS_COOKIE, { path: "/" });
  cookies.delete(REFRESH_COOKIE, { path: "/" });
}

export type AdminSession = {
  userId: string;
  nickname: string;
  isPrimary: boolean;
  client: SupabaseClient;
};

async function loadAdminProfile(userId: string, accessToken: string): Promise<AdminSession | null> {
  const client = createUserClient(accessToken);
  const { data, error } = await client
    .from("profiles")
    .select("nickname, role, is_primary")
    .eq("id", userId)
    .single();

  if (error || !data || data.role !== "admin") {
    return null;
  }

  return { userId, nickname: data.nickname ?? "", isPrimary: !!data.is_primary, client };
}

export async function getAdminSession(cookies: AstroCookies): Promise<AdminSession | null> {
  const accessToken = cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) return null;

  const anon = createAnonClient();

  if (accessToken) {
    const { data, error } = await anon.auth.getUser(accessToken);
    if (!error && data.user) {
      return loadAdminProfile(data.user.id, accessToken);
    }
  }

  if (refreshToken) {
    const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.session && data.user) {
      setSessionCookies(cookies, data.session);
      return loadAdminProfile(data.user.id, data.session.access_token);
    }
  }

  clearSessionCookies(cookies);
  return null;
}

export async function requireAdmin(
  cookies: AstroCookies
): Promise<{ session: AdminSession } | { session: null; response: Response }> {
  const session = await getAdminSession(cookies);
  if (!session) {
    return { session: null, response: jsonResponse({ ok: false, message: "Nejste přihlášeni jako admin." }, 401) };
  }
  return { session };
}

export async function requirePrimaryAdmin(
  cookies: AstroCookies
): Promise<{ session: AdminSession } | { session: null; response: Response }> {
  const result = await requireAdmin(cookies);
  if (!result.session) return result;
  if (!result.session.isPrimary) {
    return {
      session: null,
      response: jsonResponse({ ok: false, message: "Tuto akci smí provést jen primární admin." }, 403),
    };
  }
  return { session: result.session };
}
