import type { AstroCookies } from "astro";
import { getAdminSession } from "./adminAuth";

// Náhled stránky velkého turnaje k libovolnému datu: ?nahled=2026-11-20
// (zobrazí stav ke 20:00 toho dne). Na ostrém webu jen pro přihlášené adminy,
// na náhledových (preview) URL Cloudflare a lokálně pro kohokoli s odkazem –
// tam se demo ukazuje ke schválení.
const PRODUCTION_HOSTS = new Set(["kostkatcg.cz", "www.kostkatcg.cz", "kostka-tcg.kostka-tcg.workers.dev"]);

export function isPreviewHost(hostname: string) {
  return !PRODUCTION_HOSTS.has(hostname);
}

export async function getChampionshipNow(
  url: URL,
  cookies: AstroCookies
): Promise<{ now: Date; previewing: boolean; canPreview: boolean }> {
  const raw = url.searchParams.get("nahled");
  const previewHost = isPreviewHost(url.hostname);

  if (!raw) {
    return { now: new Date(), previewing: false, canPreview: previewHost };
  }

  const canPreview = previewHost || Boolean(await getAdminSession(cookies));
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T20:00:00+01:00`) : new Date(raw);
  if (!canPreview || Number.isNaN(parsed.getTime())) {
    return { now: new Date(), previewing: false, canPreview };
  }
  return { now: parsed, previewing: true, canPreview };
}
