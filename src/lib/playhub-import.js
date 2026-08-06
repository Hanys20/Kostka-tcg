const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

const tryParseDate = (value) => {
  const trimmed = value.trim();
  const match = trimmed.match(/(\d{4})[\-/.](\d{1,2})[\-/.](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const monthNames = [
    ["jan", "january"],
    ["feb", "february"],
    ["mar", "march"],
    ["apr", "april"],
    ["may", "may"],
    ["jun", "june"],
    ["jul", "july"],
    ["aug", "august"],
    ["sep", "sept", "september"],
    ["oct", "october"],
    ["nov", "november"],
    ["dec", "december"],
  ];

  const monthMatch = trimmed.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (monthMatch) {
    const monthIndex = monthNames.findIndex((names) => names.includes(monthMatch[1].toLowerCase()));
    if (monthIndex >= 0) {
      return `${monthMatch[3]}-${String(monthIndex + 1).padStart(2, "0")}-${String(monthMatch[2]).padStart(2, "0")}`;
    }
  }

  return null;
};

const tryParseTime = (value) => {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  const normalizedHour = period === "PM" && hour !== 12 ? hour + 12 : period === "AM" && hour === 12 ? 0 : hour;
  return `${String(normalizedHour).padStart(2, "0")}:${minute}`;
};

const tryParseCapacity = (value) => {
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    return { spotsTaken: Number(match[1]), spotsTotal: Number(match[2]) };
  }
  return null;
};

const tryParsePrice = (value) => {
  const currencyMatch = value.match(/(?:CZK|USD|EUR)\s*([0-9]+(?:[.,][0-9]{1,2})?)/i);
  if (currencyMatch) {
    return currencyMatch[1].replace(",", ".").replace(/\.(?=\d{3}(?:\D|$))/g, "");
  }

  const entryMatch = value.match(/(?:vstupné|entry fee|price)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i);
  if (entryMatch) {
    return entryMatch[1].replace(",", ".").replace(/\.(?=\d{3}(?:\D|$))/g, "");
  }

  return null;
};

export function parsePlayHubEvent(html, options = {}) {
  const textContent = normalizeWhitespace(stripHtml(html));
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? normalizeWhitespace(titleMatch[1].replace(/<[^>]+>/g, "")) : null;

  const startText = textContent.match(/starts at[^\n]{0,80}/i)?.[0] || null;
  const capacityText = textContent.match(/\d+\s*\/\s*\d+\s*players/i)?.[0] || null;
  const priceText = textContent.match(/(?:vstupné|entry fee|price|czk)[^\n]{0,80}/i)?.[0] || null;
  const dateHint = textContent.match(/(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?).*?\d{4}/i)?.[0] || null;

  const date = tryParseDate(dateHint || textContent);
  const startTime = tryParseTime(startText || textContent);
  const capacity = capacityText ? tryParseCapacity(capacityText) : null;
  const price = priceText ? tryParsePrice(priceText) : null;

  return {
    title,
    date: date || null,
    startTime: startTime || null,
    spotsTaken: capacity?.spotsTaken ?? null,
    spotsTotal: capacity?.spotsTotal ?? null,
    price: price || null,
    sourceUrl: options.sourceUrl || null,
  };
}
