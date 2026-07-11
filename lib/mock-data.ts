import type {
  Alert,
  Campaign,
  Connection,
  FlowLine,
  Program,
  Restaurant,
  ServiceDay,
  TeamMember,
} from "./types";

export const restaurants: Restaurant[] = [
  {
    id: "r1",
    name: "Minerva — Vieux-Port",
    address: "12 Rue de la Loge",
    city: "Marseille",
    timezone: "Europe/Paris",
    color: "var(--mv-green)",
    lng: 5.3698,
    lat: 43.2965,
  },
  {
    id: "r2",
    name: "Minerva — Le Marais",
    address: "44 Rue des Rosiers",
    city: "Paris",
    timezone: "Europe/Paris",
    color: "var(--mv-lime-dark)",
    lng: 2.3617,
    lat: 48.8589,
  },
  {
    id: "r3",
    name: "Minerva — Croix-Rousse",
    address: "8 Place Bellevue",
    city: "Lyon",
    timezone: "Europe/Paris",
    color: "var(--mv-amber)",
    lng: 4.8298,
    lat: 45.7743,
  },
];

export const currentRestaurantId = "r1";

function daily(
  start: string,
  days: number,
  base: number,
  variance: number
): { date: string; revenue: number }[] {
  const out: { date: string; revenue: number }[] = [];
  const d = new Date(start + "T00:00:00");
  let seed = base;
  for (let i = 0; i < days; i++) {
    const day = d.getDay();
    const weekendBoost = day === 5 || day === 6 ? 1.35 : day === 0 ? 1.15 : 1;
    const wobble = Math.sin(i * 1.7) * variance + Math.cos(i * 0.6) * (variance / 2);
    const rev = Math.max(320, Math.round((base + wobble) * weekendBoost));
    out.push({ date: d.toISOString().slice(0, 10), revenue: rev });
    d.setDate(d.getDate() + 1);
    seed += 1;
  }
  return out;
}

export const programs: Program[] = [
  {
    id: "p1",
    name: "Été 2026",
    type: "saison",
    restaurantId: "r1",
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    revenue: 128400,
    cost: 71200,
    status: "actif",
    dailyRevenue: daily("2026-06-25", 21, 2100, 420),
    campaignIds: ["c1", "c3"],
    consultantNotes: [
      {
        author: "Léa Fontaine",
        date: "2026-07-06",
        text: "La terrasse tire fort le vendredi/samedi soir. Pousser la carte rosé sur les posts de la semaine 29.",
      },
    ],
  },
  {
    id: "p2",
    name: "Brunch du dimanche",
    type: "brunch",
    restaurantId: "r1",
    startDate: "2026-01-04",
    endDate: "2026-12-27",
    revenue: 54300,
    cost: 29800,
    status: "actif",
    dailyRevenue: daily("2026-06-14", 28, 1450, 300),
    campaignIds: ["c2"],
    consultantNotes: [
      {
        author: "Léa Fontaine",
        date: "2026-06-30",
        text: "Taux de remplissage stable à 92%. Envisager un 2e service à 12h30 pour absorber la file d'attente.",
      },
    ],
  },
  {
    id: "p3",
    name: "Soirées Jazz — Jeudi",
    type: "soiree",
    restaurantId: "r1",
    startDate: "2026-03-05",
    endDate: "2026-09-24",
    revenue: 31900,
    cost: 19400,
    status: "actif",
    dailyRevenue: daily("2026-06-11", 30, 980, 260),
    campaignIds: ["c4"],
    consultantNotes: [],
  },
  {
    id: "p4",
    name: "Réveillon 2025",
    type: "evenement",
    restaurantId: "r1",
    startDate: "2025-12-24",
    endDate: "2025-12-31",
    revenue: 22800,
    cost: 9600,
    status: "termine",
    dailyRevenue: daily("2025-12-24", 8, 2850, 500),
    campaignIds: [],
    consultantNotes: [
      {
        author: "Léa Fontaine",
        date: "2026-01-04",
        text: "Meilleure marge de l'année (58%). À reconduire avec réservation obligatoire dès novembre.",
      },
    ],
  },
  {
    id: "p5",
    name: "Rentrée gourmande",
    type: "saison",
    restaurantId: "r1",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    revenue: 0,
    cost: 4200,
    status: "planifie",
    dailyRevenue: [],
    campaignIds: [],
    consultantNotes: [],
  },
];

export const serviceDays: ServiceDay[] = [
  {
    id: "d1",
    date: "2026-07-10",
    restaurantId: "r1",
    revenue: 3180,
    mainSource: "salle",
    events: ["Soirée Jazz"],
    notes: "Terrasse pleine dès 19h, belle ambiance. Rupture de stock sur le tartare.",
    anomaly: "rush",
    author: "Marco T.",
  },
  {
    id: "d2",
    date: "2026-07-09",
    restaurantId: "r1",
    revenue: 2340,
    mainSource: "salle",
    events: [],
    notes: "Service classique, rien à signaler.",
    anomaly: null,
    author: "Nina R.",
  },
  {
    id: "d3",
    date: "2026-07-08",
    restaurantId: "r1",
    revenue: 1120,
    mainSource: "livraison",
    events: [],
    notes: "Pluie toute la journée, très peu de couverts en salle.",
    anomaly: "creux",
    author: "Marco T.",
  },
  {
    id: "d4",
    date: "2026-07-07",
    restaurantId: "r1",
    revenue: 2680,
    mainSource: "reservation",
    events: ["Menu dégustation"],
    notes: "Groupe de 14 personnes le soir, service tendu en cuisine.",
    anomaly: null,
    author: "Nina R.",
  },
  {
    id: "d5",
    date: "2026-07-06",
    restaurantId: "r1",
    revenue: 3920,
    mainSource: "salle",
    events: ["Brunch du dimanche"],
    notes: "File d'attente jusqu'à 45 min entre 11h et 13h.",
    anomaly: "rush",
    author: "Marco T.",
  },
  {
    id: "d6",
    date: "2026-07-05",
    restaurantId: "r1",
    revenue: 2210,
    mainSource: "salle",
    events: [],
    notes: "",
    anomaly: null,
    author: "Nina R.",
  },
  {
    id: "d7",
    date: "2026-07-04",
    restaurantId: "r1",
    revenue: 2510,
    mainSource: "livraison",
    events: ["Promo -20% Deliveroo"],
    notes: "Bon retour sur la promo livraison, pic entre 19h30 et 21h.",
    anomaly: null,
    author: "Nina R.",
  },
  {
    id: "d8",
    date: "2026-07-03",
    restaurantId: "r1",
    revenue: 690,
    mainSource: "salle",
    events: [],
    notes: "Panne de la caisse pendant 40 minutes en début de service.",
    anomaly: "probleme",
    author: "Marco T.",
  },
];

export function heatmapMonth(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  const out: { date: string; revenue: number; dow: number }[] = [];
  for (let i = 1; i <= days; i++) {
    const date = new Date(year, month, i);
    const dow = date.getDay();
    const weekendBoost = dow === 5 || dow === 6 ? 1.4 : dow === 0 ? 1.2 : 1;
    const wobble = Math.sin(i * 1.3) * 380 + Math.cos(i * 0.5) * 220;
    const revenue = Math.max(280, Math.round((2000 + wobble) * weekendBoost));
    out.push({ date: date.toISOString().slice(0, 10), revenue, dow });
  }
  return out;
}

export const inflows: FlowLine[] = [
  { label: "Ventes en salle", amount: 48200, pct: 61 },
  { label: "Livraison (Deliveroo, Uber Eats)", amount: 14100, pct: 18 },
  { label: "Réservations en ligne", amount: 9600, pct: 12 },
  { label: "Événements privés", amount: 6800, pct: 9 },
];

export const outflows: FlowLine[] = [
  { label: "Personnel", amount: 26400, pct: 42 },
  { label: "Fournisseurs & denrées", amount: 18900, pct: 30 },
  { label: "Loyer & charges", amount: 9200, pct: 15 },
  { label: "Marketing & campagnes", amount: 4600, pct: 7 },
  { label: "Divers", amount: 3800, pct: 6 },
];

export const connections: Connection[] = [
  {
    id: "cn1",
    name: "Société Générale — Compte pro",
    type: "banque",
    status: "connecte",
    lastSync: "il y a 12 min",
  },
  {
    id: "cn2",
    name: "Zettle POS",
    type: "pos",
    status: "connecte",
    lastSync: "il y a 3 min",
  },
  {
    id: "cn3",
    name: "Deliveroo",
    type: "livraison",
    status: "connecte",
    lastSync: "il y a 27 min",
  },
  {
    id: "cn4",
    name: "Uber Eats",
    type: "livraison",
    status: "erreur",
    lastSync: "il y a 2 jours",
    detail: "Jeton d'accès expiré — reconnexion nécessaire.",
  },
  {
    id: "cn5",
    name: "Mailchimp",
    type: "email",
    status: "attente",
    lastSync: "jamais synchronisé",
  },
];

export const campaigns: Campaign[] = [
  {
    id: "c1",
    name: "Terrasse d'été — teasing",
    type: "post",
    channel: "Instagram",
    restaurantId: "r1",
    startDate: "2026-06-20",
    endDate: "2026-07-15",
    status: "active",
    description:
      "Série de posts + reels sur la nouvelle carte terrasse et les cocktails d'été.",
    estimatedRevenue: 9200,
    impact: "fort",
    visites: 4300,
    timeline: [
      { date: "2026-06-20", label: "Lancement du reel teaser" },
      { date: "2026-06-27", label: "Post carte cocktails" },
      { date: "2026-07-04", label: "Story sondage clients" },
      { date: "2026-07-10", label: "Reel coulisses cuisine" },
    ],
    notes: [
      {
        author: "Léa Fontaine",
        date: "2026-07-05",
        text: "Fort engagement sur le reel du 20/06. Corrélation nette avec le pic de revenu du 06/07.",
      },
    ],
  },
  {
    id: "c2",
    name: "Brunch — carte fidélité",
    type: "email",
    channel: "Email",
    restaurantId: "r1",
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    status: "active",
    description: "Campagne email mensuelle pour les abonnés brunch (6e offert).",
    estimatedRevenue: 5100,
    impact: "moyen",
    visites: 1120,
    timeline: [
      { date: "2026-06-01", label: "Envoi vague 1 — 820 contacts" },
      { date: "2026-07-01", label: "Envoi vague 2 — 940 contacts" },
    ],
    notes: [],
  },
  {
    id: "c3",
    name: "-20% livraison midi",
    type: "promo",
    channel: "Instagram",
    restaurantId: "r1",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    status: "active",
    description: "Promotion livraison sur les commandes du midi en semaine.",
    estimatedRevenue: 3400,
    impact: "moyen",
    visites: 2100,
    timeline: [{ date: "2026-07-01", label: "Activation promo Deliveroo/Uber Eats" }],
    notes: [
      {
        author: "Léa Fontaine",
        date: "2026-07-09",
        text: "Impact positif mais marge réduite — surveiller le coût réel après commission plateforme.",
      },
    ],
  },
  {
    id: "c4",
    name: "Jazz du jeudi — affiche en salle",
    type: "promo",
    channel: "En salle",
    restaurantId: "r1",
    startDate: "2026-03-01",
    endDate: "2026-09-24",
    status: "active",
    description: "Signalétique en salle et sur les additions pour les soirées jazz.",
    estimatedRevenue: 2600,
    impact: "faible",
    visites: 0,
    timeline: [{ date: "2026-03-01", label: "Mise en place de la signalétique" }],
    notes: [],
  },
  {
    id: "c5",
    name: "Saint-Valentin",
    type: "email",
    channel: "Email",
    restaurantId: "r1",
    startDate: "2026-02-07",
    endDate: "2026-02-14",
    status: "terminee",
    description: "Menu spécial en duo, réservation prioritaire pour les abonnés.",
    estimatedRevenue: 6800,
    impact: "fort",
    visites: 1890,
    timeline: [
      { date: "2026-02-07", label: "Envoi annonce" },
      { date: "2026-02-12", label: "Relance places restantes" },
      { date: "2026-02-14", label: "Soirée complète" },
    ],
    notes: [
      {
        author: "Léa Fontaine",
        date: "2026-02-16",
        text: "Complet en 48h. Modèle à reproduire pour les fêtes de fin d'année.",
      },
    ],
  },
  {
    id: "c6",
    name: "Rentrée — nouvelle carte",
    type: "post",
    channel: "Instagram",
    restaurantId: "r1",
    startDate: "2026-09-01",
    endDate: "2026-09-15",
    status: "planifiee",
    description: "Annonce de la nouvelle carte automnale.",
    estimatedRevenue: 0,
    impact: "moyen",
    visites: 0,
    timeline: [],
    notes: [],
  },
];

export const alerts: Alert[] = [
  {
    id: "a1",
    title: "Journée anormalement basse",
    detail: "8 juillet : revenu 52% sous la moyenne du mercredi (météo).",
    severity: "moyenne",
    date: "2026-07-08",
  },
  {
    id: "a2",
    title: "Connexion Uber Eats en erreur",
    detail: "Jeton expiré depuis 2 jours — les commandes ne remontent plus.",
    severity: "haute",
    date: "2026-07-09",
  },
  {
    id: "a3",
    title: "Campagne en perte de vitesse",
    detail: "\"Jazz du jeudi\" : impact revenu en baisse de 18% sur 3 semaines.",
    severity: "basse",
    date: "2026-07-07",
  },
  {
    id: "a4",
    title: "Flux financier irrégulier",
    detail: "Écart de 1 240 € entre les ventes POS et les dépôts bancaires (juin).",
    severity: "haute",
    date: "2026-07-05",
  },
];

export const team: TeamMember[] = [
  {
    id: "u1",
    name: "Camille Andrieu",
    email: "camille@minerva-flow.fr",
    role: "owner",
    restaurantIds: ["r1", "r2", "r3"],
    status: "actif",
  },
  {
    id: "u2",
    name: "Marco Terrieux",
    email: "marco@minerva-flow.fr",
    role: "staff",
    restaurantIds: ["r1"],
    status: "actif",
  },
  {
    id: "u3",
    name: "Nina Roussel",
    email: "nina@minerva-flow.fr",
    role: "staff",
    restaurantIds: ["r1"],
    status: "actif",
  },
  {
    id: "u4",
    name: "Léa Fontaine",
    email: "lea@conseil-revenu.fr",
    role: "consultant",
    restaurantIds: ["r1", "r2"],
    status: "actif",
  },
  {
    id: "u5",
    name: "Hugo Bastide",
    email: "hugo@minerva-flow.fr",
    role: "staff",
    restaurantIds: ["r2"],
    status: "invite",
  },
];

export const kpis = {
  totalRevenue: 78700,
  totalRevenueDelta: 8.4,
  estimatedMargin: 41200,
  estimatedMarginDelta: 3.1,
  serviceDaysCount: 31,
  activeCampaigns: 4,
};
