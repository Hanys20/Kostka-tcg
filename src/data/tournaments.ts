// Ukázková (mock) data pro nastřel homepage a stránky Turnaje.
// Po napojení na Supabase nahradit dotazem na tabulku `events` / `results`.

export type EventType = "tournament" | "league";

export interface TournamentEntry {
  slug: string;
  title: string;
  game: "Pokémon" | "Lorcana" | "Riftbound";
  type: EventType;
  date: string; // human-readable, cs
  time: string;
  day: number; // den v měsíci (pro kalendář, srpen 2026)
  spotsTaken: number;
  spotsTotal: number;
}

export interface PastTournamentEntry {
  slug: string;
  title: string;
  game: "Pokémon" | "Lorcana" | "Riftbound";
  type: EventType;
  date: string;
  participants: number;
  winner: string;
}

export const upcomingTournaments: TournamentEntry[] = [
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

export const pastTournaments: PastTournamentEntry[] = [
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

export const gameBadgeColors: Record<TournamentEntry["game"], string> = {
  Pokémon: "bg-yellow-400/10 text-yellow-300",
  Lorcana: "bg-purple-400/10 text-purple-300",
  Riftbound: "bg-kostka-cyan/10 text-kostka-cyan",
};
