// scripts/seed.mjs
//
// Seed réaliste pour Minerva Flow, adapté au Québec.
// Exécution : node scripts/seed.mjs
//
// Sûr à ré-exécuter : chaque section vérifie l'existence des données avant
// d'insérer (upsert sur les tables avec contrainte unique, "insert si vide"
// sur les autres, scopées par restaurant_id).

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY (vérifie .env.local)."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OWNER_USER_ID = "bf4043f9-332a-421c-a0c6-0117e843adbf";

// ── compteur de lignes insérées, pour le rapport final ──────────────────
const counts = {
  restaurants: 0,
  restaurant_members: 0,
  revenue_programs: 0,
  service_days: 0,
  campaigns: 0,
  expense_categories: 0,
  financial_transactions: 0,
  connections: 0,
  alert_rules: 0,
};

// ── helpers ───────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.round(rand(min, max));
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const TODAY = new Date("2026-07-13T00:00:00");

// ── 1. restaurants ───────────────────────────────────────────────────
const RESTAURANT_DEFS = [
  {
    key: "montreal",
    name: "Minerva — Plateau Mont-Royal",
    address: "4200 Rue Saint-Denis",
    city: "Montréal",
    province: "QC",
    postal_code: "H2J 2K9",
    timezone: "America/Montreal",
    currency: "CAD",
    service_model: "restaurant",
    color: "#167F5B",
    lng: -73.5804,
    lat: 45.5231,
    density: "high",
  },
  {
    key: "quebec",
    name: "Minerva — Vieux-Québec",
    address: "1180 Rue Saint-Jean",
    city: "Québec",
    province: "QC",
    postal_code: "G1R 1S6",
    timezone: "America/Montreal",
    currency: "CAD",
    service_model: "restaurant",
    color: "#D97706",
    lng: -71.2082,
    lat: 46.8123,
    density: "normal",
  },
  {
    key: "gatineau",
    name: "Minerva — Vieux-Hull",
    address: "215 Rue Promenade du Portage",
    city: "Gatineau",
    province: "QC",
    postal_code: "J8X 2K1",
    timezone: "America/Montreal",
    currency: "CAD",
    service_model: "restaurant",
    color: "#7C3AED",
    lng: -75.7386,
    lat: 45.4215,
    density: "normal",
  },
];

async function ensureRestaurant(def) {
  const { data: existing, error: selectError } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("name", def.name)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("restaurants")
    .insert({
      name: def.name,
      address: def.address,
      city: def.city,
      province: def.province,
      postal_code: def.postal_code,
      timezone: def.timezone,
      currency: def.currency,
      service_model: def.service_model,
      color: def.color,
      lng: def.lng,
      lat: def.lat,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  counts.restaurants += 1;
  return inserted.id;
}

async function ensureOwnerMembership(restaurantId) {
  const { data: existing, error: selectError } = await supabase
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", OWNER_USER_ID)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return;

  const { error: insertError } = await supabase.from("restaurant_members").insert({
    restaurant_id: restaurantId,
    user_id: OWNER_USER_ID,
    role: "owner",
    status: "active",
  });

  if (insertError) throw insertError;
  counts.restaurant_members += 1;
}

// ── 2. revenue_programs ──────────────────────────────────────────────
function programTemplates(dense) {
  const base = [
    {
      name: "Terrasse d'été 2026",
      description: "Menu terrasse, cocktails et animation musicale les vendredis-samedis.",
      type: "saison",
      start_date: "2026-06-01",
      end_date: "2026-08-31",
      objective: "Maximiser les couverts en terrasse durant la haute saison.",
      revenue_goal: 145000,
      expected_cost: 78000,
      revenue: randInt(95000, 132000),
      cost: randInt(60000, 76000),
      status: "actif",
    },
    {
      name: "Brunch du dimanche",
      description: "Formule brunch à volonté, service continu 10h-14h.",
      type: "brunch",
      start_date: "2026-01-04",
      end_date: "2026-12-27",
      objective: "Fidéliser la clientèle du week-end.",
      revenue_goal: 62000,
      expected_cost: 33000,
      revenue: randInt(38000, 58000),
      cost: randInt(24000, 32000),
      status: "actif",
    },
    {
      name: "5 à 7 du jeudi",
      description: "Bar à vins québécois et bouchées, ambiance musique live.",
      type: "soiree",
      start_date: "2026-03-05",
      end_date: "2026-09-24",
      objective: "Générer du trafic en semaine hors heure de pointe.",
      revenue_goal: 36000,
      expected_cost: 21000,
      revenue: randInt(18000, 33000),
      cost: randInt(14000, 20000),
      status: "actif",
    },
    {
      name: "Cabane à sucre — édition printemps",
      description: "Menu de cabane à sucre revisité, réservations complètes.",
      type: "evenement",
      start_date: "2026-03-15",
      end_date: "2026-04-15",
      objective: "Capitaliser sur la saison des sucres.",
      revenue_goal: 24000,
      expected_cost: 10500,
      revenue: randInt(20000, 26000),
      cost: randInt(9000, 11500),
      status: "termine",
    },
    {
      name: "Rentrée gourmande",
      description: "Nouvelle carte d'automne, lancement en salle et sur les réseaux.",
      type: "saison",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      objective: "Relancer l'affluence après la baisse estivale.",
      revenue_goal: 28000,
      expected_cost: 9500,
      revenue: 0,
      cost: 0,
      status: "planifie",
    },
    {
      name: "Fêtes de fin d'année",
      description: "Menu des Fêtes, réservations de groupe et soirées corpo.",
      type: "evenement",
      start_date: "2025-12-15",
      end_date: "2025-12-31",
      objective: "Maximiser les réservations de groupe pour le temps des Fêtes.",
      revenue_goal: 42000,
      expected_cost: 18000,
      revenue: randInt(35000, 44000),
      cost: randInt(16000, 19000),
      status: "termine",
    },
  ];
  return dense ? base : base.slice(0, 5);
}

async function seedPrograms(restaurantId, dense) {
  const { count, error: countError } = await supabase
    .from("revenue_programs")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) {
    return { ids: await fetchProgramIds(restaurantId), created: false };
  }

  const rows = programTemplates(dense).map((p) => ({
    restaurant_id: restaurantId,
    name: p.name,
    description: p.description,
    type: p.type,
    start_date: p.start_date,
    end_date: p.end_date,
    objective: p.objective,
    revenue_goal: p.revenue_goal,
    expected_cost: p.expected_cost,
    revenue: p.revenue,
    cost: p.cost,
    status: p.status,
    created_by: OWNER_USER_ID,
  }));

  const { data, error } = await supabase.from("revenue_programs").insert(rows).select("id, name");
  if (error) throw error;
  counts.revenue_programs += data.length;
  return { ids: data, created: true };
}

async function fetchProgramIds(restaurantId) {
  const { data, error } = await supabase
    .from("revenue_programs")
    .select("id, name")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  return data;
}

// ── 3. service_days ──────────────────────────────────────────────────
const RUSH_LEVELS = ["calme", "normal", "rush", "debordement"];
const MAIN_SOURCES = ["salle", "livraison", "reservation"];
const EVENT_POOL = [
  "5 à 7 du jeudi",
  "Brunch du dimanche",
  "Soirée dégustation",
  "Réservation de groupe",
  "Terrasse — soirée DJ",
];
const NOTE_POOL = [
  "Service fluide, rien à signaler.",
  "Terrasse pleine dès 18h, belle ambiance.",
  "Pluie toute la journée, très peu de couverts en salle.",
  "Groupe de 16 personnes le soir, service tendu en cuisine.",
  "File d'attente jusqu'à 30 min entre 11h30 et 13h.",
  "Panne de la borne de paiement pendant 20 minutes.",
  "Bon retour sur la promo livraison, pic entre 19h et 21h.",
  "Journée calme, idéal pour la formation de la nouvelle équipe.",
  "Rupture de stock sur le plat du jour en fin de service.",
  "",
];

function serviceDayCount(dense) {
  return dense ? 32 : 29;
}

async function seedServiceDays(restaurantId, dense) {
  const { count, error: countError } = await supabase
    .from("service_days")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const nDays = serviceDayCount(dense);
  const rows = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const date = addDays(TODAY, -i);
    const dow = date.getDay();
    const weekendBoost = dow === 5 || dow === 6 ? 1.4 : dow === 0 ? 1.2 : 1;
    const base = dense ? 2400 : 1800;
    const wobble = Math.sin(i * 1.6) * 380 + Math.cos(i * 0.6) * 240;
    const revenue = Math.max(280, Math.round((base + wobble) * weekendBoost));
    const expenses = Math.round(revenue * rand(0.28, 0.42));
    const rushLevel =
      weekendBoost > 1.1 ? pick(["rush", "rush", "debordement", "normal"]) : pick(RUSH_LEVELS);
    const reservationCount =
      rushLevel === "debordement"
        ? randInt(45, 70)
        : rushLevel === "rush"
          ? randInt(28, 48)
          : rushLevel === "calme"
            ? randInt(2, 12)
            : randInt(12, 28);

    rows.push({
      restaurant_id: restaurantId,
      date: toDateStr(date),
      revenue,
      expenses,
      reservation_count: reservationCount,
      main_source: pick(MAIN_SOURCES),
      rush_level: rushLevel,
      events: Math.random() < 0.3 ? [pick(EVENT_POOL)] : [],
      notes: pick(NOTE_POOL),
      promo_active: Math.random() < 0.2,
      menu_change: Math.random() < 0.08,
      reviewed: Math.random() < 0.75,
      created_by: OWNER_USER_ID,
    });
  }

  const { data, error } = await supabase.from("service_days").insert(rows).select("id");
  if (error) throw error;
  counts.service_days += data.length;
}

// ── 4. campaigns ─────────────────────────────────────────────────────
function campaignTemplates(programIds, dense) {
  const findProgram = (name) => programIds.find((p) => p.name === name)?.id ?? null;

  const base = [
    {
      name: "Terrasse — teasing été",
      description: "Série de posts et reels sur la nouvelle carte terrasse et les cocktails d'été.",
      channel: "Instagram",
      type: "post",
      start_date: "2026-06-15",
      end_date: "2026-07-20",
      cost: randInt(400, 900),
      status: "active",
      estimated_revenue: randInt(6000, 11000),
      visites: randInt(2800, 5200),
      confidence: "fort",
      program_id: findProgram("Terrasse d'été 2026"),
    },
    {
      name: "Brunch — infolettre fidélité",
      description: "Campagne courriel mensuelle pour les abonnés brunch (café offert dès 5 visites).",
      channel: "Email",
      type: "email",
      start_date: "2026-06-01",
      end_date: "2026-08-31",
      cost: randInt(80, 220),
      status: "active",
      estimated_revenue: randInt(3200, 6000),
      visites: randInt(700, 1400),
      confidence: "moyen",
      program_id: findProgram("Brunch du dimanche"),
    },
    {
      name: "-15% livraison midi semaine",
      description: "Promotion livraison sur les commandes du midi, lundi au vendredi.",
      channel: "Instagram",
      type: "promo",
      start_date: "2026-07-01",
      end_date: "2026-07-31",
      cost: randInt(150, 350),
      status: "active",
      estimated_revenue: randInt(2000, 4200),
      visites: randInt(1200, 2600),
      confidence: "moyen",
      program_id: null,
    },
    {
      name: "5 à 7 jeudi — affiche en salle",
      description: "Signalétique en salle et sur les additions pour les soirées du jeudi.",
      channel: "En salle",
      type: "promo",
      start_date: "2026-03-01",
      end_date: "2026-09-24",
      cost: randInt(60, 150),
      status: "active",
      estimated_revenue: randInt(1500, 3000),
      visites: 0,
      confidence: "faible",
      program_id: findProgram("5 à 7 du jeudi"),
    },
    {
      name: "Cabane à sucre — annonce",
      description: "Annonce Facebook et Instagram pour les réservations de groupe.",
      channel: "Facebook",
      type: "post",
      start_date: "2026-02-20",
      end_date: "2026-04-10",
      cost: randInt(250, 500),
      status: "terminee",
      estimated_revenue: randInt(5000, 9000),
      visites: randInt(1500, 2800),
      confidence: "fort",
      program_id: findProgram("Cabane à sucre — édition printemps"),
    },
    {
      name: "Rentrée — nouvelle carte",
      description: "Annonce de la carte d'automne et du retour des soirées à thème.",
      channel: "Instagram",
      type: "post",
      start_date: "2026-09-01",
      end_date: "2026-09-15",
      cost: 0,
      status: "planifiee",
      estimated_revenue: 0,
      visites: 0,
      confidence: "insuffisant",
      program_id: findProgram("Rentrée gourmande"),
    },
  ];
  return dense ? base : base.slice(0, 5);
}

async function seedCampaigns(restaurantId, programIds, dense) {
  const { count, error: countError } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const rows = campaignTemplates(programIds, dense).map((c) => ({
    restaurant_id: restaurantId,
    program_id: c.program_id,
    name: c.name,
    description: c.description,
    channel: c.channel,
    type: c.type,
    start_date: c.start_date,
    end_date: c.end_date,
    cost: c.cost,
    status: c.status,
    estimated_revenue: c.estimated_revenue,
    visites: c.visites,
    confidence: c.confidence,
    created_by: OWNER_USER_ID,
  }));

  const { data, error } = await supabase.from("campaigns").insert(rows).select("id");
  if (error) throw error;
  counts.campaigns += data.length;
}

// ── 5. expense_categories ────────────────────────────────────────────
const EXPENSE_CATEGORY_NAMES = [
  { name: "Personnel", is_default: true },
  { name: "Fournisseurs", is_default: true },
  { name: "Loyer & charges", is_default: true },
  { name: "Marketing", is_default: true },
  { name: "Livraison (commissions)", is_default: true },
  { name: "Logiciels", is_default: true },
  { name: "Utilities", is_default: true },
  { name: "Divers", is_default: true },
  { name: "Événementiel", is_default: false },
];

async function seedExpenseCategories(restaurantId) {
  const rows = EXPENSE_CATEGORY_NAMES.map((c) => ({
    restaurant_id: restaurantId,
    name: c.name,
    is_default: c.is_default,
  }));

  const { data, error } = await supabase
    .from("expense_categories")
    .upsert(rows, { onConflict: "restaurant_id,name", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  counts.expense_categories += data ? data.length : 0;
}

// ── 6. financial_transactions ────────────────────────────────────────
const QC_SUPPLIERS = [
  "Fruits de mer de la Côte",
  "Boulangerie Première Moisson",
  "Maraîchers de Laval",
  "Boucherie Le Marché",
  "Fromagerie du Terroir",
  "Distribution Sysco Québec",
];

function transactionTemplates(dense, categories, programIds, accounts) {
  const findProgram = (name) => programIds.find((p) => p.name === name)?.id ?? null;
  const catId = (name) => categories.find((c) => c.name === name)?.id ?? null;

  const base = [
    {
      description: "Encaissement TPE — service soir",
      amount: randInt(1800, 3600),
      direction: "in",
      category: "Ventes en salle",
      source_account: accounts.pos,
      program_id: findProgram("Terrasse d'été 2026"),
    },
    {
      description: "Uber Eats — règlement hebdomadaire",
      amount: randInt(400, 900),
      direction: "in",
      category: "Livraison (commissions)",
      source_account: "Uber Eats",
      program_id: null,
    },
    {
      description: "Encaissement TPE — brunch dimanche",
      amount: randInt(1600, 3200),
      direction: "in",
      category: "Ventes en salle",
      source_account: accounts.pos,
      program_id: findProgram("Brunch du dimanche"),
    },
    {
      description: `Virement fournisseur — ${pick(QC_SUPPLIERS)}`,
      amount: -randInt(400, 900),
      direction: "out",
      category: "Fournisseurs",
      source_account: accounts.banque,
      program_id: null,
    },
    {
      description: "Salaires équipe — acompte quinzaine",
      amount: -randInt(6500, 11000),
      direction: "out",
      category: "Personnel",
      source_account: accounts.banque,
      program_id: null,
    },
    {
      description: "Loyer commercial — mensuel",
      amount: -randInt(2800, 4200),
      direction: "out",
      category: "Loyer & charges",
      source_account: accounts.banque,
      program_id: null,
    },
    {
      description: "Campagne Instagram — terrasse d'été",
      amount: -randInt(150, 400),
      direction: "out",
      category: "Marketing",
      source_account: "Carte pro Visa",
      program_id: findProgram("Terrasse d'été 2026"),
    },
    {
      description: "DoorDash — règlement hebdomadaire",
      amount: randInt(300, 700),
      direction: "in",
      category: "Livraison (commissions)",
      source_account: "DoorDash",
      program_id: null,
    },
    {
      description: "Abonnement logiciel de caisse",
      amount: -randInt(45, 120),
      direction: "out",
      category: "Logiciels",
      source_account: "Carte pro Visa",
      program_id: null,
    },
    {
      description: "Facture Hydro-Québec",
      amount: -randInt(280, 520),
      direction: "out",
      category: "Utilities",
      source_account: accounts.banque,
      program_id: null,
    },
    {
      description: `Virement fournisseur — ${pick(QC_SUPPLIERS)}`,
      amount: -randInt(300, 650),
      direction: "out",
      category: "Fournisseurs",
      source_account: accounts.banque,
      program_id: null,
    },
    {
      description: "Encaissement TPE — soirée 5 à 7",
      amount: randInt(900, 1900),
      direction: "in",
      category: "Ventes en salle",
      source_account: accounts.pos,
      program_id: findProgram("5 à 7 du jeudi"),
    },
    {
      description: "Traiteur — réservation de groupe (Fêtes)",
      amount: randInt(1200, 2600),
      direction: "in",
      category: "Événementiel",
      source_account: accounts.banque,
      program_id: findProgram("Fêtes de fin d'année"),
    },
    {
      description: "Frais bancaires mensuels",
      amount: -randInt(25, 60),
      direction: "out",
      category: "Divers",
      source_account: accounts.banque,
      program_id: null,
    },
  ];
  return dense ? base : base.slice(0, 12);
}

async function seedFinancialTransactions(restaurantId, programIds, dense, bankName) {
  const { count, error: countError } = await supabase
    .from("financial_transactions")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const accounts = { banque: bankName, pos: "Lightspeed POS" };
  const templates = transactionTemplates(dense, [], programIds, accounts);

  const nRows = templates.length;
  const rows = templates.map((t, i) => {
    const daysAgo = Math.round((i / nRows) * 28) + randInt(0, 2);
    return {
      restaurant_id: restaurantId,
      date: toDateStr(addDays(TODAY, -daysAgo)),
      description: t.description,
      amount: t.amount,
      direction: t.direction,
      category: t.category,
      source_account: t.source_account,
      program_id: t.program_id,
      reviewed: Math.random() < 0.7,
    };
  });

  const { data, error } = await supabase.from("financial_transactions").insert(rows).select("id");
  if (error) throw error;
  counts.financial_transactions += data.length;
}

// ── 7. connections ───────────────────────────────────────────────────
const DELIVERY_PAIRS = [
  ["Uber Eats", "DoorDash"],
  ["Uber Eats", "SkipTheDishes"],
  ["DoorDash", "SkipTheDishes"],
];

function connectionTemplates(bankName, deliveryPair) {
  return [
    {
      name: bankName,
      type: "banque",
      status: "connecte",
      last_sync: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      detail: null,
    },
    {
      name: "Lightspeed POS",
      type: "pos",
      status: "connecte",
      last_sync: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      detail: null,
    },
    {
      name: deliveryPair[0],
      type: "livraison",
      status: "connecte",
      last_sync: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
      detail: null,
    },
    {
      name: deliveryPair[1],
      type: "livraison",
      status: "erreur",
      last_sync: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      detail: "Jeton d'accès expiré — reconnexion nécessaire.",
    },
    {
      name: "Mailchimp",
      type: "email",
      status: "attente",
      last_sync: null,
      detail: "Jamais synchronisé.",
    },
  ];
}

async function seedConnections(restaurantId, bankName, deliveryPair) {
  const { count, error: countError } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const rows = connectionTemplates(bankName, deliveryPair).map((c) => ({
    restaurant_id: restaurantId,
    name: c.name,
    type: c.type,
    status: c.status,
    last_sync: c.last_sync,
    detail: c.detail,
  }));

  const { data, error } = await supabase.from("connections").insert(rows).select("id");
  if (error) throw error;
  counts.connections += data.length;
}

// ── 8. alert_rules ───────────────────────────────────────────────────
const ALERT_RULE_TEMPLATES = [
  { rule_type: "revenue_drop", threshold: 30, enabled: true, notify: true },
  { rule_type: "expense_spike", threshold: 25, enabled: true, notify: true },
  { rule_type: "missing_day_input", threshold: 2, enabled: true, notify: false },
  { rule_type: "broken_sync", threshold: 1, enabled: true, notify: true },
  { rule_type: "reservation_anomaly", threshold: 40, enabled: false, notify: false },
];

async function seedAlertRules(restaurantId) {
  const rows = ALERT_RULE_TEMPLATES.map((r) => ({
    restaurant_id: restaurantId,
    rule_type: r.rule_type,
    threshold: r.threshold,
    enabled: r.enabled,
    notify: r.notify,
  }));

  const { data, error } = await supabase
    .from("alert_rules")
    .upsert(rows, { onConflict: "restaurant_id,rule_type", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  counts.alert_rules += data ? data.length : 0;
}

// ── banques québécoises par établissement ────────────────────────────
const BANKS = ["Desjardins — Compte pro", "Banque Nationale — Compte pro", "RBC Banque Royale — Compte pro"];

// ── run ───────────────────────────────────────────────────────────────
async function main() {
  console.log("Seed Minerva Flow — établissements du Québec\n");

  const restaurantResults = [];

  for (let i = 0; i < RESTAURANT_DEFS.length; i++) {
    const def = RESTAURANT_DEFS[i];
    const dense = def.density === "high";

    console.log(`→ ${def.name} (${def.city})`);
    const restaurantId = await ensureRestaurant(def);
    await ensureOwnerMembership(restaurantId);

    const { ids: programIds } = await seedPrograms(restaurantId, dense);
    await seedServiceDays(restaurantId, dense);
    await seedCampaigns(restaurantId, programIds, dense);
    await seedExpenseCategories(restaurantId);
    await seedFinancialTransactions(restaurantId, programIds, dense, BANKS[i % BANKS.length]);
    await seedConnections(restaurantId, BANKS[i % BANKS.length], DELIVERY_PAIRS[i % DELIVERY_PAIRS.length]);
    await seedAlertRules(restaurantId);

    restaurantResults.push({ id: restaurantId, name: def.name, city: def.city });
    console.log(`  id: ${restaurantId}\n`);
  }

  console.log("── Résumé ──────────────────────────────────────────────");
  console.log("Établissements :");
  for (const r of restaurantResults) {
    console.log(`  - ${r.name} (${r.city}) → ${r.id}`);
  }
  console.log("\nLignes insérées durant cette exécution :");
  for (const [table, n] of Object.entries(counts)) {
    console.log(`  - ${table}: ${n}`);
  }
}

main()
  .then(() => {
    console.log("\nSeed terminé sans erreur.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nErreur pendant le seed :", err);
    process.exit(1);
  });
