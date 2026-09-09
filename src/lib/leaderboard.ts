// Sdílená logika žebříčku ligy – čistě funkční, bez závislosti na DB, aby šla
// testovat samostatně (viz tests/leaderboard.test.mjs). Bodování vychází
// z brněnského Hero Comics: účast + výhra + remíza + (volitelný ruční bonus).

export interface Scoring {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  pointsParticipation: number;
}

export const DEFAULT_SCORING: Scoring = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  pointsParticipation: 3,
};

export interface PlayerRow {
  id: string;
  displayName: string;
  note?: string | null;
}

export interface RoundRow {
  id: string;
  label: string;
  playedOn?: string | null;
  sortOrder: number;
}

export interface EntryRow {
  roundId: string;
  playerId: string;
  wins: number;
  draws: number;
  losses: number;
  bonusPoints: number;
  bonusNote?: string | null;
}

export type Trend = "up" | "down" | "same" | "new";

export interface StandingRow {
  rank: number;
  playerId: string;
  displayName: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  roundsPlayed: number;
  pointsWins: number;
  pointsDraws: number;
  pointsParticipation: number;
  bonusPoints: number;
  trend: Trend;
  streak: number;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Body za jeden zápis (jedno kolo jednoho hráče). */
export function pointsForEntry(entry: EntryRow, scoring: Scoring): number {
  return (
    scoring.pointsParticipation +
    num(entry.wins) * scoring.pointsWin +
    num(entry.draws) * scoring.pointsDraw +
    num(entry.losses) * scoring.pointsLoss +
    num(entry.bonusPoints)
  );
}

interface Aggregate {
  playerId: string;
  displayName: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  bonusPoints: number;
  roundIds: Set<string>;
}

function aggregate(
  players: PlayerRow[],
  entries: EntryRow[],
  scoring: Scoring
): Map<string, Aggregate> {
  const byId = new Map<string, Aggregate>();
  for (const p of players) {
    byId.set(p.id, {
      playerId: p.id,
      displayName: p.displayName,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      bonusPoints: 0,
      roundIds: new Set(),
    });
  }
  for (const e of entries) {
    const row = byId.get(e.playerId);
    if (!row) continue; // zápis pro smazaného hráče – ignorovat
    row.wins += num(e.wins);
    row.draws += num(e.draws);
    row.losses += num(e.losses);
    row.bonusPoints += num(e.bonusPoints);
    row.points += pointsForEntry(e, scoring);
    row.roundIds.add(e.roundId);
  }
  return byId;
}

const collator = new Intl.Collator("cs", { sensitivity: "base" });

function rankOrder(a: Aggregate, b: Aggregate): number {
  return (
    b.points - a.points ||
    b.wins - a.wins ||
    b.draws - a.draws ||
    collator.compare(a.displayName, b.displayName)
  );
}

/** Pořadí hráčů (jen id) podle daných zápisů – pro výpočet trendu. */
function orderedPlayerIds(
  players: PlayerRow[],
  entries: EntryRow[],
  scoring: Scoring
): string[] {
  return [...aggregate(players, entries, scoring).values()]
    .filter((a) => a.roundIds.size > 0)
    .sort(rankOrder)
    .map((a) => a.playerId);
}

/**
 * Série účasti: počet po sobě jdoucích NEJNOVĚJŠÍCH kol (dle sortOrder), ve
 * kterých má hráč zápis. Přeruší se prvním vynechaným kolem.
 */
export function attendanceStreak(
  playerId: string,
  rounds: RoundRow[],
  entries: EntryRow[]
): number {
  const played = new Set(
    entries.filter((e) => e.playerId === playerId).map((e) => e.roundId)
  );
  const ordered = [...rounds].sort((a, b) => b.sortOrder - a.sortOrder);
  let streak = 0;
  for (const r of ordered) {
    if (played.has(r.id)) streak += 1;
    else break;
  }
  return streak;
}

/**
 * Celkový žebříček. Trend se počítá porovnáním s pořadím BEZ posledního
 * (nejnovějšího dle sortOrder) kola.
 */
export function computeStandings(
  players: PlayerRow[],
  rounds: RoundRow[],
  entries: EntryRow[],
  scoring: Scoring
): StandingRow[] {
  const roundsSorted = [...rounds].sort((a, b) => a.sortOrder - b.sortOrder);
  const latestRoundId = roundsSorted.length
    ? roundsSorted[roundsSorted.length - 1].id
    : null;

  const prevIds = latestRoundId
    ? orderedPlayerIds(
        players,
        entries.filter((e) => e.roundId !== latestRoundId),
        scoring
      )
    : [];
  const prevRank = new Map(prevIds.map((id, i) => [id, i]));

  const ranked = [...aggregate(players, entries, scoring).values()]
    .filter((a) => a.roundIds.size > 0)
    .sort(rankOrder);

  return ranked.map((a, i) => {
    let trend: Trend;
    if (!latestRoundId || !prevRank.has(a.playerId)) {
      trend = latestRoundId ? "new" : "same";
    } else {
      const before = prevRank.get(a.playerId)!;
      trend = i < before ? "up" : i > before ? "down" : "same";
    }
    return {
      rank: i + 1,
      playerId: a.playerId,
      displayName: a.displayName,
      points: a.points,
      wins: a.wins,
      draws: a.draws,
      losses: a.losses,
      roundsPlayed: a.roundIds.size,
      pointsWins: a.wins * scoring.pointsWin,
      pointsDraws: a.draws * scoring.pointsDraw,
      pointsParticipation: a.roundIds.size * scoring.pointsParticipation,
      bonusPoints: a.bonusPoints,
      trend,
      streak: attendanceStreak(a.playerId, rounds, entries),
    };
  });
}

/**
 * Přezdívku nechá být, celé jméno „Jan Novák" zkrátí na „Jan N.".
 * Víceslovná příjmení: „Jan van der Berg" → „Jan v.". Jedno slovo → beze změny.
 */
export function abbreviateSurname(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const parts = trimmed.split(" ");
  if (parts.length < 2) return trimmed;
  const first = parts.slice(0, -1).join(" ");
  const last = parts[parts.length - 1];
  const initial = [...last][0];
  if (!initial) return first;
  return `${first} ${initial.toUpperCase()}.`;
}
