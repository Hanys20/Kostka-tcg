// Coconut formát: hráči hrají multiplayer hry v „podech" po 3–4 hráčích.
// Body za umístění v podu: 1. místo 4 b, 2. místo 2 b, ostatní 1 b.
// Tie breaker: součet loru ze všech her.
// Čistě funkční – stav turnaje drží stránka /admin/coconut (localStorage).

export type CoconutPlayer = { id: string; name: string; dropped?: boolean };

export type PodResult = { playerId: string; place: number | null; lore: number | null };

export type Pod = { players: string[]; results: PodResult[] };

export type CoconutRound = { number: number; pods: Pod[] };

export type StandingRow = {
  playerId: string;
  name: string;
  dropped: boolean;
  points: number;
  lore: number;
  games: number;
  wins: number;
  rank: number;
};

export function pointsForPlace(place: number | null): number {
  if (place === 1) return 4;
  if (place === 2) return 2;
  return place == null ? 0 : 1;
}

/**
 * Velikosti podů pro n hráčů – co nejvíc čtveřic, zbytek trojice.
 * 5 hráčů na 3/4 rozdělit nejde, vrací jeden pod o 5.
 */
export function podSizes(n: number): number[] {
  if (n < 3) return [];
  if (n === 5) return [5];
  const count = Math.ceil(n / 4);
  const threes = count * 4 - n;
  return [...Array(count - threes).fill(4), ...Array(threes).fill(3)];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Kolikrát spolu jednotlivé dvojice hráčů už seděly v podu. */
export function meetingCounts(rounds: CoconutRound[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rounds) {
    for (const pod of r.pods) {
      for (let i = 0; i < pod.players.length; i++) {
        for (let j = i + 1; j < pod.players.length; j++) {
          const k = pairKey(pod.players[i], pod.players[j]);
          m.set(k, (m.get(k) ?? 0) + 1);
        }
      }
    }
  }
  return m;
}

/**
 * Náhodně rozlosuje hráče do podů. Zkusí víc náhodných rozlosování a vezme to,
 * kde se nejméně opakují dvojice soupeřů z předchozích kol.
 */
export function drawPods(
  playerIds: string[],
  previousRounds: CoconutRound[] = [],
  rand: () => number = Math.random,
  attempts = 300
): string[][] {
  const sizes = podSizes(playerIds.length);
  if (!sizes.length) return [];
  const met = meetingCounts(previousRounds);

  let best: string[][] = [];
  let bestScore = Infinity;
  for (let t = 0; t < attempts; t++) {
    const order = shuffle(playerIds, rand);
    const pods: string[][] = [];
    let idx = 0;
    for (const size of sizes) {
      pods.push(order.slice(idx, idx + size));
      idx += size;
    }
    let score = 0;
    for (const pod of pods) {
      for (let i = 0; i < pod.length; i++) {
        for (let j = i + 1; j < pod.length; j++) {
          const c = met.get(pairKey(pod[i], pod[j])) ?? 0;
          score += c * c;
        }
      }
    }
    if (score < bestScore) {
      best = pods;
      bestScore = score;
      if (score === 0) break;
    }
  }
  return best;
}

export function makeRound(number: number, podPlayers: string[][]): CoconutRound {
  return {
    number,
    pods: podPlayers.map((players) => ({
      players,
      results: players.map((playerId) => ({ playerId, place: null, lore: null })),
    })),
  };
}

/** Vrátí text chyby, pokud pod ještě nemá kompletní výsledek, jinak null. */
export function podError(pod: Pod): string | null {
  const places = pod.results.map((r) => r.place);
  if (places.some((p) => p == null)) return "Doplň umístění všem hráčům.";
  if (places.filter((p) => p === 1).length !== 1) return "Právě jeden hráč musí být 1.";
  if (pod.players.length > 1 && places.filter((p) => p === 2).length !== 1) {
    return "Právě jeden hráč musí být 2.";
  }
  if (pod.results.some((r) => r.lore == null || r.lore < 0)) return "Doplň lore všem hráčům.";
  return null;
}

export function roundComplete(round: CoconutRound): boolean {
  return round.pods.every((p) => podError(p) === null);
}

/** Umístění odvozené z loru (víc loru = lepší). Stejný lore = stejné místo. */
export function placesFromLore(results: PodResult[]): (number | null)[] {
  return results.map((r) => {
    if (r.lore == null) return null;
    return 1 + results.filter((o) => o.lore != null && o.lore > r.lore!).length;
  });
}

/** Pořadí: body ↓, lore ↓. Shodné body i lore = sdílené místo. */
export function computeStandings(players: CoconutPlayer[], rounds: CoconutRound[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const p of players) {
    rows.set(p.id, {
      playerId: p.id,
      name: p.name,
      dropped: !!p.dropped,
      points: 0,
      lore: 0,
      games: 0,
      wins: 0,
      rank: 0,
    });
  }
  for (const r of rounds) {
    for (const pod of r.pods) {
      for (const res of pod.results) {
        const row = rows.get(res.playerId);
        if (!row || res.place == null) continue;
        row.points += pointsForPlace(res.place);
        row.lore += res.lore ?? 0;
        row.games += 1;
        if (res.place === 1) row.wins += 1;
      }
    }
  }
  const list = [...rows.values()].sort(
    (a, b) => b.points - a.points || b.lore - a.lore || a.name.localeCompare(b.name, "cs")
  );
  list.forEach((row, i) => {
    const prev = list[i - 1];
    row.rank = prev && prev.points === row.points && prev.lore === row.lore ? prev.rank : i + 1;
  });
  return list;
}
