// scripts/seed-demo-franchises.mjs
//
// Adds 2 more establishments to the permanent demo account
// (demo@minervaflow.app) under the same workspace as the flagship
// "Minerva Flow — Démo" restaurant, so Vue franchise (/franchise) has
// real multi-establishment data to show instead of its empty state
// (which requires >= 2 restaurants in the same workspace_id).
//
// Safe to re-run: skips restaurant creation if a matching name already
// exists, and only backfills service_days/customers up to their target
// counts.
//
// Exécution : node scripts/seed-demo-franchises.mjs

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo@minervaflow.app";
const FLAGSHIP_NAME = "Minerva Flow — Démo";
const WORKSPACE_NAME = "Minerva Flow — Groupe";
const TODAY = new Date();

const NEW_RESTAURANTS = [
  {
    name: "Minerva Flow — Démo (Québec)",
    address: "12 Rue Saint-Jean",
    city: "Québec",
    postal_code: "G1R 1N7",
    color: "#0E5A40",
    lat: 46.8139,
    lng: -71.208,
    revenueRange: [1400, 2600],
  },
  {
    name: "Minerva Flow — Démo (Sherbrooke)",
    address: "88 Rue King Ouest",
    city: "Sherbrooke",
    postal_code: "J1H 1P1",
    color: "#6D7E1F",
    lat: 45.4042,
    lng: -71.8929,
    revenueRange: [900, 1900],
  },
];

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

const FIRST_NAMES = ["Alex", "Marie", "Jean", "Sophie", "Olivier", "Camille", "Félix", "Laurie", "Samuel", "Rosalie", "Antoine", "Émilie"];
const LAST_NAMES = ["Tremblay", "Gagnon", "Roy", "Côté", "Bouchard", "Gauthier", "Morin", "Lavoie", "Fortin", "Gagné"];
const MENU_ITEM_DEFS = [
  { name: "Soupe à l'oignon gratinée", category: "Entrées", price: 12, foodCost: 3.5, unitsSold: 90 },
  { name: "Burger Minerva", category: "Plats principaux", price: 22, foodCost: 7, unitsSold: 160 },
  { name: "Steak frites", category: "Plats principaux", price: 34, foodCost: 16, unitsSold: 100 },
  { name: "Poulet rôti fermier", category: "Plats principaux", price: 26, foodCost: 9, unitsSold: 130 },
  { name: "Crème brûlée", category: "Desserts", price: 9, foodCost: 2, unitsSold: 70 },
  { name: "Cocktail signature Minerva", category: "Boissons", price: 14, foodCost: 3, unitsSold: 100 },
  { name: "Café allongé", category: "Boissons", price: 4, foodCost: 0.6, unitsSold: 200 },
];

async function ensureDemoUserId() {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (found) return found.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  throw new Error(`Utilisateur ${DEMO_EMAIL} introuvable — exécute d'abord scripts/seed-demo-account.mjs`);
}

async function ensureWorkspace(flagshipId, userId) {
  const { data: flagship, error: flagshipError } = await supabase
    .from("restaurants")
    .select("workspace_id")
    .eq("id", flagshipId)
    .single();
  if (flagshipError) throw flagshipError;
  if (flagship.workspace_id) return flagship.workspace_id;

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name: WORKSPACE_NAME })
    .select("id")
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "owner", status: "active" });
  if (memberError) throw memberError;

  const { error: assignError } = await supabase
    .from("restaurants")
    .update({ workspace_id: workspace.id })
    .eq("id", flagshipId);
  if (assignError) throw assignError;

  console.log(`Workspace créé (${workspace.id}) et restaurant vitrine rattaché.`);
  return workspace.id;
}

async function ensureRestaurant(def, workspaceId, userId) {
  const { data: existing, error: selectError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("name", def.name)
    .maybeSingle();
  if (selectError) throw selectError;

  let restaurantId = existing?.id;
  if (!restaurantId) {
    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        name: def.name,
        workspace_id: workspaceId,
        address: def.address,
        city: def.city,
        province: "QC",
        postal_code: def.postal_code,
        timezone: "America/Montreal",
        currency: "CAD",
        service_model: "restaurant",
        color: def.color,
        lng: def.lng,
        lat: def.lat,
        tax_rate: 0.14975,
        accepts_tips: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    restaurantId = data.id;
    console.log(`Restaurant créé : ${def.name} (${restaurantId})`);
  }

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) {
    const { error } = await supabase
      .from("restaurant_members")
      .insert({ restaurant_id: restaurantId, user_id: userId, role: "owner", status: "active" });
    if (error) throw error;
  }

  return restaurantId;
}

async function seedMenu(restaurantId) {
  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (count && count > 0) return;

  const rows = MENU_ITEM_DEFS.map((m) => ({
    restaurant_id: restaurantId,
    name: m.name,
    category: m.category,
    price: m.price,
    food_cost: m.foodCost,
    units_sold: m.unitsSold,
    active: true,
  }));
  const { error } = await supabase.from("menu_items").insert(rows);
  if (error) throw error;
  console.log(`  ${rows.length} plats ajoutés.`);
}

async function seedServiceDays(restaurantId, revenueRange) {
  const from = toDateStr(addDays(TODAY, -45));
  const { data: existing } = await supabase
    .from("service_days")
    .select("date")
    .eq("restaurant_id", restaurantId)
    .gte("date", from);
  const existingDates = new Set((existing ?? []).map((d) => d.date));

  const rows = [];
  for (let i = 45; i >= 0; i--) {
    const date = toDateStr(addDays(TODAY, -i));
    if (existingDates.has(date)) continue;
    const dow = new Date(date).getDay();
    const weekendBoost = dow === 5 || dow === 6 ? 1.3 : 1;
    rows.push({
      restaurant_id: restaurantId,
      date,
      revenue: Math.round(rand(...revenueRange) * weekendBoost),
      main_source: pick(["salle", "livraison", "reservation"]),
      events: [],
      notes: "",
    });
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from("service_days").insert(rows);
  if (error) throw error;
  console.log(`  ${rows.length} journées de service ajoutées.`);
}

async function seedCustomers(restaurantId) {
  const { count } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (count && count > 0) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, total_spent, visit_count, created_at")
      .eq("restaurant_id", restaurantId);
    return data ?? [];
  }

  const N = 18;
  const created = [];
  for (let i = 0; i < N; i++) {
    const bucket = i < 6 ? "actif" : i < 13 ? "modere" : "inactif";
    const daysSinceLastVisit = bucket === "actif" ? randInt(1, 18) : bucket === "modere" ? randInt(19, 55) : randInt(60, 160);
    const visitCount = bucket === "actif" ? randInt(6, 24) : bucket === "modere" ? randInt(3, 12) : randInt(1, 6);
    const avgBasket = rand(14, 45);
    const totalSpent = Math.round(visitCount * avgBasket * rand(0.85, 1.15) * 100) / 100;
    const loyaltyPoints = Math.max(0, Math.round(totalSpent) - randInt(0, 30));
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}${i}`;
    const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.com`;
    // Étalé dans le temps pour que "nouveaux membres sur la période" (carte
    // de résultats à partager) montre une vraie tendance, pas 0 ou 18 d'un coup.
    const daysSinceJoined = daysSinceLastVisit + randInt(5, 60);
    const createdAt = addDays(TODAY, -daysSinceJoined).toISOString();

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        restaurant_id: restaurantId,
        name,
        email,
        visit_count: visitCount,
        total_spent: totalSpent,
        loyalty_points: loyaltyPoints,
        last_visit_at: addDays(TODAY, -daysSinceLastVisit).toISOString(),
        marketing_consent: true,
        consent_source: "staff",
        consent_at: addDays(TODAY, -daysSinceLastVisit - 10).toISOString(),
        created_at: createdAt,
      })
      .select("id, name, total_spent, created_at")
      .single();
    if (error) throw error;
    created.push({ ...customer, visit_count: visitCount });
  }
  console.log(`  ${N} clients ajoutés.`);
  return created;
}

// Même logique que scripts/seed-demo-account.mjs — voir ce fichier pour le
// détail du raisonnement (taux d'échange sain, revenu de campagne attribué).
async function seedLifecycleEvents(restaurantId, customers) {
  const { count, error: countError } = await supabase
    .from("lifecycle_events")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const rows = [];
  const pushEvent = (customerId, eventType, daysAgo, metadata = {}) => {
    rows.push({
      restaurant_id: restaurantId,
      customer_id: customerId,
      event_type: eventType,
      metadata,
      created_at: addDays(TODAY, -daysAgo).toISOString(),
    });
  };

  for (const c of customers) {
    const joinedDaysAgo = c.created_at
      ? Math.round((TODAY.getTime() - new Date(c.created_at).getTime()) / 86_400_000)
      : randInt(30, 200);
    const visitCount = c.visit_count ?? 0;

    pushEvent(c.id, "qr_code_scanned", joinedDaysAgo);
    pushEvent(c.id, "form_started", joinedDaysAgo);
    pushEvent(c.id, "registration_completed", joinedDaysAgo);
    if (visitCount >= 1) pushEvent(c.id, "first_visit_recognized", Math.max(0, joinedDaysAgo - randInt(1, 4)));
    if (visitCount >= 2) pushEvent(c.id, "second_visit_recognized", Math.max(0, joinedDaysAgo - randInt(5, 20)));

    if (visitCount >= 2 && Math.random() < 0.55) {
      const unlockedDaysAgo = randInt(5, Math.max(6, joinedDaysAgo));
      pushEvent(c.id, "reward_unlocked", unlockedDaysAgo);
      if (Math.random() < 0.55) {
        pushEvent(c.id, "reward_redeemed", Math.max(0, unlockedDaysAgo - randInt(1, 10)));
      }
    }

    if (Math.random() < 0.3) {
      const sentDaysAgo = randInt(2, 45);
      pushEvent(c.id, "campaign_sent", sentDaysAgo);
      pushEvent(c.id, "message_delivered", sentDaysAgo);
      if (Math.random() < 0.45) {
        const avgBasket = visitCount > 0 ? Number(c.total_spent ?? 0) / visitCount : rand(14, 40);
        pushEvent(c.id, "campaign_visit_generated", Math.max(0, sentDaysAgo - randInt(1, 6)), {
          amountSpent: Math.round(Math.max(10, avgBasket) * rand(0.85, 1.2) * 100) / 100,
        });
      }
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from("lifecycle_events").insert(batch);
    if (error) throw error;
  }
}

// Étale created_at pour les clients déjà seedés d'un coup (même logique que
// scripts/seed-demo-account.mjs) — sinon "nouveaux membres sur la période"
// affiche 0 ou le total d'un coup sur la carte de résultats à partager.
async function backfillCustomerJoinDates(restaurantId) {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, visit_count, last_visit_at, created_at, total_spent")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  if (!customers || customers.length === 0) return [];

  // Étalement des dates : uniquement si pas déjà fait (sinon on re-randomise
  // à chaque run). Backfill d'activité : indépendant, sur chaque client qui
  // en a besoin, même si les dates ont déjà été étalées un run précédent.
  const distinctDays = new Set(customers.map((c) => (c.created_at ?? "").slice(0, 10)));
  const shouldSpreadDates = distinctDays.size <= 3;

  const updated = [];
  for (const c of customers) {
    // Certaines succursales (ex: Laval, Vieux-Port) ont été créées par une
    // migration SQL qui n'a jamais rempli visit_count/total_spent/last_visit_at
    // (tout à 0/null) — sans activité, le taux d'activation et la 2e visite
    // restent à 0 % même si la carte de résultats a de vraies données ailleurs.
    const needsActivity = !c.visit_count && !Number(c.total_spent) && !c.last_visit_at;
    if (!needsActivity && !shouldSpreadDates) {
      updated.push(c);
      continue;
    }

    let visitCount = c.visit_count ?? 0;
    let totalSpent = Number(c.total_spent ?? 0);
    let lastVisitAt = c.last_visit_at;
    const patch = {};

    if (needsActivity) {
      visitCount = randInt(3, 20);
      const avgBasket = rand(14, 45);
      totalSpent = Math.round(visitCount * avgBasket * rand(0.85, 1.15) * 100) / 100;
      lastVisitAt = addDays(TODAY, -randInt(1, 45)).toISOString();
      patch.visit_count = visitCount;
      patch.total_spent = totalSpent;
      patch.last_visit_at = lastVisitAt;
      patch.loyalty_points = Math.max(0, Math.round(totalSpent) - randInt(0, 30));
    }

    if (shouldSpreadDates) {
      const lastVisit = lastVisitAt ? new Date(lastVisitAt) : TODAY;
      const daysSinceLastVisit = Math.max(0, Math.round((TODAY.getTime() - lastVisit.getTime()) / 86_400_000));
      const nTx = Math.min(visitCount, 6);
      const daysSinceJoined = daysSinceLastVisit + (nTx > 1 ? (nTx - 1) * randInt(12, 30) : 0) + randInt(5, 60);
      patch.created_at = addDays(TODAY, -daysSinceJoined).toISOString();
    }

    const { error: updateError } = await supabase.from("customers").update(patch).eq("id", c.id);
    if (updateError) throw updateError;
    updated.push({ ...c, ...patch, visit_count: visitCount, total_spent: totalSpent });
  }
  return updated;
}

// Peuple lifecycle_events pour n'importe quel établissement du groupe démo
// qui n'en a pas encore (couvre toutes les succursales, pas seulement
// Québec/Sherbrooke — ex: Laval, Vieux-Port ajoutés par d'autres migrations).
async function seedLifecycleEventsForAllFranchises(workspaceId) {
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  for (const r of restaurants ?? []) {
    // Toujours passé, même si lifecycle_events existe déjà — c'est ce qui
    // comble l'activité manquante (visit_count/total_spent à 0) sur les
    // succursales seedées par une migration SQL plutôt que ce script.
    const customers = await backfillCustomerJoinDates(r.id);
    if (customers.length === 0) continue;

    const { count } = await supabase
      .from("lifecycle_events")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", r.id);
    if (count && count > 0) continue;

    await seedLifecycleEvents(r.id, customers);
    console.log(`  lifecycle_events seedés pour ${r.name} (${customers.length} clients).`);
  }
}

async function main() {
  console.log("Démarrage du seed franchises démo…\n");
  const userId = await ensureDemoUserId();

  const { data: flagship, error: flagshipError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("name", FLAGSHIP_NAME)
    .single();
  if (flagshipError) throw flagshipError;

  const workspaceId = await ensureWorkspace(flagship.id, userId);

  for (const def of NEW_RESTAURANTS) {
    console.log(`\n— ${def.name}`);
    const restaurantId = await ensureRestaurant(def, workspaceId, userId);
    await seedMenu(restaurantId);
    await seedServiceDays(restaurantId, def.revenueRange);
    await seedCustomers(restaurantId);
  }

  console.log("\n— lifecycle_events (toutes les succursales du groupe)");
  await seedLifecycleEventsForAllFranchises(workspaceId);

  console.log("\nTerminé.");
}

main().catch((err) => {
  console.error("Échec du seed :", err);
  process.exit(1);
});
