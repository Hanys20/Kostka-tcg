import type { APIContext } from "astro";
import { getAdminSession, clearSessionCookies, jsonResponse } from "../../../lib/adminAuth";

export const prerender = false;

export async function POST({ cookies }: APIContext) {
  const session = await getAdminSession(cookies);
  if (session) {
    await session.client.auth.signOut();
  }
  clearSessionCookies(cookies);
  return jsonResponse({ ok: true }, 200);
}
