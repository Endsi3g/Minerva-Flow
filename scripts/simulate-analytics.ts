import { randomUUID } from "crypto";

/**
 * Script d'automatisation continue & historique Vercel Analytics multi-jours
 * (Distribution sur 14 jours passés + boucle automatique continue temps réel).
 * Exécution : npx tsx scripts/simulate-analytics.ts
 */

const BASE_URL = "https://minerva-flow.vercel.app";

const ROUTES = [
  "/",
  "/fr/overview",
  "/fr/finance",
  "/fr/assistant",
  "/fr/integrations",
  "/fr/changelog",
  "/fr/library",
  "/fr/collaborateurs",
  "/fr/commandes",
  "/fr/depenses",
  "/fr/fournisseurs",
  "/fr/inventaire",
  "/fr/menu",
  "/fr/fidelisation",
  "/fr/settings",
  "/fr/billing",
];

const EXTERNAL_REFERRERS = [
  "https://www.google.fr/search?q=logiciel+gestion+restaurant+quebec",
  "https://www.google.com/search?q=minerva+flow+app",
  "https://bing.com/search?q=seuil+de+rentabilite+bistro",
  "https://duckduckgo.com/?q=gestion+restaurant",
  "https://t.co/x892jklA91",
  "https://www.linkedin.com/feed/",
  "https://www.facebook.com/groups/restaurateursquebec/",
  "https://news.ycombinator.com/item?id=39102492",
  "https://www.producthunt.com/posts/minerva-flow",
];

const DEVICE_PROFILES = [
  {
    type: "PC / Mac (Chrome)",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    mobile: "?0",
  },
  {
    type: "PC / Windows (Edge)",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
    secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Microsoft Edge";v="122"',
    mobile: "?0",
  },
  {
    type: "Mobile / iPhone (Safari)",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
    secChUa: undefined,
    mobile: "?1",
  },
  {
    type: "Mobile / Android (Samsung Chrome)",
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36",
    secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    mobile: "?1",
  },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomIP(): string {
  const octet1 = Math.floor(Math.random() * 190) + 10;
  const octet2 = Math.floor(Math.random() * 255);
  const octet3 = Math.floor(Math.random() * 255);
  const octet4 = Math.floor(Math.random() * 255);
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

// Coefficient d'affluence selon le jour de la semaine
function getDayOfWeekMultiplier(dayIndex: number): number {
  // 0 = Dimanche, 5 = Vendredi, 6 = Samedi (PICS DE TRAFIC)
  switch (dayIndex) {
    case 5: // Vendredi (Très fort)
      return 2.2;
    case 6: // Samedi (Pic maximum)
      return 2.5;
    case 0: // Dimanche (Fort)
      return 1.8;
    case 4: // Jeudi (Moyen-fort)
      return 1.3;
    case 1: // Lundi (Calme)
      return 0.6;
    case 2: // Mardi (Calme)
      return 0.7;
    case 3: // Mercredi (Moyen)
      return 1.0;
    default:
      return 1.0;
  }
}

async function sendVercelAnalyticsBeacon(url: string, referrer: string, visitorId: string, timestamp: number, profile: typeof DEVICE_PROFILES[0], clientIp: string) {
  try {
    await fetch(`${BASE_URL}/_vercel/insights/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": profile.userAgent,
        "X-Forwarded-For": clientIp,
        "X-Real-IP": clientIp,
      },
      body: JSON.stringify({
        o: url,
        r: referrer,
        ts: timestamp,
        id: visitorId,
      }),
    });
  } catch {
    // Fail-safe
  }
}

async function simulateSessionForDate(targetTimestamp: number, visitorIndex: number) {
  const uniqueVisitorId = randomUUID();
  const clientIp = generateRandomIP();
  const profile = getRandomElement(DEVICE_PROFILES);
  const externalReferrer = getRandomElement(EXTERNAL_REFERRERS);

  const pageDepth = 3 + Math.floor(Math.random() * 4);
  const sessionRoutes: string[] = ["/"];

  while (sessionRoutes.length < pageDepth) {
    const next = getRandomElement(ROUTES);
    if (!sessionRoutes.includes(next)) sessionRoutes.push(next);
  }

  let currentTimestamp = targetTimestamp;

  for (let step = 0; step < sessionRoutes.length; step++) {
    const route = sessionRoutes[step];
    const pageUrl = `${BASE_URL}${route}`;
    const referrer = step === 0 ? externalReferrer : `${BASE_URL}${sessionRoutes[step - 1]}`;

    const headers: Record<string, string> = {
      "User-Agent": profile.userAgent,
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
      Referer: referrer,
      "X-Forwarded-For": clientIp,
      "X-Real-IP": clientIp,
    };

    if (profile.secChUa) headers["Sec-Ch-Ua"] = profile.secChUa;
    if (profile.mobile) headers["Sec-Ch-Ua-Mobile"] = profile.mobile;

    try {
      const res = await fetch(pageUrl, { headers });
      await sendVercelAnalyticsBeacon(pageUrl, referrer, uniqueVisitorId, currentTimestamp, profile, clientIp);
    } catch {
      // Ignore network hiccup
    }

    // Incrémentation du timestamp de session (2s à 8s par page)
    const dwellMs = 2000 + Math.floor(Math.random() * 6000);
    currentTimestamp += dwellMs;
  }
}

async function generateHistorical14DaysTraffic() {
  console.log("📅 [Historique 14 Jours] Génération des variations d'affluence par jour (Pics W-E vs Lundi/Mardi calme)...");
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now - dayOffset * DAY_MS);
    const dayOfWeek = dayDate.getDay(); // 0 = Dimanche, 6 = Samedi
    const multiplier = getDayOfWeekMultiplier(dayOfWeek);

    const baseVisitorsPerDay = 20;
    const visitorCount = Math.round(baseVisitorsPerDay * multiplier);

    const dayName = dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
    console.log(`  └─ [${dayName}] Multiplicateur: ${multiplier}x -> ${visitorCount} visiteurs uniques`);

    for (let v = 0; v < visitorCount; v++) {
      // Heures de visite naturelles (pics entre 11h-14h et 18h-22h)
      const isDinnerPeak = Math.random() > 0.4;
      const hourOffset = isDinnerPeak
        ? 18 + Math.floor(Math.random() * 4) // 18h - 22h
        : 11 + Math.floor(Math.random() * 3); // 11h - 14h
      
      const minuteOffset = Math.floor(Math.random() * 60);
      const visitorTimestamp = dayDate.getTime() + (hourOffset * 3600 + minuteOffset * 60) * 1000;

      await simulateSessionForDate(visitorTimestamp, v);
    }
  }

  console.log("✅ Historique des 14 jours généré avec succès.");
}

async function startContinuousDaemon() {
  console.log("🚀 Lancement du Générateur de Trafic Automatique Continu (Mode Multi-Jours & Boucle Permanente)...");
  
  // 1. Remplir l'historique des 14 derniers jours avec variations
  await generateHistorical14DaysTraffic();

  // 2. Boucle continue automatique en temps réel
  console.log("\n🔄 [Mode En Direct] Activation de la boucle continue temps réel...");
  let liveSessionCount = 0;

  while (true) {
    liveSessionCount++;
    const now = Date.now();
    const dayOfWeek = new Date().getDay();
    const multiplier = getDayOfWeekMultiplier(dayOfWeek);

    console.log(`\n🟢 [Visite En Direct #${liveSessionCount}] Jour actuel (${multiplier}x affluence) - Simulation en cours...`);
    await simulateSessionForDate(now, liveSessionCount);

    // Pause organique entre 45s et 90s avant le visiteur suivant
    const delayMs = 45000 + Math.floor(Math.random() * 45000);
    console.log(`   ⏳ Prochain visiteur en direct dans ${Math.round(delayMs / 1000)}s...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

startContinuousDaemon();
