import { randomUUID } from "crypto";
import readline from "readline";

/**
 * Script d'automatisation continue & historique Vercel Analytics multi-jours
 * Sélection interactive de profils de trafic (Calme, Normal, Rush, Événementiel).
 *
 * Exécution interactive : npx tsx scripts/simulate-analytics.ts
 * Exécution directe CLI : npx tsx scripts/simulate-analytics.ts rush
 * ou : npx tsx scripts/simulate-analytics.ts --profile=evenement
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

export type TrafficProfileKey = "calme" | "normal" | "rush" | "evenement" | "history-only";

export type TrafficProfileConfig = {
  key: TrafficProfileKey;
  label: string;
  baseVisitorsPerDay: number;
  minLoopDelayMs: number;
  maxLoopDelayMs: number;
  description: string;
};

const TRAFFIC_PROFILES: Record<TrafficProfileKey, TrafficProfileConfig> = {
  calme: {
    key: "calme",
    label: "🟢 Calme (Activité Modérée)",
    baseVisitorsPerDay: 8,
    minLoopDelayMs: 90000, // 90s
    maxLoopDelayMs: 180000, // 3 min
    description: "Ideal pour simuler un début de semaine ou un établissement intimiste.",
  },
  normal: {
    key: "normal",
    label: "🟡 Normal / Standard (Activité Récurrente)",
    baseVisitorsPerDay: 25,
    minLoopDelayMs: 40000, // 40s
    maxLoopDelayMs: 80000, // 80s
    description: "Profil équilibré simulant une journée type de restaurant dynamique.",
  },
  rush: {
    key: "rush",
    label: "🔴 Rush / Coup de feu (Fort Trafic)",
    baseVisitorsPerDay: 80,
    minLoopDelayMs: 15000, // 15s
    maxLoopDelayMs: 35000, // 35s
    description: "Simule les périodes de pointe du midi et du soir.",
  },
  evenement: {
    key: "evenement",
    label: "⚡ Événementiel / Virals (Pic Massif)",
    baseVisitorsPerDay: 200,
    minLoopDelayMs: 5000, // 5s
    maxLoopDelayMs: 15000, // 15s
    description: "Simule une campagne marketing virale ou un festival.",
  },
  "history-only": {
    key: "history-only",
    label: "📅 Historique 14 Jours Uniquement (Sans boucle continue)",
    baseVisitorsPerDay: 30,
    minLoopDelayMs: 0,
    maxLoopDelayMs: 0,
    description: "Rempli les données des 14 derniers jours puis s'arrête.",
  },
};

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

function getDayOfWeekMultiplier(dayIndex: number): number {
  switch (dayIndex) {
    case 5: // Vendredi
      return 2.2;
    case 6: // Samedi
      return 2.5;
    case 0: // Dimanche
      return 1.8;
    case 4: // Jeudi
      return 1.3;
    case 1: // Lundi
      return 0.6;
    case 2: // Mardi
      return 0.7;
    case 3: // Mercredi
      return 1.0;
    default:
      return 1.0;
  }
}

async function sendVercelAnalyticsBeacon(
  url: string,
  referrer: string,
  visitorId: string,
  timestamp: number,
  profile: typeof DEVICE_PROFILES[0],
  clientIp: string
) {
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
      await fetch(pageUrl, { headers });
      await sendVercelAnalyticsBeacon(pageUrl, referrer, uniqueVisitorId, currentTimestamp, profile, clientIp);
    } catch {
      // Ignore network hiccup
    }

    const dwellMs = 2000 + Math.floor(Math.random() * 6000);
    currentTimestamp += dwellMs;
  }
}

async function generateHistorical14DaysTraffic(profile: TrafficProfileConfig) {
  console.log(
    `\n📅 [Historique 14 Jours] Génération des variations d'affluence (Base : ${profile.baseVisitorsPerDay} vis./jour)...`
  );
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now - dayOffset * DAY_MS);
    const dayOfWeek = dayDate.getDay();
    const multiplier = getDayOfWeekMultiplier(dayOfWeek);

    const visitorCount = Math.round(profile.baseVisitorsPerDay * multiplier);

    const dayName = dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
    console.log(`  └─ [${dayName}] Multiplicateur: ${multiplier}x -> ${visitorCount} visiteurs uniques`);

    for (let v = 0; v < visitorCount; v++) {
      const isDinnerPeak = Math.random() > 0.4;
      const hourOffset = isDinnerPeak
        ? 18 + Math.floor(Math.random() * 4)
        : 11 + Math.floor(Math.random() * 3);

      const minuteOffset = Math.floor(Math.random() * 60);
      const visitorTimestamp = dayDate.getTime() + (hourOffset * 3600 + minuteOffset * 60) * 1000;

      await simulateSessionForDate(visitorTimestamp, v);
    }
  }

  console.log("✅ Historique des 14 jours généré avec succès.");
}

async function startContinuousDaemon(profile: TrafficProfileConfig) {
  console.log(`\n🚀 Lancement du Simulateur de Trafic — Profil [ ${profile.label} ]`);
  console.log(`📌 Description : ${profile.description}`);

  // 1. Remplir l'historique des 14 derniers jours
  await generateHistorical14DaysTraffic(profile);

  if (profile.key === "history-only") {
    console.log("\n🏁 Fin du traitement (Mode Historique Uniquement).");
    process.exit(0);
  }

  // 2. Boucle continue automatique en temps réel
  console.log("\n🔄 [Mode En Direct] Activation de la boucle continue temps réel...");
  let liveSessionCount = 0;

  while (true) {
    liveSessionCount++;
    const now = Date.now();
    const dayOfWeek = new Date().getDay();
    const multiplier = getDayOfWeekMultiplier(dayOfWeek);

    console.log(
      `\n🟢 [Visite En Direct #${liveSessionCount}] Profil: ${profile.key} (${multiplier}x affluence jour) - Simulation en cours...`
    );
    await simulateSessionForDate(now, liveSessionCount);

    const delayRange = profile.maxLoopDelayMs - profile.minLoopDelayMs;
    const delayMs = profile.minLoopDelayMs + Math.floor(Math.random() * Math.max(1, delayRange));
    console.log(`   ⏳ Prochain visiteur en direct dans ${Math.round(delayMs / 1000)}s...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

function parseCliProfile(): TrafficProfileConfig | null {
  const args = process.argv.slice(2);
  for (const arg of args) {
    const cleanArg = arg.replace(/^--profile=|^--p=|^--/, "").toLowerCase();
    if (cleanArg in TRAFFIC_PROFILES) {
      return TRAFFIC_PROFILES[cleanArg as TrafficProfileKey];
    }
  }
  return null;
}

async function promptUserForProfile(): Promise<TrafficProfileConfig> {
  const cliProfile = parseCliProfile();
  if (cliProfile) {
    console.log(`\n⚡ Profil détecté via CLI : [ ${cliProfile.label} ]`);
    return cliProfile;
  }

  // If non-interactive environment (CI, background daemon), default to normal
  if (!process.stdin.isTTY) {
    console.log("ℹ️ Environnement non-interactif détecté, profil par défaut [ Normal ] sélectionné.");
    return TRAFFIC_PROFILES.normal;
  }

  console.log("\n============================================================");
  console.log(" 📊 MINERVA FLOW — SIMULATEUR DE TRAFIC VERCEL ANALYTICS");
  console.log("============================================================");
  console.log("Choisissez le profil de trafic à simuler :\n");
  console.log("  1. 🟢 Calme (8 vis./jour, pause 90-180s)");
  console.log("  2. 🟡 Normal / Standard (25 vis./jour, pause 40-80s) [Par défaut]");
  console.log("  3. 🔴 Rush / Coup de feu (80 vis./jour, pause 15-35s)");
  console.log("  4. ⚡ Événementiel / Viral (200 vis./jour, pause 5-15s)");
  console.log("  5. 📅 Historique 14 Jours Uniquement (Sans boucle continue)\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Entrez votre choix (1-5, Défaut=2) : ", (answer) => {
      rl.close();
      const choice = answer.trim();
      switch (choice) {
        case "1":
          resolve(TRAFFIC_PROFILES.calme);
          break;
        case "3":
          resolve(TRAFFIC_PROFILES.rush);
          break;
        case "4":
          resolve(TRAFFIC_PROFILES.evenement);
          break;
        case "5":
          resolve(TRAFFIC_PROFILES["history-only"]);
          break;
        case "2":
        default:
          resolve(TRAFFIC_PROFILES.normal);
          break;
      }
    });
  });
}

async function main() {
  const profile = await promptUserForProfile();
  await startContinuousDaemon(profile);
}

main().catch((err) => {
  console.error("❌ Erreur dans le simulateur de trafic :", err);
  process.exit(1);
});
