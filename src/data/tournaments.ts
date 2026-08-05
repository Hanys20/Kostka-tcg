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

const fallbackUpcomingTournaments: TournamentEntry[] = [
  {
    slug: "pokemon-liga-6-8",
    title: "Pokémon liga",
    game: "Pokémon",
    type: "league",
    date: "čt 6. 8. 2026",
    time: "18:00",
    day: 6,
    spotsTaken: 8,
    spotsTotal: 12,
  },
  {
    slug: "lorcana-turnaj-8-8",
    title: "Lorcana turnaj",
    game: "Lorcana",
    type: "tournament",
    date: "so 8. 8. 2026",
    time: "13:00",
    day: 8,
    spotsTaken: 14,
    spotsTotal: 16,
  },
  {
    slug: "pokemon-liga-13-8",
    title: "Pokémon liga",
    game: "Pokémon",
    type: "league",
    date: "čt 13. 8. 2026",
    time: "18:00",
    day: 13,
    spotsTaken: 5,
    spotsTotal: 12,
  },
  {
    slug: "riftbound-prerelease-14-8",
    title: "Riftbound prerelease",
    game: "Riftbound",
    type: "tournament",
    date: "pá 14. 8. 2026",
    time: "17:00",
    day: 14,
    spotsTaken: 12,
    spotsTotal: 20,
  },
  {
    slug: "lorcana-liga-18-8",
    title: "Lorcana liga",
    game: "Lorcana",
    type: "league",
    date: "út 18. 8. 2026",
    time: "18:00",
    day: 18,
    spotsTaken: 3,
    spotsTotal: 12,
  },
];

const fallbackPastTournaments: PastTournamentEntry[] = [
  {
    slug: "pokemon-turnaj-30-7",
    title: "Pokémon turnaj",
    game: "Pokémon",
    type: "tournament",
    date: "čt 30. 7. 2026",
    participants: 14,
    winner: "Jakub N.",
  },
  {
    slug: "lorcana-prerelease-23-7",
    title: "Lorcana prerelease",
    game: "Lorcana",
    type: "tournament",
    date: "čt 23. 7. 2026",
    participants: 20,
    winner: "Tereza K.",
  },
  {
    slug: "riftbound-liga-16-7",
    title: "Riftbound liga",
    game: "Riftbound",
    type: "league",
    date: "čt 16. 7. 2026",
    participants: 10,
    winner: "Marek S.",
  },
  {
    slug: "pokemon-liga-9-7",
    title: "Pokémon liga",
    game: "Pokémon",
    type: "league",
    date: "čt 9. 7. 2026",
    participants: 11,
    winner: "Petra V.",
  },
];

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
    spotsTaken: 0,
    spotsTotal: capacity,
    registrationUrl: row.registration_url || gameRegistrationUrls[row.game],
    description: row.description,
    startsAt: row.starts_at,
  };
};

const isSupabaseReady = () => {
  return Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
};

export async function getUpcomingTournaments(): Promise<TournamentEntry[]> {
  if (!isSupabaseReady()) {
    return fallbackUpcomingTournaments;
  }

  const { data, error } = await supabase
    .from("events")
    .select("id, slug, title, type, game, starts_at, capacity, description, status, registration_url")
    .eq("status", "upcoming")
    .order("starts_at", { ascending: true });

  if (error || !data?.length) {
    return fallbackUpcomingTournaments;
  }

  return data.map(normalizeEventRow);
}

export async function getPastTournaments(): Promise<PastTournamentEntry[]> {
  if (!isSupabaseReady()) {
    return fallbackPastTournaments;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("id, slug, title, type, game, starts_at, capacity, description, status, registration_url")
    .or(`status.eq.past,status.eq.cancelled`)
    .lt("starts_at", now)
    .order("starts_at", { ascending: false });

  if (error || !data?.length) {
    return fallbackPastTournaments;
  }

  return data.map((row) => ({
    slug: row.slug || toSlug(`${row.title}-${row.starts_at}`),
    title: row.title,
    game: row.game,
    type: row.type,
    date: formatDate(row.starts_at),
    participants: 0,
    winner: "—",
  }));
}

export async function getAllEventData() {
  const [upcoming, past] = await Promise.all([getUpcomingTournaments(), getPastTournaments()]);
  return { upcoming, past };
}

export const gameBadgeColors: Record<TournamentEntry["game"], string> = {
  Pokémon: "bg-yellow-400/10 text-yellow-300",
  Lorcana: "bg-purple-400/10 text-purple-300",
  Riftbound: "bg-kostka-cyan/10 text-kostka-cyan",
};

export const gameRegistrationUrls: Record<TournamentEntry["game"], string> = {
  Lorcana: "https://www.ravensburgerplayhub.com/",
  Pokémon: "https://www.pokemon.com/us/play-pokemon/",
  Riftbound: "https://www.riftbound.com/",
};
