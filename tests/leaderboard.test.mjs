import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCORING,
  pointsForEntry,
  computeStandings,
  attendanceStreak,
  abbreviateSurname,
} from "../src/lib/leaderboard.ts";

const S = DEFAULT_SCORING;

function entry(roundId, playerId, wins, draws, losses, bonusPoints = 0) {
  return { roundId, playerId, wins, draws, losses, bonusPoints };
}

test("pointsForEntry: účast + výhry + remízy + bonus (Hero Comics bodování)", () => {
  // 3 účast + 2*3 výhry + 1*1 remíza + 0*prohra + 5 bonus = 15
  assert.equal(pointsForEntry(entry("r1", "p1", 2, 1, 1, 5), S), 15);
  // jen účast, když nic neodehrál
  assert.equal(pointsForEntry(entry("r1", "p1", 0, 0, 0), S), 3);
});

test("computeStandings: řazení podle bodů, pak výher, pak jména (cs)", () => {
  const players = [
    { id: "a", displayName: "Alice" },
    { id: "b", displayName: "Bob" },
    { id: "c", displayName: "Cyril" },
  ];
  const rounds = [{ id: "r1", label: "Týden 1", sortOrder: 1 }];
  const entries = [
    entry("r1", "a", 3, 0, 0), // 3 + 9 = 12
    entry("r1", "b", 3, 0, 0), // 3 + 9 = 12 (shodné body i výhry → dle jména: Bob < Cyril, ale > Alice)
    entry("r1", "c", 1, 2, 0), // 3 + 3 + 2 = 8
  ];
  const standings = computeStandings(players, rounds, entries, S);
  assert.deepEqual(
    standings.map((r) => r.displayName),
    ["Alice", "Bob", "Cyril"]
  );
  assert.deepEqual(
    standings.map((r) => r.points),
    [12, 12, 8]
  );
  assert.deepEqual(
    standings.map((r) => r.rank),
    [1, 2, 3]
  );
});

test("computeStandings: hráč bez zápisu se v žebříčku neobjeví", () => {
  const players = [
    { id: "a", displayName: "Alice" },
    { id: "b", displayName: "Bob" },
  ];
  const rounds = [{ id: "r1", label: "Týden 1", sortOrder: 1 }];
  const entries = [entry("r1", "a", 1, 0, 0)];
  const standings = computeStandings(players, rounds, entries, S);
  assert.equal(standings.length, 1);
  assert.equal(standings[0].displayName, "Alice");
});

test("computeStandings: trend proti stavu před posledním kolem", () => {
  const players = [
    { id: "a", displayName: "Alice" },
    { id: "b", displayName: "Bob" },
    { id: "c", displayName: "Cyril" },
  ];
  const rounds = [
    { id: "r1", label: "Týden 1", sortOrder: 1 },
    { id: "r2", label: "Týden 2", sortOrder: 2 },
  ];
  const entries = [
    // Po kole 1: Bob 12, Alice 6, Cyril 6 → pořadí Bob, Alice, Cyril
    entry("r1", "b", 3, 0, 0),
    entry("r1", "a", 1, 0, 0),
    entry("r1", "c", 1, 0, 0),
    // Kolo 2: Alice velký zisk, Bob nic navíc, Cyril nehrál
    entry("r2", "a", 5, 0, 0), // Alice celkem 6 + 3 + 15 = 24
    entry("r2", "b", 0, 0, 3), // Bob celkem 12 + 3 = 15
  ];
  const standings = computeStandings(players, rounds, entries, S);
  const byName = Object.fromEntries(standings.map((r) => [r.displayName, r]));
  assert.equal(byName["Alice"].rank, 1);
  assert.equal(byName["Alice"].trend, "up"); // z 2. na 1.
  assert.equal(byName["Bob"].trend, "down"); // z 1. na 2.
  assert.equal(byName["Cyril"].trend, "same"); // pořád 3.
});

test("computeStandings: bez kol je trend 'same'", () => {
  const players = [{ id: "a", displayName: "Alice" }];
  const standings = computeStandings(players, [], [], S);
  assert.equal(standings.length, 0);
});

test("attendanceStreak: počítá jen souvislou sérii od nejnovějšího kola", () => {
  const rounds = [
    { id: "r1", label: "T1", sortOrder: 1 },
    { id: "r2", label: "T2", sortOrder: 2 },
    { id: "r3", label: "T3", sortOrder: 3 },
    { id: "r4", label: "T4", sortOrder: 4 },
  ];
  const entries = [
    entry("r1", "p", 0, 0, 0),
    // r2 vynecháno
    entry("r3", "p", 0, 0, 0),
    entry("r4", "p", 0, 0, 0),
  ];
  assert.equal(attendanceStreak("p", rounds, entries), 2); // r4 + r3, pak díra
  assert.equal(attendanceStreak("x", rounds, entries), 0);
});

test("abbreviateSurname: jméno s příjmením → iniciála, přezdívka beze změny", () => {
  assert.equal(abbreviateSurname("Jan Novák"), "Jan N.");
  assert.equal(abbreviateSurname("jan novák"), "jan N.");
  assert.equal(abbreviateSurname("Kubqo"), "Kubqo");
  assert.equal(abbreviateSurname("Jan van der Berg"), "Jan van der B.");
  assert.equal(abbreviateSurname("  Petr   Svoboda  "), "Petr S.");
  assert.equal(abbreviateSurname("Žofie Černá"), "Žofie Č.");
});
