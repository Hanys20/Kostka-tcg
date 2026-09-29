import test from "node:test";
import assert from "node:assert/strict";
import {
  pointsForPlace,
  podSizes,
  drawPods,
  makeRound,
  podError,
  placesFromLore,
  computeStandings,
} from "../src/lib/coconut.ts";

test("pointsForPlace: 1. = 4, 2. = 2, ostatní = 1", () => {
  assert.equal(pointsForPlace(1), 4);
  assert.equal(pointsForPlace(2), 2);
  assert.equal(pointsForPlace(3), 1);
  assert.equal(pointsForPlace(4), 1);
  assert.equal(pointsForPlace(null), 0);
});

test("podSizes: pody jen po 3–4 hráčích (kromě 5)", () => {
  assert.deepEqual(podSizes(2), []);
  assert.deepEqual(podSizes(3), [3]);
  assert.deepEqual(podSizes(4), [4]);
  assert.deepEqual(podSizes(5), [5]);
  assert.deepEqual(podSizes(6), [3, 3]);
  assert.deepEqual(podSizes(7), [4, 3]);
  assert.deepEqual(podSizes(9), [3, 3, 3]);
  assert.deepEqual(podSizes(13), [4, 3, 3, 3]);
  for (let n = 6; n <= 40; n++) {
    const s = podSizes(n);
    assert.equal(s.reduce((a, b) => a + b, 0), n);
    assert.ok(s.every((x) => x === 3 || x === 4), `n=${n}`);
  }
});

test("drawPods: každý hráč právě jednou, vyhýbá se opakovaným soupeřům", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const r1 = makeRound(1, [["a", "b", "c", "d"], ["e", "f", "g", "h"]]);
  const pods = drawPods(ids, [r1]);
  assert.deepEqual(pods.flat().sort(), ids);
  // 8 hráčů ve 2 podech po 4 – přesně 2 z každého starého podu, tj. 4 opakované dvojice je minimum
  const repeats = pods.reduce((sum, pod) => {
    const fromFirst = pod.filter((p) => "abcd".includes(p)).length;
    return sum + (fromFirst * (fromFirst - 1)) / 2 + ((4 - fromFirst) * (3 - fromFirst)) / 2;
  }, 0);
  assert.equal(repeats, 4);
});

test("podError + placesFromLore", () => {
  const round = makeRound(1, [["a", "b", "c"]]);
  const pod = round.pods[0];
  assert.ok(podError(pod));
  pod.results[0].lore = 20;
  pod.results[1].lore = 14;
  pod.results[2].lore = 9;
  placesFromLore(pod.results).forEach((p, i) => (pod.results[i].place = p));
  assert.deepEqual(pod.results.map((r) => r.place), [1, 2, 3]);
  assert.equal(podError(pod), null);
  pod.results[1].place = 1;
  assert.match(podError(pod), /jeden hráč musí být 1/);
});

test("computeStandings: body, pak lore jako tie breaker, sdílené místo", () => {
  const players = [
    { id: "a", name: "Anna" },
    { id: "b", name: "Bob" },
    { id: "c", name: "Cyril" },
    { id: "d", name: "Dan" },
  ];
  const r1 = makeRound(1, [["a", "b", "c", "d"]]);
  Object.assign(r1.pods[0].results[0], { place: 1, lore: 20 });
  Object.assign(r1.pods[0].results[1], { place: 2, lore: 15 });
  Object.assign(r1.pods[0].results[2], { place: 3, lore: 10 });
  Object.assign(r1.pods[0].results[3], { place: 4, lore: 10 });
  const r2 = makeRound(2, [["a", "b", "c", "d"]]);
  Object.assign(r2.pods[0].results[0], { place: 3, lore: 5 });
  Object.assign(r2.pods[0].results[1], { place: 1, lore: 20 });
  Object.assign(r2.pods[0].results[2], { place: 2, lore: 12 });
  Object.assign(r2.pods[0].results[3], { place: 4, lore: 12 });

  const s = computeStandings(players, [r1, r2]);
  // Bob 2+4=6 b (35 lore), Anna 4+1=5 b (25), Cyril 1+2=3 b (22), Dan 1+1=2 b (22)
  assert.deepEqual(s.map((r) => [r.name, r.points, r.lore, r.rank]), [
    ["Bob", 6, 35, 1],
    ["Anna", 5, 25, 2],
    ["Cyril", 3, 22, 3],
    ["Dan", 2, 22, 4],
  ]);

  // shoda bodů i loru = sdílené místo
  const tie = computeStandings(players.slice(0, 2), [
    { number: 1, pods: [{ players: ["a", "b"], results: [
      { playerId: "a", place: 1, lore: 20 },
      { playerId: "b", place: 3, lore: 5 },
    ] }] },
    { number: 2, pods: [{ players: ["a", "b"], results: [
      { playerId: "a", place: 3, lore: 5 },
      { playerId: "b", place: 1, lore: 20 },
    ] }] },
  ]);
  assert.deepEqual(tie.map((r) => r.rank), [1, 1]);
});
