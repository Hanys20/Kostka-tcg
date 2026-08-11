import type { APIContext } from "astro";
import { parsePlayHubEvent } from "../../../lib/playhub-import.js";
import { requireAdmin } from "../../../lib/adminAuth";

export const prerender = false;

const ALLOWED_HOSTS = new Set(["ravensburgerplayhub.com", "www.ravensburgerplayhub.com", "tcg.ravensburgerplay.com"]);

export async function POST({ request, cookies }: APIContext) {
  const auth = await requireAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const targetUrl = body?.url?.trim();

    if (!targetUrl) {
      return new Response(JSON.stringify({ ok: false, message: "Chybí URL události." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ ok: false, message: "Neplatná URL." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ ok: false, message: "Povolené jsou jen odkazy na PlayHub." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KostkaTCG/1.0; +https://kostkatcg.cz)",
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ ok: false, message: "Nepodařilo se načíst stránku PlayHubu." }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    const html = await response.text();
    const parsed = parsePlayHubEvent(html, { sourceUrl: targetUrl });

    if (!parsed.title || !parsed.date || !parsed.startTime) {
      return new Response(JSON.stringify({ ok: false, message: "Na stránce nebyla nalezena očekávaná data." }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: parsed }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
