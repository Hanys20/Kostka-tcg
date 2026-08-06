import test from "node:test";
import assert from "node:assert/strict";
import { parsePlayHubEvent } from "../src/lib/playhub-import.js";

test("parses title, date, time, occupancy and price from PlayHub HTML", () => {
  const html = `
    <html>
      <head><title>XZONE PRAGUE OPEN 2026 - Lorcana</title></head>
      <body>
        <div data-testid="event-title" class="text-2xl font-bold">XZONE PRAGUE OPEN 2026</div>
        <div class="flex items-center gap-2"><svg class="lucide-calendar h-4 w-4"></svg><span class="font-medium">Oct 10, 2026</span></div>
        <div data-testid="event-date" class="font-medium">9:00 AM (GMT+2)</div>
        <div>EST. END TIME</div><div class="font-medium">5:00 PM (GMT+2)</div>
        <div data-testid="available-spots" class="font-medium">54 of 80 players</div>
        <div data-testid="event-price" class="font-medium">CZK 500</div>
        <div class="flex items-center gap-2"><svg class="lucide-store h-4 w-4"></svg><span class="font-medium">Kostka TCG Ostrava</span></div>
      </body>
    </html>
  `;

  const result = parsePlayHubEvent(html, { sourceUrl: "https://tcg.ravensburgerplay.com/events/638126" });

  assert.equal(result.title, "XZONE PRAGUE OPEN 2026");
  assert.equal(result.date, "2026-10-10");
  assert.equal(result.startTime, "09:00");
  assert.equal(result.spotsTaken, 54);
  assert.equal(result.spotsTotal, 80);
  assert.equal(result.price, "500");
});

test("parses occupancy when React/react-intl splits the text into comment-separated nodes", () => {
  // Next.js SSR umí u interpolovaných hodnot ("{current} of {total} players")
  // vykreslit číslice/text jako oddělené uzly kolem hydration komentářů
  // `<!-- -->` – reálně pozorováno na PlayHubu např. u nadpisu "Roster (54)".
  const html = `
    <html>
      <head><title>Test event - Pokémon</title></head>
      <body>
        <div data-testid="event-title" class="text-2xl font-bold">Test event</div>
        <div data-testid="event-date" class="font-medium">9:00 AM (GMT+2)</div>
        <div data-testid="available-spots" class="font-medium">54<!-- --> of <!-- -->80<!-- --> players</div>
        <div data-testid="event-price" class="font-medium">Free</div>
      </body>
    </html>
  `;

  const result = parsePlayHubEvent(html);

  assert.equal(result.spotsTaken, 54);
  assert.equal(result.spotsTotal, 80);
});

test("falls back to the roster heading count when the capacity field can't be parsed", () => {
  const html = `
    <html>
      <head><title>Test event - Lorcana</title></head>
      <body>
        <div data-testid="event-title" class="text-2xl font-bold">Test event</div>
        <div data-testid="event-date" class="font-medium">9:00 AM (GMT+2)</div>
        <div data-testid="available-spots" class="font-medium"></div>
        <h2 data-testid="roster-section">Roster<!-- --> (54)</h2>
      </body>
    </html>
  `;

  const result = parsePlayHubEvent(html);

  assert.equal(result.spotsTaken, 54);
});
