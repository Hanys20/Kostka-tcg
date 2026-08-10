import { supabase } from "../lib/supabase";

export type EventType = "tournament" | "league";
export type GameName = "Pokémon" | "Lorcana" | "Riftbound";

export interface TournamentEntry {
  id?: string;
  slug: string;
  title: string;
  game: GameName;
  type: EventType;
  date: string;
  time: string;
  day: number;
  spotsTaken: number;
  spotsTotal: number;
  registrationUrl?: string;
  description?: string;
  startsAt?: string;
  price?: string;
}

export interface PastTournamentEntry {
  slug: string;
  title: string;
  game: GameName;
  type: EventType;
  date: string;
  participants: number;
  winner: string;
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeEventRow = (row: any): TournamentEntry => {
  const startsAt = new Date(row.starts_at);
  const dateLabel = formatDate(row.starts_at);
  const timeLabel = formatTime(row.starts_at);
  const day = startsAt.getDate();
  const capacity = Number(row.capacity ?? 12);

  return {
    id: row.id,
    slug: row.slug || toSlug(`${row.title}-${row.starts_at}`),
    title: row.title,
    game: row.game,
    type: row.type,
    date: dateLabel,
    time: timeLabel,
    day,
    spotsTaken: row.type === "tournament" ? Number(row.spots_taken ?? 0) : 0,
    spotsTotal: capacity,
    // Liga si drží vlastní registraci na naší stránce – externí odkaz na PlayHub
    // dává smysl jen u turnajů/prerelease, kde se hráč registruje tam.
    registrationUrl: row.type === "tournament" ? row.registration_url || gameRegistrationUrls[row.game] : undefined,
    description: row.description,
    startsAt: row.starts_at,
    price: row.type === "tournament" ? row.price || undefined : undefined,
  };
};

const normalizePastEventRow = (row: any): PastTournamentEntry => ({
  slug: row.slug || toSlug(`${row.title}-${row.starts_at}`),
  title: row.title,
  game: row.game,
  type: row.type,
  date: formatDate(row.starts_at),
  // Zápočet výher/umístění zatím admin nezapisuje agregovaně na úroveň
  // turnaje (jen jednotlivé výsledky hráčů) – dokud to nepřibude, jde o
  // jediné hodnoty, které lze zobrazit poctivě.
  participants: 0,
  winner: "—",
});

const isSupabaseReady = () => {
  return Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
};

const EVENT_COLUMNS = "id, slug, title, type, game, starts_at, capacity, description, status, registration_url, price, spots_taken";

export async function getUpcomingTournaments(): Promise<TournamentEntry[]> {
  if (!isSupabaseReady()) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", "upcoming")
    .order("starts_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(normalizeEventRow);
}

export async function getPastTournaments(): Promise<PastTournamentEntry[]> {
  if (!isSupabaseReady()) {
    return [];
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .or(`status.eq.past,status.eq.cancelled`)
    .lt("starts_at", now)
    .order("starts_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(normalizePastEventRow);
}

export async function getAllEventData() {
  const [upcoming, past] = await Promise.all([getUpcomingTournaments(), getPastTournaments()]);
  return { upcoming, past };
}

export async function getEventBySlug(
  slug: string,
): Promise<{ event: TournamentEntry | PastTournamentEntry; isPast: boolean } | null> {
  if (!isSupabaseReady()) {
    return null;
  }

  const { data, error } = await supabase.from("events").select(EVENT_COLUMNS).eq("slug", slug).maybeSingle();

  if (error || !data) {
    return null;
  }

  const isPast = data.status === "past" || data.status === "cancelled" || new Date(data.starts_at) < new Date();

  return isPast ? { event: normalizePastEventRow(data), isPast: true } : { event: normalizeEventRow(data), isPast: false };
}

export const gameBadgeColors: Record<TournamentEntry["game"], string> = {
  Pokémon: "bg-yellow-400/10 text-yellow-300",
  Lorcana: "bg-purple-400/10 text-purple-300",
  Riftbound: "bg-kostka-purple/10 text-kostka-purple",
};

export const gameRegistrationUrls: Record<TournamentEntry["game"], string> = {
  Lorcana: "https://www.ravensburgerplayhub.com/",
  Pokémon: "https://www.pokemon.com/us/play-pokemon/",
  Riftbound: "https://www.riftbound.com/",
};
