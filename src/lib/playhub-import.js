// Parser pro PlayHub (tcg.ravensburgerplay.com) stránky eventů.
// Cílí na stabilní `data-testid` atributy a sousední ikony v serverem
// vyrenderovaném HTML (Next.js) místo volného textu – ten je málo spolehlivý
// (např. zobrazuje čas jak v místním čase, tak v UTC).

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

// Next.js/react-intl SSR umí u interpolovaných hodnot (např. "{current} of {total}
// players") vykreslit sousední textové uzly oddělené komentáři `<!-- -->`
// (hydration boundary), takže prostý „do prvního `<`" match někdy utne text
// hned za první číslicí. Proto vezmeme širší okno až po odpovídající uzavírací
// tag a z něj odstraníme komentáře i vnořené značky, teprve pak čteme text.
const extractByTestId = (html, testId, windowSize = 300) => {
  const attrIndex = html.indexOf(`data-testid="${testId}"`);
  if (attrIndex === -1) return null;
  const tagEnd = html.indexOf(">", attrIndex);
  if (tagEnd === -1) return null;

  const scope = html.slice(tagEnd + 1, tagEnd + 1 + windowSize);
  const closeIndex = scope.search(/<\/(div|span|p|td|th|h1|h2|h3)[^>]*>/i);
  const inner = closeIndex === -1 ? scope : scope.slice(0, closeIndex);
  const text = inner.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, "");
  const normalized = normalizeWhitespace(text);
  return normalized || null;
};

// Záložní zdroj počtu registrovaných hráčů: nadpis "Roster (54)" u seznamu
// hráčů se v praxi ukázal jako stabilnější než "available-spots" pole.
const extractRosterCount = (html) => {
  const match = html.match(/data-testid="roster-section"[\s\S]{0,400}?\((\d+)\)/i);
  return match ? Number(match[1]) : null;
};

const extractNearIcon = (html, iconClass, windowSize = 700) => {
  const iconIndex = html.indexOf(iconClass);
  if (iconIndex === -1) return null;
  const scope = html.slice(iconIndex, iconIndex + windowSize);
  const match = scope.match(/class="font-medium">([^<]+)</);
  return match ? normalizeWhitespace(match[1]) : null;
};

const parseCalendarDate = (text) => {
  // "Oct 10, 2026" -> "2026-10-10"
  const match = text?.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/);
  if (!match) return null;
  const monthIndex = MONTHS.findIndex((m) => match[1].toLowerCase().startsWith(m));
  if (monthIndex < 0) return null;
  return `${match[3]}-${String(monthIndex + 1).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
};

const parseClockTime = (text) => {
  // "9:00 AM (GMT+2)" -> "09:00" (místní čas, jak jej PlayHub zobrazuje)
  const match = text?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const period = match[3].toUpperCase();
  const normalizedHour = period === "PM" && hour !== 12 ? hour + 12 : period === "AM" && hour === 12 ? 0 : hour;
  return `${String(normalizedHour).padStart(2, "0")}:${match[2]}`;
};

const parseCapacityText = (text) => {
  // "54 of 80 players"
  const match = text?.match(/(\d+)\s*of\s*(\d+)/i);
  if (!match) return null;
  return { spotsTaken: Number(match[1]), spotsTotal: Number(match[2]) };
};

const parsePriceText = (text) => {
  if (!text) return null;
  if (/free/i.test(text)) return { amount: "0", currency: null };
  const match = text.match(/([A-Z]{3})\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  return match ? { amount: match[2], currency: match[1] } : null;
};

const detectGame = (html) => {
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
  if (/lorcana/i.test(title)) return "Lorcana";
  if (/riftbound/i.test(title)) return "Riftbound";
  if (/pok[ée]mon/i.test(title)) return "Pokémon";
  return null;
};

export function parsePlayHubEvent(html, options = {}) {
  const title = extractByTestId(html, "event-title");
  const dateText = extractNearIcon(html, "lucide-calendar");
  const startTimeText = extractByTestId(html, "event-date");
  const endTimeText = html.match(/EST\.?\s*END TIME<\/div><div[^>]*>([^<]+)</i)?.[1] || null;
  const capacityText = extractByTestId(html, "available-spots");
  const priceText = extractByTestId(html, "event-price");
  const locationText = extractNearIcon(html, "lucide-store");

  const capacity = parseCapacityText(capacityText);
  const price = parsePriceText(priceText);
  const spotsTaken = capacity?.spotsTaken ?? extractRosterCount(html);

  return {
    title,
    date: parseCalendarDate(dateText),
    startTime: parseClockTime(startTimeText),
    endTime: endTimeText ? parseClockTime(normalizeWhitespace(endTimeText)) : null,
    spotsTaken: spotsTaken ?? null,
    spotsTotal: capacity?.spotsTotal ?? null,
    price: price?.amount ?? null,
    currency: price?.currency ?? null,
    game: detectGame(html),
    location: locationText,
    sourceUrl: options.sourceUrl || null,
  };
}
