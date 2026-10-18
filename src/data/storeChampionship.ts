// Velký turnaj „Hvězdy Hyperia City" – Disney Lorcana Store Championship 12. 12. 2026.
//
// Všechny údaje o turnaji jsou na jednom místě, aby se daly upravit bez
// sahání do šablon. Stránky: /store-championship (CZ) a /en/store-championship (EN),
// banner na homepage a zvýrazněná karta v kalendáři čtou odsud.
//
// Časy jsou v pražském čase (v prosinci/listopadu platí SEČ = +01:00).

export type Lang = "cs" | "en";

export const championship = {
  slug: "store-championship",
  // Začátek check-inu – podle něj se počítá odpočet i to, kdy banner zmizí.
  startsAt: "2026-12-12T09:00:00+01:00",
  // Den, do kterého se banner/stránka ukazuje jako „nadcházející" (včetně).
  showUntil: "2026-12-13T23:59:59+01:00",
  capacity: 32,
  venue: "KOSTKA TCG, Dolní 782/65, 700 30 Ostrava-Zábřeh",
  mapUrl: "https://maps.google.com/?q=Doln%C3%AD+782%2F65%2C+Ostrava-Z%C3%A1b%C5%99eh",

  // Odkaz na event v PlayHubu (Ravensburger). Dokud je prázdný, stránka ukáže
  // „registrace se otevírá 31. 10." místo tlačítka.
  playhubUrl: "",
  registrationOpens: "2026-10-31T00:00:00+01:00",

  // Cenové fáze – automaticky se přepínají podle data.
  priceTiers: [
    { id: "early", until: "2026-11-21T23:59:59+01:00", czk: 450, eur: 18 },
    { id: "standard", until: "2026-12-09T23:59:59+01:00", czk: 500, eur: 20 },
    { id: "onsite", until: null, czk: 550, eur: 22 },
  ] as const,
  regularDiscount: { czk: 50, eur: 2 },

  // Platba předem bankovním převodem.
  // TODO(Vojta): doplnit číslo účtu a IBAN – dokud jsou prázdné, sekce
  // s platbou ukáže „platební údaje doplníme brzy".
  payment: {
    accountCzk: "", // např. "123456789/0100"
    iban: "", // např. "CZ65 0800 0000 1920 0014 5399"
    bic: "",
    variableSymbol: "121226",
  },
} as const;

export type PriceTierId = (typeof championship.priceTiers)[number]["id"];

export function getCurrentTier(now: Date = new Date()) {
  return (
    championship.priceTiers.find((tier) => tier.until === null || now <= new Date(tier.until)) ??
    championship.priceTiers[championship.priceTiers.length - 1]
  );
}

export function isChampionshipUpcoming(now: Date = new Date()) {
  return now <= new Date(championship.showUntil);
}

// Pozná termín turnaje mezi událostmi ze Supabase (admin ho vytvoří jako běžný
// turnaj) – podle data 12. 12. 2026 a hry Lorcana, nebo podle názvu.
export function isChampionshipEvent(event: { title?: string; startsAt?: string; game?: string; type?: string }) {
  const title = (event.title ?? "").toLowerCase();
  if (title.includes("store champ") || title.includes("hyperia city champ") || title.includes("hvězdy hyperia")) {
    return true;
  }
  if (!event.startsAt || event.game !== "Lorcana" || event.type !== "tournament") return false;
  const d = new Date(event.startsAt);
  const prague = d.toLocaleDateString("en-CA", { timeZone: "Europe/Prague" });
  return prague === "2026-12-12";
}

// ---------------------------------------------------------------------------
// Texty (CZ / EN)
// ---------------------------------------------------------------------------

export const prizes = {
  grand: {
    name: "Colors of the Wind",
    variant: "Enchanted",
    place: { cs: "Hlavní cena pro vítěze", en: "Grand prize for the winner" },
  },
  podium: [
    { place: 1, name: "Miguel Rivera", subtitle: "Street Musician", note: { cs: "oversized karta + trofej", en: "oversized card + trophy" } },
    { place: 2, name: "Goofy", subtitle: "Dancing Superstar", note: { cs: "oversized karta", en: "oversized card" } },
    { place: 3, name: "Cinderella", subtitle: "Unintentional Icon", note: { cs: "oversized karta", en: "oversized card" } },
  ],
  top8: { name: "Woody", subtitle: "Store Championship promo", finish: "foil" },
  everyone: [
    { name: "Donald Duck", subtitle: "Taxi Driver", note: { cs: "promo karta", en: "promo card" } },
    { name: "Woody", subtitle: "promo", note: { cs: "nonfoil promo", en: "non-foil promo" } },
    { name: { cs: "Vánoční ozdoba Kostky", en: "Kostka Christmas ornament" }, subtitle: { cs: "z 3D tiskárny", en: "3D printed" } },
  ],
} as const;

export const t = {
  cs: {
    metaTitle: "Hvězdy Hyperia City – Lorcana Store Championship 12. 12. 2026",
    metaDescription:
      "Největší Lorcana turnaj v Kostce: Store Championship 12. 12. 2026 v Ostravě. Hlavní cena Colors of the Wind Enchanted, foil Woody pro Top 8, promo karty pro každého.",
    langSwitch: { label: "English", href: "/en/store-championship" },
    eyebrow: "Disney Lorcana Store Championship",
    title: "Hvězdy Hyperia City",
    subtitle: "Vánoční noc ve městě",
    lead:
      "Město nikdy nespí – a dnes v něm hledáme novou hvězdu. Největší Lorcana turnaj v historii Kostky. A tentokrát městem zavane opravdu silný vítr…",
    dateLabel: "sobota 12. 12. 2026",
    checkIn: "registrace od 9:00",
    format: "Core Constructed · Bo3 · Swiss + Top 8",
    ctaRegister: "Registrovat na PlayHubu",
    ctaRegisterSoon: "Registrace se otevírá 31. 10.",
    ctaPrizes: "Zobrazit ceny",
    countdown: { days: "dní", hours: "hod", minutes: "min", seconds: "s", label: "Do turnaje zbývá" },
    spots: (taken: number, total: number) => `Obsazeno ${taken} z ${total} míst`,
    spotsFallback: (total: number) => `Kapacita ${total} hráčů`,

    prizesEyebrow: "Ceny",
    prizesTitle: "O co se hraje",
    grandPrizeTag: "Hlavní cena",
    podiumTitle: "Top 3",
    placeLabel: (n: number) => `${n}. místo`,
    top8Title: "Top 8",
    top8Text: "Každý hráč v Top 8 získá foil Woodyho – Store Championship promo.",
    everyoneTitle: "Pro každého hráče",
    everyoneText: "Do Hyperia City vás odvezeme – kdo dorazí, neodjede s prázdnou.",

    priceEyebrow: "Vstupné",
    priceTitle: "Čím dřív, tím levněji",
    tiers: {
      early: { label: "Early bird", until: "do 21. 11." },
      standard: { label: "Standard", until: "22. 11. – 9. 12." },
      onsite: { label: "Na místě", until: "pokud zbude místo" },
    },
    currentBadge: "Teď platí",
    regularNote: "Stálí hráči naší ligy mají slevu 50 Kč (2 €) z aktuální ceny.",
    giftTitle: "🎁 Vstup jako dárek",
    giftText:
      "Startovné můžete koupit i jako dárkový poukaz pod stromeček – s 3D tištěnou kartičkou Kostky. Stačí se ozvat na kostkatcg@gmail.com nebo se zastavit v herně.",

    howEyebrow: "Přihláška",
    howTitle: "Jak se přihlásit",
    step1Title: "Zaregistruj se na PlayHubu",
    step1Text:
      "Místo na turnaji zabíráš v oficiálním systému Ravensburger PlayHub. Bez registrace tam nemůžeme výsledky započítat.",
    step2Title: "Zaplať předem a ušetři",
    step2Text:
      "Early bird cena platí při platbě převodem do 21. 11. Do zprávy pro příjemce napiš své jméno z PlayHubu, ať platbu spárujeme. Kdo nezaplatí předem, platí na místě aktuální cenu.",
    paymentCzk: "Platba v Kč",
    paymentEur: "Platba v EUR",
    account: "Číslo účtu",
    vs: "Variabilní symbol",
    message: "Zpráva pro příjemce",
    messageValue: "jméno z PlayHubu",
    paymentPending: "Platební údaje sem doplníme do otevření registrace (31. 10.).",

    scheduleEyebrow: "Program",
    scheduleTitle: "Jak poběží den",
    schedule: [
      { time: "9:00", text: "Check-in, kontrola decklistů, výdej promo karet" },
      { time: "9:45", text: "Zahájení turnaje" },
      { time: "10:00", text: "Swiss kola – „Ulice“, „Taxi stanoviště“, „Náměstí“, „Klub“, „Bulvár“" },
      { time: "~13:00", text: "Pauza na oběd" },
      { time: "~16:30", text: "Top 8 – „Červený koberec“" },
      { time: "~19:30", text: "Finále, předání cen a společná fotka" },
    ],
    scheduleNote: "Počet kol Swissu se řídí počtem hráčů (do 16 hráčů 4 kola, 17–32 hráčů 5 kol). Časy jsou orientační.",

    infoEyebrow: "Praktické info",
    infoTitle: "Než vyrazíš",
    info: [
      { title: "Kde", text: "KOSTKA TCG, Dolní 782/65, Ostrava-Zábřeh" },
      { title: "Jídlo a pití", text: "Občerstvení přímo ke stolu díky Čajovně Antakarana v budově." },
      { title: "Z Polska", text: "Z Katovic zhruba 1,5 hodiny autem, z Krakova kolem 2,5 hodiny." },
      { title: "Co s sebou", text: "Deck, sleevy, lore counter a decklist (formulář dostaneš i na místě)." },
    ],
    mapLink: "Otevřít v mapě",

    faqTitle: "Časté dotazy k turnaji",
    faq: [
      {
        q: "Jaký je formát?",
        a: "Core Constructed, zápasy na dvě vítězné hry (Bo3), Swiss a poté vyřazovací Top 8.",
      },
      {
        q: "Můžu přijet i jako začátečník?",
        a: "Jasně. Promo karty za účast dostane každý hráč a atmosféra je přátelská. Jen počítej s tím, že jde o celodenní akci.",
      },
      {
        q: "Co když zaplatím a nebudu moct přijet?",
        a: "Dej nám vědět nejpozději 9. 12. – peníze vrátíme, nebo vstup převedeme na kamaráda.",
      },
      {
        q: "Musím platit předem?",
        a: "Nemusíš. Platba předem jen zajistí nižší cenu. Na místě se platí aktuální cena podle tabulky výše.",
      },
    ],
    closing: "Naskoč do taxíku, cesta ke slávě začíná u nás. 🌟",
  },

  en: {
    metaTitle: "Stars of Hyperia City – Lorcana Store Championship, 12 Dec 2026",
    metaDescription:
      "The biggest Lorcana tournament at Kostka: Store Championship on 12 December 2026 in Ostrava, Czech Republic. Grand prize Colors of the Wind Enchanted, foil Woody for Top 8, promos for every player.",
    langSwitch: { label: "Čeština", href: "/store-championship" },
    eyebrow: "Disney Lorcana Store Championship",
    title: "Stars of Hyperia City",
    subtitle: "A Christmas Night in the City",
    lead:
      "The city never sleeps – and tonight it's looking for a new star. The biggest Lorcana tournament in Kostka's history. And this time, a powerful wind is blowing through the streets…",
    dateLabel: "Saturday, 12 December 2026",
    checkIn: "check-in from 9:00",
    format: "Core Constructed · Bo3 · Swiss + Top 8",
    ctaRegister: "Register on PlayHub",
    ctaRegisterSoon: "Registration opens 31 Oct",
    ctaPrizes: "See the prizes",
    countdown: { days: "days", hours: "hrs", minutes: "min", seconds: "sec", label: "Starts in" },
    spots: (taken: number, total: number) => `${taken} of ${total} spots taken`,
    spotsFallback: (total: number) => `Limited to ${total} players`,

    prizesEyebrow: "Prizes",
    prizesTitle: "What's at stake",
    grandPrizeTag: "Grand prize",
    podiumTitle: "Top 3",
    placeLabel: (n: number) => (n === 1 ? "1st place" : n === 2 ? "2nd place" : "3rd place"),
    top8Title: "Top 8",
    top8Text: "Every Top 8 player receives a foil Woody – Store Championship promo.",
    everyoneTitle: "For every player",
    everyoneText: "Hop in the taxi – nobody leaves Hyperia City empty-handed.",

    priceEyebrow: "Entry fee",
    priceTitle: "The sooner, the cheaper",
    tiers: {
      early: { label: "Early bird", until: "until 21 Nov" },
      standard: { label: "Standard", until: "22 Nov – 9 Dec" },
      onsite: { label: "On site", until: "if spots remain" },
    },
    currentBadge: "Current price",
    regularNote: "Regular players of our league get 50 CZK (€2) off the current price.",
    giftTitle: "🎁 Entry as a gift",
    giftText:
      "The entry fee is also available as a gift voucher – with a 3D printed Kostka card. Just email kostkatcg@gmail.com or drop by the store.",

    howEyebrow: "Sign-up",
    howTitle: "How to register",
    step1Title: "Register on PlayHub",
    step1Text:
      "Your seat is reserved in the official Ravensburger PlayHub system. Without it we can't record your results.",
    step2Title: "Pay in advance and save",
    step2Text:
      "The early bird price applies to bank transfers made by 21 Nov. Put your PlayHub name in the payment reference so we can match it. If you don't pay in advance, you pay the current price on site.",
    paymentCzk: "Payment in CZK",
    paymentEur: "Payment in EUR",
    account: "Account",
    vs: "Variable symbol",
    message: "Payment reference",
    messageValue: "your PlayHub name",
    paymentPending: "Payment details will be added before registration opens (31 Oct).",

    scheduleEyebrow: "Schedule",
    scheduleTitle: "How the day runs",
    schedule: [
      { time: "9:00", text: "Check-in, decklist check, promo cards handed out" },
      { time: "9:45", text: "Opening" },
      { time: "10:00", text: "Swiss rounds – “Street”, “Taxi Rank”, “Square”, “Club”, “Boulevard”" },
      { time: "~13:00", text: "Lunch break" },
      { time: "~16:30", text: "Top 8 – “Red Carpet”" },
      { time: "~19:30", text: "Finals, prize ceremony and group photo" },
    ],
    scheduleNote: "The number of Swiss rounds depends on attendance (up to 16 players: 4 rounds, 17–32 players: 5 rounds). Times are approximate.",

    infoEyebrow: "Practical info",
    infoTitle: "Before you travel",
    info: [
      { title: "Where", text: "KOSTKA TCG, Dolní 782/65, Ostrava-Zábřeh, Czech Republic" },
      { title: "Food & drinks", text: "Served right to your table by Čajovna Antakarana in the same building." },
      { title: "From Poland", text: "About 1.5 hours by car from Katowice, around 2.5 hours from Kraków." },
      { title: "What to bring", text: "Your deck, sleeves, a lore counter and a decklist (forms available on site)." },
    ],
    mapLink: "Open in maps",

    faqTitle: "Tournament FAQ",
    faq: [
      {
        q: "What's the format?",
        a: "Core Constructed, best-of-three matches (Bo3), Swiss rounds followed by a single-elimination Top 8.",
      },
      {
        q: "Can I join as a newer player?",
        a: "Absolutely. Every player gets the participation promos, and the atmosphere is friendly. Just keep in mind it's an all-day event.",
      },
      {
        q: "What if I pay and can't make it?",
        a: "Let us know by 9 Dec – we'll refund you or transfer your entry to a friend.",
      },
      {
        q: "Do I have to pay in advance?",
        a: "No. Paying in advance just gets you a lower price. On site you pay the current price from the table above.",
      },
    ],
    closing: "Hop in the taxi – the road to stardom starts here. 🌟",
  },
} as const;
