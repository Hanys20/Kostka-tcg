// Velký turnaj „Hvězdy Hyperia City" – Disney Lorcana Store Championship 12. 12. 2026.
//
// Všechny údaje o turnaji jsou na jednom místě, aby se daly upravit bez
// sahání do šablon. Stránky: /store-championship (CZ) a /en/store-championship (EN),
// banner na homepage a zvýrazněná karta v kalendáři čtou odsud.
//
// Časy jsou v pražském čase (do 25. 10. letní +02:00, potom SEČ +01:00).

export type Lang = "cs" | "en";

export const championship = {
  slug: "store-championship",
  // Start 1. kola – podle něj se počítá odpočet. Registrace na místě od 9:30.
  startsAt: "2026-12-12T10:00:00+01:00",
  // Den, do kterého se banner/stránka ukazuje jako „nadcházející" (včetně).
  showUntil: "2026-12-13T23:59:59+01:00",
  capacity: 32,
  venue: "KOSTKA TCG, Dolní 782/65, 700 30 Ostrava-Zábřeh",
  mapUrl: "https://maps.google.com/?q=Doln%C3%AD+782%2F65%2C+Ostrava-Z%C3%A1b%C5%99eh",
  instagramUrl: "https://www.instagram.com/kostkatcg/",

  // Postupné odhalování podle propagačního plánu. Dokud datum nenastane, obsah
  // se na serveru vůbec nevyrenderuje – není v HTML ani ve zdrojáku stránky,
  // takže se nedá vyspoilerovat. 18:00 = zhruba kdy jde ven příspěvek/story,
  // podle potřeby posuň.
  reveals: {
    // Stránka, banner a karta v kalendáři se objeví (do té doby 404).
    announce: "2026-10-24T18:00:00+02:00",
    // Vstupné, early bird a postup přihlášky (= otevření registrace).
    pricing: "2026-10-31T00:00:00+01:00",
    // Promo za účast pro každého hráče (Donald + Woody + ozdoba).
    everyone: "2026-11-07T18:00:00+01:00",
    // Foil Woody pro Top 8.
    top8: "2026-11-11T18:00:00+01:00",
    // Oversized karty pro Top 3.
    podium: "2026-11-14T18:00:00+01:00",
    // Nápověda k hlavní ceně (jen „Enchanted", bez názvu karty).
    grandHint: "2026-11-18T18:00:00+01:00",
    // Odhalení hlavní ceny Colors of the Wind Enchanted.
    grand: "2026-11-20T18:00:00+01:00",
  },

  // Odkaz na event v PlayHubu (Ravensburger). Dokud je prázdný, vezme se
  // z termínu v administraci, jinak stránka ukáže „registrace se otevírá…".
  playhubUrl: "",

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

export type RevealStage = keyof typeof championship.reveals;

export function isRevealed(stage: RevealStage, now: Date = new Date()) {
  return now >= new Date(championship.reveals[stage]);
}

// Datum odhalení pro texty typu „odhalíme v sobotu 14. 11." / "revealed Saturday 14 Nov".
export function revealDate(stage: RevealStage, lang: Lang) {
  const d = new Date(championship.reveals[stage]);
  const tz = "Europe/Prague";
  if (lang === "cs") {
    const day = d.toLocaleDateString("cs-CZ", { timeZone: tz, day: "numeric" });
    const month = d.toLocaleDateString("cs-CZ", { timeZone: tz, month: "numeric" });
    return {
      weekday: d.toLocaleDateString("cs-CZ", { timeZone: tz, weekday: "long" }),
      date: `${parseInt(day, 10)}. ${parseInt(month, 10)}.`,
    };
  }
  return {
    weekday: d.toLocaleDateString("en-GB", { timeZone: tz, weekday: "long" }),
    date: d.toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "short" }),
  };
}

export type PriceTierId = (typeof championship.priceTiers)[number]["id"];

export function getCurrentTier(now: Date = new Date()) {
  return (
    championship.priceTiers.find((tier) => tier.until === null || now <= new Date(tier.until)) ??
    championship.priceTiers[championship.priceTiers.length - 1]
  );
}

export function isChampionshipUpcoming(now: Date = new Date()) {
  return isRevealed("announce", now) && now <= new Date(championship.showUntil);
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
// Ceny – každá skupina má svou fázi odhalení
// ---------------------------------------------------------------------------

export const prizes = {
  grand: {
    stage: "grand" as const,
    name: "Colors of the Wind",
    variant: "Enchanted",
    note: { cs: "pro vítěze turnaje", en: "for the tournament winner" },
  },
  podium: {
    stage: "podium" as const,
    items: [
      { place: 1, name: "Miguel Rivera", subtitle: "Street Musician", note: { cs: "oversized karta + trofej", en: "oversized card + trophy" } },
      { place: 2, name: "Goofy", subtitle: "Dancing Superstar", note: { cs: "oversized karta", en: "oversized card" } },
      { place: 3, name: "Cinderella", subtitle: "Unintentional Icon", note: { cs: "oversized karta", en: "oversized card" } },
    ],
  },
  top8: { stage: "top8" as const, name: "Woody", subtitle: "Store Championship promo", finish: "foil" },
  everyone: {
    stage: "everyone" as const,
    items: [
      { name: "Donald Duck", subtitle: "Taxi Driver", note: { cs: "promo karta", en: "promo card" } },
      { name: "Woody", subtitle: { cs: "nonfoil promo", en: "non-foil promo" } },
      { name: { cs: "Vánoční ozdoba Kostky", en: "Kostka Christmas ornament" }, subtitle: { cs: "z 3D tiskárny", en: "3D printed" } },
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Texty (CZ / EN)
// ---------------------------------------------------------------------------

export const t = {
  cs: {
    metaTitle: "Hvězdy Hyperia City – Lorcana Store Championship 12. 12. 2026",
    metaDescription:
      "Největší Lorcana turnaj v Kostce: Store Championship v sobotu 12. 12. 2026 v Ostravě. Ceny odhalujeme postupně – sleduj nás.",
    metaDescriptionGrand:
      "Největší Lorcana turnaj v Kostce: Store Championship 12. 12. 2026 v Ostravě. Hlavní cena Colors of the Wind Enchanted, foil Woody pro Top 8, promo karty pro každého.",
    langSwitch: { label: "English", href: "/en/store-championship" },
    eyebrow: "Disney Lorcana Store Championship",
    title: "Hvězdy Hyperia City",
    subtitle: "Vánoční noc ve městě",
    lead: "Největší Lorcana turnaj v historii Kostky. Město nikdy nespí – a 12. 12. v něm hledáme novou hvězdu.",

    facts: {
      when: "Kdy",
      whenValue: "sobota 12. 12. 2026",
      time: "Čas",
      timeValue: "registrace 9:30 · start 10:00",
      where: "Kde",
      whereValue: "KOSTKA TCG, Ostrava-Zábřeh",
      format: "Formát",
      formatValue: "Core Constructed · Bo3 · Swiss + Top 8",
      capacity: "Kapacita",
    },
    spots: (taken: number, total: number) => `${taken} / ${total} hráčů`,
    spotsFallback: (total: number) => `${total} hráčů`,

    ctaRegister: "Registrovat na PlayHubu",
    ctaRegisterSoon: (date: string) => `Registrace od ${date}`,
    countdown: { days: "dní", hours: "hod", minutes: "min", seconds: "s", label: "Do startu zbývá" },
    nextReveal: (what: string, weekday: string, date: string) => `Další odhalení: ${what} – ${weekday} ${date}`,
    followUs: "Sleduj nás na Instagramu",

    nav: { prizes: "Ceny", entry: "Vstupné a přihláška", schedule: "Program", info: "Info", faq: "FAQ" },

    prizesEyebrow: "Ceny",
    prizesTitle: "O co se hraje",
    prizesLead: "Ceny odhalujeme postupně. Co je zamčené, odemkneme v uvedený den – na webu i na Instagramu.",
    revealedCount: (n: number, total: number) => `Odhaleno ${n} z ${total}`,
    stageNames: {
      everyone: "Ceny za účast",
      top8: "Top 8",
      podium: "Top 3",
      grand: "Hlavní cena",
    },
    lockedLabel: (weekday: string, date: string) => `Odhalíme ${weekday} ${date}`,
    grandTag: "Hlavní cena",
    grandMysteryTitle: "Tajná hlavní cena",
    grandMysteryText: "Tentokrát městem zavane opravdu silný vítr… 🌬️",
    grandHintTitle: "Nápověda: je to Enchanted ✨",
    grandHintText: "Víc zatím neprozradíme. Celou kartu ukážeme už brzy.",
    placeLabel: (n: number) => `${n}. místo`,
    top8Text: "Každý hráč v Top 8",
    everyoneText: "Každý hráč – nikdo neodjede s prázdnou",

    entryEyebrow: "Vstupné a přihláška",
    entryTitle: "Čím dřív, tím levněji",
    entryLocked: (weekday: string, date: string) =>
      `Registraci a vstupné zveřejníme ${weekday} ${date}. Early bird bude platit jen omezenou dobu – sleduj nás, ať ti neuteče.`,
    tiers: {
      early: { label: "Early bird", until: "do 21. 11." },
      standard: { label: "Standard", until: "22. 11. – 9. 12." },
      onsite: { label: "Na místě", until: "pokud zbude místo" },
    },
    currentBadge: "Teď platí",
    regularNote: "Stálí hráči naší ligy mají slevu 50 Kč (2 €) z aktuální ceny.",
    stepsTitle: "Jak se přihlásit – 3 kroky",
    step1Title: "Registrace na PlayHubu",
    step1Text: "Místo zabíráš v oficiálním systému Ravensburger PlayHub. Bez toho nemůžeme započítat výsledky.",
    step2Title: "Zaplať předem a ušetři",
    step2Text: "Early bird platí při převodu do 21. 11. Do zprávy napiš své jméno z PlayHubu. Kdo nezaplatí předem, platí na místě aktuální cenu.",
    step3Title: "Dorazit 12. 12. v 9:30",
    step3Text: "Na registraci si vezmi deck a decklist. V 10:00 startuje první kolo.",
    paymentCzk: "Platba v Kč",
    paymentEur: "Platba v EUR",
    account: "Číslo účtu",
    vs: "Variabilní symbol",
    message: "Zpráva",
    messageValue: "jméno z PlayHubu",
    paymentPending: "Platební údaje doplníme do otevření registrace.",
    giftText: "🎁 Vstup jde koupit i jako dárkový poukaz pod stromeček – napiš na kostkatcg@gmail.com nebo se zastav v herně.",

    scheduleEyebrow: "Program",
    scheduleTitle: "Jak poběží den",
    schedule: [
      { time: "9:30", title: "Registrace", text: "Check-in, kontrola decklistů" },
      { time: "10:00", title: "Start turnaje", text: "Swiss kola po 50 minutách" },
      { time: "~13:00", title: "Pauza na oběd", text: "" },
      { time: "~16:30", title: "Top 8", text: "Vyřazovací část – „Červený koberec“" },
      { time: "~19:30", title: "Finále a předání cen", text: "Společná fotka všech hvězd" },
    ],
    scheduleNote: "Do 16 hráčů 4 kola Swissu, 17–32 hráčů 5 kol. Časy po startu jsou orientační.",

    infoEyebrow: "Praktické info",
    infoTitle: "Než vyrazíš",
    info: [
      { icon: "📍", title: "Adresa", text: "KOSTKA TCG, Dolní 782/65, Ostrava-Zábřeh" },
      { icon: "🎒", title: "Co s sebou", text: "Deck, sleevy, lore counter a decklist (formulář dostaneš i na místě)." },
      { icon: "☕", title: "Jídlo a pití", text: "Občerstvení až ke stolu díky Čajovně Antakarana v budově." },
      { icon: "🚗", title: "Z Polska", text: "Z Katovic zhruba 1,5 hodiny autem, z Krakova kolem 2,5 hodiny." },
    ],
    mapLink: "Otevřít v mapě",

    faqTitle: "Časté dotazy",
    faq: [
      { q: "Jaký je formát?", a: "Core Constructed, zápasy na dvě vítězné hry (Bo3), Swiss a poté vyřazovací Top 8." },
      { q: "Můžu přijet i jako začátečník?", a: "Jasně. Atmosféra je přátelská a ceny za účast dostane každý hráč. Jen počítej s celodenní akcí." },
      { q: "Musím platit předem?", a: "Nemusíš. Platba předem jen zajistí nižší cenu, na místě se platí aktuální cena." },
      { q: "Co když zaplatím a nebudu moct přijet?", a: "Dej nám vědět nejpozději 9. 12. – peníze vrátíme, nebo vstup převedeme na kamaráda." },
    ],
    closing: "Naskoč do taxíku, cesta ke slávě začíná u nás. 🌟",

    preview: {
      label: "Náhled k datu",
      today: "Dnes",
      stages: {
        announce: "Oznámení",
        pricing: "Registrace",
        everyone: "Za účast",
        top8: "Top 8",
        podium: "Top 3",
        grandHint: "Nápověda",
        grand: "Enchanted",
      },
    },
  },

  en: {
    metaTitle: "Stars of Hyperia City – Lorcana Store Championship, 12 Dec 2026",
    metaDescription:
      "The biggest Lorcana tournament at Kostka: Store Championship on Saturday 12 December 2026 in Ostrava, Czech Republic. Prizes are being revealed step by step.",
    metaDescriptionGrand:
      "The biggest Lorcana tournament at Kostka: Store Championship on 12 December 2026 in Ostrava, Czech Republic. Grand prize Colors of the Wind Enchanted, foil Woody for Top 8, promos for every player.",
    langSwitch: { label: "Čeština", href: "/store-championship" },
    eyebrow: "Disney Lorcana Store Championship",
    title: "Stars of Hyperia City",
    subtitle: "A Christmas Night in the City",
    lead: "The biggest Lorcana tournament in Kostka's history. The city never sleeps – and on 12 December it's looking for a new star.",

    facts: {
      when: "When",
      whenValue: "Saturday, 12 Dec 2026",
      time: "Time",
      timeValue: "check-in 9:30 · start 10:00",
      where: "Where",
      whereValue: "KOSTKA TCG, Ostrava, CZ",
      format: "Format",
      formatValue: "Core Constructed · Bo3 · Swiss + Top 8",
      capacity: "Capacity",
    },
    spots: (taken: number, total: number) => `${taken} / ${total} players`,
    spotsFallback: (total: number) => `${total} players`,

    ctaRegister: "Register on PlayHub",
    ctaRegisterSoon: (date: string) => `Registration opens ${date}`,
    countdown: { days: "days", hours: "hrs", minutes: "min", seconds: "sec", label: "Starts in" },
    nextReveal: (what: string, weekday: string, date: string) => `Next reveal: ${what} – ${weekday} ${date}`,
    followUs: "Follow us on Instagram",

    nav: { prizes: "Prizes", entry: "Entry & sign-up", schedule: "Schedule", info: "Info", faq: "FAQ" },

    prizesEyebrow: "Prizes",
    prizesTitle: "What's at stake",
    prizesLead: "We're revealing the prizes step by step. Locked ones unlock on the date shown – here and on Instagram.",
    revealedCount: (n: number, total: number) => `${n} of ${total} revealed`,
    stageNames: {
      everyone: "Participation prizes",
      top8: "Top 8",
      podium: "Top 3",
      grand: "Grand prize",
    },
    lockedLabel: (weekday: string, date: string) => `Revealed ${weekday} ${date}`,
    grandTag: "Grand prize",
    grandMysteryTitle: "Secret grand prize",
    grandMysteryText: "This time, a powerful wind is blowing through the city… 🌬️",
    grandHintTitle: "Hint: it's an Enchanted ✨",
    grandHintText: "That's all we'll say for now. The full card is coming very soon.",
    placeLabel: (n: number) => (n === 1 ? "1st place" : n === 2 ? "2nd place" : "3rd place"),
    top8Text: "Every Top 8 player",
    everyoneText: "Every player – nobody leaves empty-handed",

    entryEyebrow: "Entry & sign-up",
    entryTitle: "The sooner, the cheaper",
    entryLocked: (weekday: string, date: string) =>
      `Registration and entry fees go live on ${weekday} ${date}. The early bird price only lasts a limited time – follow us so you don't miss it.`,
    tiers: {
      early: { label: "Early bird", until: "until 21 Nov" },
      standard: { label: "Standard", until: "22 Nov – 9 Dec" },
      onsite: { label: "On site", until: "if spots remain" },
    },
    currentBadge: "Current price",
    regularNote: "Regular players of our league get 50 CZK (€2) off the current price.",
    stepsTitle: "How to register – 3 steps",
    step1Title: "Register on PlayHub",
    step1Text: "Your seat is reserved in the official Ravensburger PlayHub system. Without it we can't record your results.",
    step2Title: "Pay in advance and save",
    step2Text: "The early bird price applies to bank transfers made by 21 Nov. Put your PlayHub name in the payment reference. Otherwise you pay the current price on site.",
    step3Title: "Arrive on 12 Dec at 9:30",
    step3Text: "Bring your deck and decklist to check-in. Round one starts at 10:00.",
    paymentCzk: "Payment in CZK",
    paymentEur: "Payment in EUR",
    account: "Account",
    vs: "Variable symbol",
    message: "Reference",
    messageValue: "your PlayHub name",
    paymentPending: "Payment details will be added before registration opens.",
    giftText: "🎁 Entry is also available as a gift voucher – email kostkatcg@gmail.com or drop by the store.",

    scheduleEyebrow: "Schedule",
    scheduleTitle: "How the day runs",
    schedule: [
      { time: "9:30", title: "Check-in", text: "Registration and decklist check" },
      { time: "10:00", title: "Tournament starts", text: "50-minute Swiss rounds" },
      { time: "~13:00", title: "Lunch break", text: "" },
      { time: "~16:30", title: "Top 8", text: "Single elimination – “Red Carpet”" },
      { time: "~19:30", title: "Finals & prize ceremony", text: "Group photo of all the stars" },
    ],
    scheduleNote: "Up to 16 players: 4 Swiss rounds, 17–32 players: 5 rounds. Times after the start are approximate.",

    infoEyebrow: "Practical info",
    infoTitle: "Before you travel",
    info: [
      { icon: "📍", title: "Address", text: "KOSTKA TCG, Dolní 782/65, Ostrava-Zábřeh, Czech Republic" },
      { icon: "🎒", title: "What to bring", text: "Your deck, sleeves, a lore counter and a decklist (forms available on site)." },
      { icon: "☕", title: "Food & drinks", text: "Served right to your table by Čajovna Antakarana in the same building." },
      { icon: "🚗", title: "From Poland", text: "About 1.5 hours by car from Katowice, around 2.5 hours from Kraków." },
    ],
    mapLink: "Open in maps",

    faqTitle: "FAQ",
    faq: [
      { q: "What's the format?", a: "Core Constructed, best-of-three matches (Bo3), Swiss rounds followed by a single-elimination Top 8." },
      { q: "Can I join as a newer player?", a: "Absolutely. The atmosphere is friendly and every player gets participation prizes. Just keep in mind it's an all-day event." },
      { q: "Do I have to pay in advance?", a: "No. Paying in advance just gets you a lower price. On site you pay the current price." },
      { q: "What if I pay and can't make it?", a: "Let us know by 9 Dec – we'll refund you or transfer your entry to a friend." },
    ],
    closing: "Hop in the taxi – the road to stardom starts here. 🌟",

    preview: {
      label: "Preview as of",
      today: "Today",
      stages: {
        announce: "Announce",
        pricing: "Sign-up",
        everyone: "Participation",
        top8: "Top 8",
        podium: "Top 3",
        grandHint: "Hint",
        grand: "Enchanted",
      },
    },
  },
} as const;
