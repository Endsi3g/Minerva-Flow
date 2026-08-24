// scripts/seed-demo-account.mjs
//
// Seed du compte démo permanent de Minerva Flow — utilisé pour le
// démarchage autonome (identifiants partagés à des prospects) et la revue
// bêta. Contrairement à scripts/seed.mjs (données internes multi-succursale
// pour l'équipe), ce script crée UN SEUL restaurant "vitrine" avec son
// propre utilisateur owner dédié, et couvre en plus le menu, les clients,
// le parrainage et les offres — pas seedés par scripts/seed.mjs aujourd'hui.
//
// Exécution : node scripts/seed-demo-account.mjs
// Sûr à ré-exécuter : chaque section vérifie l'existence des données avant
// d'insérer, comme scripts/seed.mjs.

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

const DEMO_EMAIL = "demo@minervaflow.app";
const DEMO_PASSWORD = "MinervaDemo2026!";
const RESTAURANT_NAME = "Minerva Flow — Démo";

const TODAY = new Date();

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
  menu_items: 0,
  customers: 0,
  loyalty_transactions: 0,
  referral_programs: 0,
  customer_referral_links: 0,
  offers: 0,
  loyalty_shares: 0,
  consent_backfilled: 0,
  birthday_backfilled: 0,
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

// ── 0. utilisateur démo ──────────────────────────────────────────────
async function ensureDemoUser() {
  // listUsers ne filtre pas par email côté API — on paginate jusqu'à trouver,
  // le nombre d'utilisateurs de ce projet reste petit (usage interne/pilotes).
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (found) return found.id;
    if (data.users.length < 200) break;
    page += 1;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Compte Démo" },
  });
  if (error) throw error;
  return data.user.id;
}

/**
 * Marks the demo profile as having completed the onboarding wizard — the
 * `(app)` layout redirects any authed user with `profiles.onboarding_completed
 * = false` to /onboarding regardless of restaurant membership, which would
 * otherwise intercept every fresh login to the demo account.
 */
async function ensureOnboardingCompleted(userId) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true, full_name: "Compte Démo" })
    .eq("id", userId);
  if (error) throw error;
}

// ── 1. restaurant + membership ───────────────────────────────────────
async function ensureRestaurant() {
  const { data: existing, error: selectError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("name", RESTAURANT_NAME)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: RESTAURANT_NAME,
      address: "1 Rue de la Démonstration",
      city: "Montréal",
      province: "QC",
      postal_code: "H2X 1Y5",
      timezone: "America/Montreal",
      currency: "CAD",
      service_model: "restaurant",
      color: "#167F5B",
      lng: -73.5673,
      lat: 45.5088,
    })
    .select("id")
    .single();
  if (error) throw error;
  counts.restaurants += 1;
  return data.id;
}

async function ensureOwnerMembership(restaurantId, userId) {
  const { data: existing, error: selectError } = await supabase
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return;

  const { error } = await supabase
    .from("restaurant_members")
    .insert({ restaurant_id: restaurantId, user_id: userId, role: "owner", status: "active" });
  if (error) throw error;
  counts.restaurant_members += 1;
}

// ── 2. menu (couvre les 4 quadrants BCG + quelques dérives de marge) ──
const MENU_ITEM_DEFS = [
  { name: "Soupe à l'oignon gratinée", category: "Entrées", price: 12, foodCost: 3.5, unitsSold: 180 },
  { name: "Tartare de saumon", category: "Entrées", price: 18, foodCost: 8.5, unitsSold: 150 },
  { name: "Salade de chèvre chaud", category: "Entrées", price: 14, foodCost: 4, unitsSold: 40 },
  { name: "Mini poutine apéro", category: "Entrées", price: 11, foodCost: 5.5, unitsSold: 35 },
  { name: "Burger Minerva", category: "Plats principaux", price: 22, foodCost: 7, unitsSold: 320 },
  { name: "Steak frites", category: "Plats principaux", price: 34, foodCost: 16, unitsSold: 210 },
  { name: "Risotto aux champignons", category: "Plats principaux", price: 24, foodCost: 6, unitsSold: 60 },
  { name: "Pâtes aux fruits de mer", category: "Plats principaux", price: 29, foodCost: 15, unitsSold: 45 },
  { name: "Poulet rôti fermier", category: "Plats principaux", price: 26, foodCost: 9, unitsSold: 260 },
  { name: "Fish and chips", category: "Plats principaux", price: 21, foodCost: 10, unitsSold: 190 },
  { name: "Crème brûlée", category: "Desserts", price: 9, foodCost: 2, unitsSold: 140 },
  { name: "Tarte au sucre", category: "Desserts", price: 8, foodCost: 2.5, unitsSold: 50 },
  { name: "Fondant au chocolat", category: "Desserts", price: 10, foodCost: 3.8, unitsSold: 30 },
  { name: "Assiette de fromages québécois", category: "Desserts", price: 16, foodCost: 8, unitsSold: 20 },
  { name: "Cocktail signature Minerva", category: "Boissons", price: 14, foodCost: 3, unitsSold: 200 },
  { name: "Café allongé", category: "Boissons", price: 4, foodCost: 0.6, unitsSold: 400 },
];

async function seedMenuItems(restaurantId) {
  const { count, error: countError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const rows = MENU_ITEM_DEFS.map((m) => ({
    restaurant_id: restaurantId,
    name: m.name,
    category: m.category,
    price: m.price,
    food_cost: m.foodCost,
    units_sold: m.unitsSold,
    active: true,
    description: null,
  }));

  const { data, error } = await supabase.from("menu_items").insert(rows).select("id");
  if (error) throw error;
  counts.menu_items += data.length;
}

// ── 3. clients (activité variée, alimente fidélité + rétention) ───────
const FIRST_NAMES = [
  "Alex", "Marie", "Jean", "Sophie", "Olivier", "Camille", "Félix", "Laurie", "Samuel", "Rosalie",
  "Antoine", "Émilie", "Gabriel", "Charlotte", "Nicolas", "Béatrice", "Simon", "Juliette", "Maxime", "Léa",
  "Thomas", "Alicia", "David", "Frédérique", "Vincent",
];
const LAST_NAMES = [
  "Tremblay", "Gagnon", "Roy", "Côté", "Bouchard", "Gauthier", "Morin", "Lavoie", "Fortin", "Gagné",
  "Ouellet", "Pelletier", "Bélanger", "Lévesque", "Bergeron",
];

function randomCustomerName(i) {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}${i}`;
}

async function seedCustomersAndTransactions(restaurantId) {
  const { count, error: countError } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) {
    const { data } = await supabase.from("customers").select("id, name, total_spent").eq("restaurant_id", restaurantId);
    return data ?? [];
  }

  const created = [];
  const N = 50;
  for (let i = 0; i < N; i++) {
    // Répartition volontaire : ~30% actifs, ~40% modérés, ~30% inactifs —
    // pour que le segment "inactivité"/"dérive de marge" du moteur de
    // rétention (Phase 3) ait tout de suite des cibles réalistes.
    const bucket = i < 15 ? "actif" : i < 35 ? "modere" : "inactif";
    const daysSinceLastVisit =
      bucket === "actif" ? randInt(1, 18) : bucket === "modere" ? randInt(19, 55) : randInt(60, 160);
    const visitCount = bucket === "actif" ? randInt(6, 28) : bucket === "modere" ? randInt(3, 14) : randInt(1, 8);
    const avgBasket = rand(14, 55);
    const totalSpent = Math.round(visitCount * avgBasket * rand(0.85, 1.15) * 100) / 100;
    const loyaltyPoints = Math.max(0, Math.round(totalSpent) - randInt(0, 40)); // quelques échanges déjà faits
    const lastVisitAt = addDays(TODAY, -daysSinceLastVisit).toISOString();
    const name = randomCustomerName(i);
    const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.com`;

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        restaurant_id: restaurantId,
        name,
        email,
        phone: `514-555-${String(1000 + i).slice(-4)}`,
        visit_count: visitCount,
        total_spent: totalSpent,
        loyalty_points: loyaltyPoints,
        last_visit_at: lastVisitAt,
      })
      .select("id, name, total_spent")
      .single();
    if (error) throw error;
    counts.customers += 1;
    created.push(customer);

    // Historique de visites cohérent avec total_spent/visit_count, pour que
    // la segmentation comportementale (Phase 3) ait de vraies données
    // d'écart entre visites, pas seulement un agrégat.
    const nTx = Math.min(visitCount, 6);
    if (nTx > 0) {
      const perTx = totalSpent / nTx;
      const txRows = [];
      for (let t = 0; t < nTx; t++) {
        const daysAgo = t === 0 ? daysSinceLastVisit : daysSinceLastVisit + t * randInt(12, 30);
        txRows.push({
          restaurant_id: restaurantId,
          customer_id: customer.id,
          type: "visite",
          amount_spent: Math.round(perTx * rand(0.7, 1.3) * 100) / 100,
          points_delta: Math.round(perTx),
          note: null,
          created_at: addDays(TODAY, -daysAgo).toISOString(),
        });
      }
      const { error: txError } = await supabase.from("loyalty_transactions").insert(txRows);
      if (txError) throw txError;
      counts.loyalty_transactions += txRows.length;
    }
  }

  return created;
}

// ── 4. programmes de parrainage + quelques liens clients ──────────────
async function seedReferralPrograms(restaurantId, customers) {
  const { count, error: countError } = await supabase
    .from("referral_programs")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const programs = [
    { name: "Amenez un ami", description: "3 amis convertis = un dessert offert.", goal_count: 3, reward_description: "Dessert offert" },
    { name: "Parrainage VIP", description: "10 amis convertis = un repas complet offert.", goal_count: 10, reward_description: "Repas complet offert" },
  ];
  const { data: programRows, error } = await supabase
    .from("referral_programs")
    .insert(programs.map((p) => ({ restaurant_id: restaurantId, ...p, active: true })))
    .select("id, goal_count");
  if (error) throw error;
  counts.referral_programs += programRows.length;

  // Quelques clients avec un lien de parrainage actif, dont un qui a déjà
  // atteint son objectif (reward_claimed_at) pour montrer l'état "débloqué"
  // dans le portail client.
  const referrers = customers.slice(0, 6);
  const linkRows = referrers.map((c, i) => {
    const program = programRows[i % programRows.length];
    const convertedCount = i === 0 ? program.goal_count : randInt(0, program.goal_count - 1);
    return {
      referral_program_id: program.id,
      customer_id: c.id,
      code: `demo-${c.id.slice(0, 8)}`,
      clicks: convertedCount + randInt(2, 15),
      converted_count: convertedCount,
      reward_claimed_at: convertedCount >= program.goal_count ? new Date().toISOString() : null,
    };
  });
  const { data: links, error: linkError } = await supabase.from("customer_referral_links").insert(linkRows).select("id");
  if (linkError) throw linkError;
  counts.customer_referral_links += links.length;
}

// ── 5. offres publiques ────────────────────────────────────────────────
async function seedOffers(restaurantId) {
  const { count, error: countError } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const rows = [
    {
      restaurant_id: restaurantId,
      title: "Café allongé offert dès 5 visites",
      description: "Fidélité — présentez votre compte à l'accueil.",
      active: true,
      starts_at: null,
      ends_at: null,
    },
    {
      restaurant_id: restaurantId,
      title: "5 à 7 — cocktail signature à 9$",
      description: "Tous les jeudis de 17h à 19h.",
      active: true,
      starts_at: toDateStr(addDays(TODAY, -14)),
      ends_at: toDateStr(addDays(TODAY, 30)),
    },
  ];
  const { data, error } = await supabase.from("offers").insert(rows).select("id");
  if (error) throw error;
  counts.offers += data.length;
}

// ── 6. programmes de revenus, journées de service, campagnes, finance ──
// (mêmes gabarits que scripts/seed.mjs, condensés pour un seul restaurant)
async function seedPrograms(restaurantId) {
  const { count, error: countError } = await supabase
    .from("revenue_programs")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) {
    const { data } = await supabase.from("revenue_programs").select("id, name").eq("restaurant_id", restaurantId);
    return data ?? [];
  }

  const templates = [
    {
      name: "Terrasse d'été",
      description: "Menu terrasse, cocktails et animation musicale les fins de semaine.",
      type: "saison",
      start_date: toDateStr(addDays(TODAY, -75)),
      end_date: toDateStr(addDays(TODAY, 15)),
      objective: "Maximiser les couverts en terrasse durant la haute saison.",
      revenue_goal: 90000,
      expected_cost: 52000,
      revenue: randInt(60000, 84000),
      cost: randInt(40000, 50000),
      status: "actif",
    },
    {
      name: "Brunch du dimanche",
      description: "Formule brunch à volonté, service continu 10h-14h.",
      type: "brunch",
      start_date: toDateStr(addDays(TODAY, -200)),
      end_date: toDateStr(addDays(TODAY, 165)),
      objective: "Fidéliser la clientèle du week-end.",
      revenue_goal: 48000,
      expected_cost: 26000,
      revenue: randInt(30000, 45000),
      cost: randInt(19000, 25000),
      status: "actif",
    },
    {
      name: "5 à 7 du jeudi",
      description: "Bar à vins québécois et bouchées, ambiance musique live.",
      type: "soiree",
      start_date: toDateStr(addDays(TODAY, -160)),
      end_date: toDateStr(addDays(TODAY, 60)),
      objective: "Générer du trafic en semaine hors heure de pointe.",
      revenue_goal: 28000,
      expected_cost: 16000,
      revenue: randInt(15000, 26000),
      cost: randInt(11000, 15000),
      status: "actif",
    },
  ];

  const { data, error } = await supabase
    .from("revenue_programs")
    .insert(templates.map((p) => ({ restaurant_id: restaurantId, ...p })))
    .select("id, name");
  if (error) throw error;
  counts.revenue_programs += data.length;
  return data;
}

const RUSH_LEVELS = ["calme", "normal", "rush", "debordement"];
const MAIN_SOURCES = ["salle", "livraison", "reservation"];
const NOTE_POOL = [
  "Service fluide, rien à signaler.",
  "Terrasse pleine dès 18h, belle ambiance.",
  "Bon retour sur la promo livraison, pic entre 19h et 21h.",
  "Journée calme, idéal pour la formation de la nouvelle équipe.",
  "",
];

async function seedServiceDays(restaurantId) {
  const { count, error: countError } = await supabase
    .from("service_days")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const nDays = 120; // ~4 mois, pour des prévisions/BCG/seuil de rentabilité crédibles
  const rows = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const date = addDays(TODAY, -i);
    const dow = date.getDay();
    const weekendBoost = dow === 5 || dow === 6 ? 1.4 : dow === 0 ? 1.2 : 1;
    const base = 2200;
    const wobble = Math.sin(i * 0.35) * 340 + Math.cos(i * 0.12) * 220;
    const revenue = Math.max(280, Math.round((base + wobble) * weekendBoost));
    const expenses = Math.round(revenue * rand(0.28, 0.42));
    const rushLevel = weekendBoost > 1.1 ? pick(["rush", "rush", "debordement", "normal"]) : pick(RUSH_LEVELS);

    rows.push({
      restaurant_id: restaurantId,
      date: toDateStr(date),
      revenue,
      expenses,
      reservation_count: randInt(4, 55),
      main_source: pick(MAIN_SOURCES),
      rush_level: rushLevel,
      events: [],
      notes: pick(NOTE_POOL),
      promo_active: Math.random() < 0.2,
      menu_change: Math.random() < 0.05,
      reviewed: Math.random() < 0.8,
    });
  }

  const { data, error } = await supabase.from("service_days").insert(rows).select("id");
  if (error) throw error;
  counts.service_days += data.length;
}

async function seedCampaigns(restaurantId, programs) {
  const { count, error: countError } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const findProgram = (name) => programs.find((p) => p.name === name)?.id ?? null;
  const templates = [
    {
      name: "Terrasse — teasing été",
      description: "Série de posts sur la nouvelle carte terrasse.",
      channel: "Instagram",
      type: "post",
      start_date: toDateStr(addDays(TODAY, -40)),
      end_date: toDateStr(addDays(TODAY, 5)),
      cost: randInt(400, 900),
      status: "active",
      estimated_revenue: randInt(6000, 11000),
      visites: randInt(2800, 5200),
      confidence: "fort",
      program_id: findProgram("Terrasse d'été"),
    },
    {
      name: "Brunch — infolettre fidélité",
      description: "Campagne courriel mensuelle pour les abonnés brunch.",
      channel: "Email",
      type: "email",
      start_date: toDateStr(addDays(TODAY, -60)),
      end_date: toDateStr(addDays(TODAY, 20)),
      cost: randInt(80, 220),
      status: "active",
      estimated_revenue: randInt(3200, 6000),
      visites: randInt(700, 1400),
      confidence: "moyen",
      program_id: findProgram("Brunch du dimanche"),
    },
    {
      name: "5 à 7 jeudi — affiche en salle",
      description: "Signalétique en salle et sur les additions.",
      channel: "En salle",
      type: "promo",
      start_date: toDateStr(addDays(TODAY, -100)),
      end_date: toDateStr(addDays(TODAY, 60)),
      cost: randInt(60, 150),
      status: "active",
      estimated_revenue: randInt(1500, 3000),
      visites: 0,
      confidence: "faible",
      program_id: findProgram("5 à 7 du jeudi"),
    },
  ];

  const { data, error } = await supabase
    .from("campaigns")
    .insert(templates.map((c) => ({ restaurant_id: restaurantId, ...c })))
    .select("id");
  if (error) throw error;
  counts.campaigns += data.length;
}

const EXPENSE_CATEGORY_NAMES = [
  "Personnel", "Fournisseurs", "Loyer & charges", "Marketing", "Livraison (commissions)", "Logiciels", "Utilities", "Divers",
];

async function seedExpenseCategories(restaurantId) {
  const rows = EXPENSE_CATEGORY_NAMES.map((name) => ({ restaurant_id: restaurantId, name, is_default: true }));
  const { data, error } = await supabase
    .from("expense_categories")
    .upsert(rows, { onConflict: "restaurant_id,name", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  counts.expense_categories += data ? data.length : 0;
}

async function seedFinancialTransactions(restaurantId, programs) {
  const { count, error: countError } = await supabase
    .from("financial_transactions")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  // amount est TOUJOURS une magnitude positive — direction porte le signe.
  // lib/engine/labor-cost.ts (sumLaborCost) et FinanceView (net = totalIn -
  // totalOut) additionnent amount directement pour direction='out' en
  // s'attendant à une magnitude positive ; des montants déjà négatifs ici
  // faisaient gonfler le flux net au lieu de le réduire (bug trouvé en audit
  // démo — ex: "flux net à 446% des entrées").
  // Un mélange équilibré entrées/sorties — un compte démo qui perd de
  // l'argent ce mois-ci est mathématiquement correct mais désastreux pour
  // un démarchage ; le nombre de lignes "in" doit dépasser les "out" en
  // volume total, pas juste être présent.
  const findProgram = (name) => programs.find((p) => p.name === name)?.id ?? null;
  const templates = [
    { description: "Encaissement TPE — service soir", amount: randInt(1800, 3600), direction: "in", category: "Ventes en salle", source_account: "Lightspeed POS", program_id: findProgram("Terrasse d'été") },
    { description: "Encaissement TPE — service midi", amount: randInt(1200, 2400), direction: "in", category: "Ventes en salle", source_account: "Lightspeed POS", program_id: null },
    { description: "Encaissement TPE — brunch dimanche", amount: randInt(1600, 3000), direction: "in", category: "Ventes en salle", source_account: "Lightspeed POS", program_id: findProgram("Brunch du dimanche") },
    { description: "Uber Eats — règlement hebdomadaire", amount: randInt(400, 900), direction: "in", category: "Livraison (commissions)", source_account: "Uber Eats", program_id: null },
    { description: "DoorDash — règlement hebdomadaire", amount: randInt(300, 700), direction: "in", category: "Livraison (commissions)", source_account: "DoorDash", program_id: null },
    { description: "Virement fournisseur — Fromagerie du Terroir", amount: randInt(400, 900), direction: "out", category: "Fournisseurs", source_account: "Desjardins — Compte pro", program_id: null },
    { description: "Salaires équipe — acompte quinzaine", amount: randInt(6500, 11000), direction: "out", category: "Personnel", source_account: "Paie", program_id: null },
    { description: "Loyer commercial — mensuel", amount: randInt(2800, 4200), direction: "out", category: "Loyer & charges", source_account: "Desjardins — Compte pro", program_id: null },
    { description: "Campagne Instagram — terrasse d'été", amount: randInt(150, 400), direction: "out", category: "Marketing", source_account: "Carte pro Visa", program_id: findProgram("Terrasse d'été") },
    { description: "Facture Hydro-Québec", amount: randInt(280, 520), direction: "out", category: "Utilities", source_account: "Desjardins — Compte pro", program_id: null },
  ];

  const rows = templates.map((t, i) => ({
    restaurant_id: restaurantId,
    date: toDateStr(addDays(TODAY, -randInt(0, 28))),
    description: t.description,
    amount: t.amount,
    direction: t.direction,
    category: t.category,
    source_account: t.source_account,
    program_id: t.program_id,
    reviewed: Math.random() < 0.7,
  }));

  const { data, error } = await supabase.from("financial_transactions").insert(rows).select("id");
  if (error) throw error;
  counts.financial_transactions += data.length;
}

async function seedConnections(restaurantId) {
  const { count, error: countError } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  // Pas de ligne "pos" ici — depuis que /settings a une vraie carte POS
  // (pos_connections, Square/Lightspeed réels), une ligne "pos" fantôme
  // dans cette table générique contredisait directement le vrai statut
  // ("Pas encore disponible") avec un faux "Connecté". Banque/livraison
  // restent, sans équivalent réel contradictoire ailleurs sur /settings.
  const rows = [
    { name: "Desjardins — Compte pro", type: "banque", status: "connecte", last_sync: new Date(Date.now() - 12 * 60 * 1000).toISOString(), detail: null },
    { name: "Uber Eats", type: "livraison", status: "connecte", last_sync: new Date(Date.now() - 27 * 60 * 1000).toISOString(), detail: null },
  ].map((c) => ({ restaurant_id: restaurantId, ...c }));

  const { data, error } = await supabase.from("connections").insert(rows).select("id");
  if (error) throw error;
  counts.connections += data.length;
}

async function seedAlertRules(restaurantId) {
  const rows = [
    { rule_type: "revenue_drop", threshold: 30, enabled: true, notify: true },
    { rule_type: "expense_spike", threshold: 25, enabled: true, notify: true },
    { rule_type: "missing_day_input", threshold: 2, enabled: true, notify: false },
    { rule_type: "broken_sync", threshold: 1, enabled: true, notify: true },
  ].map((r) => ({ restaurant_id: restaurantId, ...r }));

  const { data, error } = await supabase
    .from("alert_rules")
    .upsert(rows, { onConflict: "restaurant_id,rule_type", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  counts.alert_rules += data ? data.length : 0;
}

// ── 7. paramètres de rétention + paliers (idempotent — simple update) ──
// Persisté ici (pas seulement via l'UI pendant les tests) pour que le
// compte démo survive une recréation complète depuis zéro : le moteur de
// rétention et le lien QR de fidélité doivent être prêts à l'emploi dès le
// premier login d'un prospect, pas seulement après une session de test.
async function seedRetentionAndTierSettings(restaurantId) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      retention_engine_enabled: true,
      retention_inactivity_days: 21,
      retention_frequency_cap_days: 30,
      retention_birthday_lead_days: 3,
      loyalty_tier_2_threshold: 150,
      loyalty_tier_3_threshold: 400,
    })
    .eq("id", restaurantId);
  if (error) throw error;
}

// ── 8. lien QR de fidélité (idempotent — vérifie l'existence avant insert)
async function seedLoyaltyShare(restaurantId) {
  const { count, error: countError } = await supabase
    .from("loyalty_shares")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("loyalty_shares")
    .insert({ restaurant_id: restaurantId, token, title: "Fidélité" });
  if (error) throw error;
  counts.loyalty_shares += 1;
}

// ── 9. rétro-remplissage consentement/naissance sur les clients existants
// Nécessaire séparément de seedCustomersAndTransactions : cette dernière ne
// s'exécute qu'une fois (elle saute si des clients existent déjà), donc les
// 50 clients seedés en Phase 1 — avant que marketing_consent/birthday
// existent — ne les ont jamais reçus. Idempotent via son propre guard
// (saute si assez de clients ont déjà consenti).
async function backfillConsentAndBirthday(restaurantId) {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, marketing_consent, birthday")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!customers || customers.length === 0) return;

  const alreadyConsented = customers.filter((c) => c.marketing_consent).length;
  if (alreadyConsented >= Math.floor(customers.length * 0.5)) return;

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const patch = {};

    // ~65% opt-in — réaliste et suffisant pour alimenter le moteur de
    // rétention sur la majorité des 50 clients démo.
    if (i % 3 !== 0) {
      patch.marketing_consent = true;
      patch.consent_source = "qr_join";
      patch.consent_at = new Date().toISOString();
    }

    // Quelques anniversaires dans les 7 prochains jours (pour que le
    // déclencheur "date clé" ait toujours quelque chose à montrer en démo),
    // le reste réparti dans l'année.
    if (i < 3) {
      patch.birthday = toDateStr(addDays(TODAY, i * 2 + 1));
    } else if (i % 5 === 0) {
      patch.birthday = toDateStr(new Date(1990 + (i % 20), i % 12, (i % 27) + 1));
    }

    if (Object.keys(patch).length === 0) continue;
    const { error: updateError } = await supabase.from("customers").update(patch).eq("id", c.id);
    if (updateError) throw updateError;
    if (patch.marketing_consent) counts.consent_backfilled += 1;
    if (patch.birthday) counts.birthday_backfilled += 1;
  }
}

// ── run ──────────────────────────────────────────────────────────────
async function main() {
  console.log("Seed compte démo permanent — Minerva Flow\n");

  const userId = await ensureDemoUser();
  await ensureOnboardingCompleted(userId);
  console.log(`→ utilisateur démo : ${DEMO_EMAIL} (${userId})`);

  const restaurantId = await ensureRestaurant();
  await ensureOwnerMembership(restaurantId, userId);
  console.log(`→ restaurant : ${RESTAURANT_NAME} (${restaurantId})`);

  const programs = await seedPrograms(restaurantId);
  await seedServiceDays(restaurantId);
  await seedCampaigns(restaurantId, programs);
  await seedExpenseCategories(restaurantId);
  await seedFinancialTransactions(restaurantId, programs);
  await seedConnections(restaurantId);
  await seedAlertRules(restaurantId);

  await seedMenuItems(restaurantId);
  const customers = await seedCustomersAndTransactions(restaurantId);
  await seedReferralPrograms(restaurantId, customers);
  await seedOffers(restaurantId);

  await seedRetentionAndTierSettings(restaurantId);
  await seedLoyaltyShare(restaurantId);
  await backfillConsentAndBirthday(restaurantId);

  console.log("\n── Résumé ──────────────────────────────────────────────");
  console.log(`Identifiants démo : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Restaurant : ${RESTAURANT_NAME} → ${restaurantId}`);
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
