import test from "node:test";
import assert from "node:assert/strict";
import { parsePlayHubEvent } from "../src/lib/playhub-import.js";

test("parses title, date, time, occupancy and price from PlayHub HTML", () => {
  const html = `
    <html>
      <body>
        <h1>XZONE PRAGUE OPEN 2026</h1>
        <p>Starts at 9:00 AM (GMT+2)</p>
        <p>54/80 players CZK 500.00</p>
        <p>Vstupné: 500,-</p>
        <p>Oct 10, 2026</p>
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
