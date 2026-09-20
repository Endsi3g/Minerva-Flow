// scripts/seed-owner-demo-data.mjs
//
// Popule de façon complète, réaliste et élégante l'espace propriétaire ("côté owner")
// pour les 5 établissements du groupe démo Minerva Flow :
// 1. Minerva Flow (Montréal - Flagship)
// 2. Minerva Flow — Démo (Vieux-Port)
// 3. Minerva Flow — Démo (Laval)
// 4. Minerva Flow — Démo (Québec)
// 5. Minerva Flow — Démo (Sherbrooke)
//
// Tables peuplées :
// - suppliers (Fournisseurs québécois)
// - inventory_items (15 ingrédients/fournitures avec seuils par & alertes de stock bas)
// - employees (Équipe opérationnelle avec taux horaires et rôles)
// - service_days (Du 1er août au 18 septembre 2026 pour calculs mensuels parfaits)
// - orders & order_items (Commandes récentes : soumise, en_preparation, prete, servie)
// - financial_transactions (Recettes et dépenses de septembre 2026 pour le graphe de rentabilité)
// - loyalty_rewards & offers (Catalogue de fidélité et offres actives)
// - restaurant_reviews (Avis clients récents 4-5 étoiles avec réponses de la direction)
//
// Exécution : node scripts/seed-owner-demo-data.mjs

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_WORKSPACE_ID = "7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d";
const TODAY = new Date("2026-09-18T14:30:00-04:00");

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.round(rand(min, max));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

const FIRST_NAMES = [
  "Mathieu", "Sophie", "Alexandre", "Camille", "Félix", "Laurie",
  "Gabriel", "Chloé", "Émilie", "Antoine", "Rosalie", "Jean-Philippe",
  "Marc-André", "Sandrine", "Nicolas", "David", "Gabrielle", "Maxime"
];

const LAST_NAMES = [
  "Tremblay", "Gagnon", "Roy", "Côté", "Bouchard", "Gauthier",
  "Morin", "Lavoie", "Fortin", "Gagné", "Bélanger", "Pelletier",
  "Lévesque", "Bergeron", "Cloutier"
];

const SUPPLIER_TEMPLATES = [
  {
    name: "Sysco Québec",
    contact_name: "Jean-Marc Lemieux",
    phone: "514-555-0142",
    email: "commandes.qc@sysco.ca",
    category: "Alimentation générale",
  },
  {
    name: "Gordon Food Service (GFS)",
    contact_name: "Valérie Simard",
    phone: "514-555-0188",
    email: "commandes@gfsquebec.com",
    category: "Produits frais & viandes",
  },
  {
    name: "Fromagerie Saint-Guillaume",
    contact_name: "Pascal Desrosiers",
    phone: "819-555-0133",
    email: "distribution@st-guillaume.qc.ca",
    category: "Produits laitiers",
  },
  {
    name: "Torréfaction Saint-Henri",
    contact_name: "Sébastien Lapointe",
    phone: "514-555-0199",
    email: "pro@sainthenri.ca",
    category: "Café de spécialité & barista",
  },
  {
    name: "Emballages Cascades Pro",
    contact_name: "Isabelle Dufour",
    phone: "450-555-0177",
    email: "service.client@cascades.com",
    category: "Fournitures & emballages",
  },
];

const INVENTORY_TEMPLATES = [
  {
    name: "Fromage en grains frais du jour",
    category: "Produits laitiers",
    unit: "kg",
    par_level: 20,
    quantity_on_hand: 14, // Alerte stock bas
    unit_cost: 11.50,
    supplierKeyword: "Fromagerie",
  },
  {
    name: "Pommes de terre Russet de l'Île",
    category: "Légumes",
    unit: "sac 25 kg",
    par_level: 10,
    quantity_on_hand: 13,
    unit_cost: 18.00,
    supplierKeyword: "Sysco",
  },
  {
    name: "Bœuf haché Angus AAA",
    category: "Viandes & volailles",
    unit: "kg",
    par_level: 25,
    quantity_on_hand: 9, // Alerte stock bas
    unit_cost: 14.75,
    supplierKeyword: "Gordon",
  },
  {
    name: "Lait 2% Québon",
    category: "Produits laitiers",
    unit: "caisse 12L",
    par_level: 8,
    quantity_on_hand: 11,
    unit_cost: 24.50,
    supplierKeyword: "Fromagerie",
  },
  {
    name: "Lait d'avoine Barista Oatbox",
    category: "Épicerie sèche",
    unit: "caisse 12L",
    par_level: 6,
    quantity_on_hand: 8,
    unit_cost: 38.00,
    supplierKeyword: "Torréfaction",
  },
  {
    name: "Farine non blanchie La Milanaise",
    category: "Boulangerie",
    unit: "sac 20 kg",
    par_level: 5,
    quantity_on_hand: 7,
    unit_cost: 22.00,
    supplierKeyword: "Sysco",
  },
  {
    name: "Huile de canola québécoise",
    category: "Épicerie sèche",
    unit: "bidon 16L",
    par_level: 4,
    quantity_on_hand: 5,
    unit_cost: 42.50,
    supplierKeyword: "Sysco",
  },
  {
    name: "Grains espresso Assemblage Holy Cow",
    category: "Café & boissons",
    unit: "kg",
    par_level: 12,
    quantity_on_hand: 15,
    unit_cost: 28.00,
    supplierKeyword: "Torréfaction",
  },
  {
    name: "Sirop d'érable pur ambré",
    category: "Épicerie sucrée",
    unit: "conserve 8x540ml",
    par_level: 6,
    quantity_on_hand: 8,
    unit_cost: 52.00,
    supplierKeyword: "Sysco",
  },
  {
    name: "Sauce brune poutine maison",
    category: "Sauces & condiments",
    unit: "seau 10L",
    par_level: 6,
    quantity_on_hand: 3, // Alerte stock bas
    unit_cost: 31.00,
    supplierKeyword: "Sysco",
  },
  {
    name: "Pains briochés artisanaux",
    category: "Boulangerie",
    unit: "caisse 48",
    par_level: 6,
    quantity_on_hand: 8,
    unit_cost: 36.00,
    supplierKeyword: "Sysco",
  },
  {
    name: "Filet de saumon de l'Atlantique",
    category: "Poissons & fruits de mer",
    unit: "kg",
    par_level: 10,
    quantity_on_hand: 12,
    unit_cost: 26.50,
    supplierKeyword: "Gordon",
  },
  {
    name: "Poitrines de poulet de grain",
    category: "Viandes & volailles",
    unit: "kg",
    par_level: 16,
    quantity_on_hand: 19,
    unit_cost: 13.25,
    supplierKeyword: "Gordon",
  },
  {
    name: "Boîtes kraft compostables",
    category: "Emballages",
    unit: "boîte 200",
    par_level: 5,
    quantity_on_hand: 6,
    unit_cost: 48.00,
    supplierKeyword: "Emballages",
  },
  {
    name: "Serviettes en papier recyclé",
    category: "Fournitures",
    unit: "caisse 2000",
    par_level: 4,
    quantity_on_hand: 5,
    unit_cost: 32.00,
    supplierKeyword: "Emballages",
  },
];

const EMPLOYEE_TEMPLATES = [
  {
    fullName: "Mathieu Tremblay",
    roleTitle: "Chef exécutif",
    hourlyWage: 28.50,
    description: "Responsable de la cuisine et des approvisionnements.",
    phone: "514-555-0211",
  },
  {
    fullName: "Sophie Gagnon",
    roleTitle: "Sous-cheffe de cuisine",
    hourlyWage: 22.50,
    description: "Coordination des services du soir et fiches techniques.",
    phone: "514-555-0222",
  },
  {
    fullName: "Alexandre Roy",
    roleTitle: "Cuisinier de ligne",
    hourlyWage: 19.50,
    description: "Poste chaud, cuisson des viandes et assemblage.",
    phone: "514-555-0233",
  },
  {
    fullName: "Camille Bouchard",
    roleTitle: "Responsable de salle & bar",
    hourlyWage: 21.00,
    description: "Gestion du service client, réservations et cocktails.",
    phone: "514-555-0244",
  },
  {
    fullName: "Félix Lavoie",
    roleTitle: "Barista & service comptoir",
    hourlyWage: 17.50,
    description: "Service des boissons de spécialité et encaissement.",
    phone: "514-555-0255",
  },
  {
    fullName: "Laurie Côté",
    roleTitle: "Aide-cuisine & plonge",
    hourlyWage: 16.50,
    description: "Hygiène, préparation préliminaire et réception marchandises.",
    phone: "514-555-0266",
  },
];

const REVIEWS_TEMPLATES = [
  {
    rating: 5,
    comment: "Ambiance chaleureuse, service impeccable et poutine signature incroyable ! Les points fidélité sur le pass Apple Wallet sont super fluides.",
    ownerResponse: "Merci beaucoup pour vos chaleureux mots ! Au plaisir de vous recevoir à nouveau très bientôt.",
  },
  {
    rating: 5,
    comment: "Le meilleur café allongé du quartier, et les croissants frais du matin valent vraiment le détour.",
    ownerResponse: "Ravi que notre café vous plaise ! Notre équipe barista met tout son cœur à chaque extraction.",
  },
  {
    rating: 4,
    comment: "Très bonne expérience pour notre dîner d'équipe. Service rapide et portions généreuses. On reviendra assurément !",
    ownerResponse: "Un grand merci à toute votre équipe ! Nous serons ravis de vous réaccueillir.",
  },
  {
    rating: 5,
    comment: "Une régularité remarquable dans la qualité des plats. Les desserts maison sont un pur régal.",
    ownerResponse: null, // Laissé vide pour permettre au propriétaire de répondre via la vue iOS !
  },
  {
    rating: 4,
    comment: "Menu très varié avec de belles options santé le midi. Terrasse agréable en fin de journée.",
    ownerResponse: null, // Laissé vide pour test de réponse
  },
  {
    rating: 5,
    comment: "L'application et le système de fidélité sont géniaux : on a débloqué notre récompense sans friction au comptoir.",
    ownerResponse: "Merci infiniment ! Nous sommes ravis que l'expérience digitale soit à la hauteur de notre cuisine.",
  },
];

const REWARD_TEMPLATES = [
  { name: "Café de spécialité offert", pointsCost: 50, description: "Valable sur tous nos cafés chauds et froids de la carte." },
  { name: "Poutine classique offerte", pointsCost: 110, description: "Format régulier avec fromage frais du jour." },
  { name: "Dessert maison au choix", pointsCost: 80, description: "Crème brûlée, tarte de saison ou pâtisserie du jour." },
  { name: "Rabais de 15 $ sur l'addition", pointsCost: 150, description: "Applicable dès 30 $ d'achat sur l'ensemble du menu." },
];

const OFFER_TEMPLATES = [
  {
    title: "Formule Midi Express — 18,50 $",
    description: "Plat du jour + café allongé ou boisson fraîche, servi en moins de 15 minutes.",
    price: 18.50,
  },
  {
    title: "Duo Soirée Bistro — 45,00 $",
    description: "Deux plats principaux au choix avec deux verres de vin sélectionnés.",
    price: 45.00,
  },
];

async function seedSuppliers(restaurantId) {
  const { data: existing } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  const existingNames = new Set((existing ?? []).map((s) => s.name));
  const createdSuppliers = [...(existing ?? [])];

  for (const t of SUPPLIER_TEMPLATES) {
    if (existingNames.has(t.name)) continue;
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        restaurant_id: restaurantId,
        name: t.name,
        contact_name: t.contact_name,
        phone: t.phone,
        email: t.email,
        category: t.category,
      })
      .select("id, name")
      .single();

    if (error) {
      console.warn(`    ⚠️ Fournisseur ${t.name} non inséré:`, error.message);
    } else {
      createdSuppliers.push(data);
    }
  }

  return createdSuppliers;
}

async function seedInventory(restaurantId, suppliers) {
  const { data: existing } = await supabase
    .from("inventory_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  const existingNames = new Set((existing ?? []).map((i) => i.name));
  const toInsert = [];

  for (const item of INVENTORY_TEMPLATES) {
    if (existingNames.has(item.name)) continue;
    const matchedSupplier = suppliers.find((s) => s.name.includes(item.supplierKeyword)) || suppliers[0];
    toInsert.push({
      restaurant_id: restaurantId,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity_on_hand: item.quantity_on_hand,
      par_level: item.par_level,
      unit_cost: item.unit_cost,
      supplier_id: matchedSupplier ? matchedSupplier.id : null,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("inventory_items").insert(toInsert);
    if (error) console.error("    ❌ Erreur insertion inventaire:", error.message);
    else console.log(`    📦 ${toInsert.length} articles d'inventaire insérés.`);
  } else {
    console.log(`    📦 Inventaire déjà complet (${existing?.length || 0} articles).`);
  }
}

async function seedEmployees(restaurantId) {
  const { data: existing } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("restaurant_id", restaurantId);

  const existingNames = new Set((existing ?? []).map((e) => e.full_name));
  const toInsert = [];

  for (const emp of EMPLOYEE_TEMPLATES) {
    if (existingNames.has(emp.fullName)) continue;
    const emailPrefix = emp.fullName.toLowerCase().replace(/[^a-z0-9]+/g, ".");
    toInsert.push({
      restaurant_id: restaurantId,
      full_name: emp.fullName,
      role_title: emp.roleTitle,
      hourly_wage: emp.hourlyWage,
      active: true,
      description: emp.description,
      contact_phone: emp.phone,
      contact_email: `${emailPrefix}@minervaflow.demo`,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("employees").insert(toInsert);
    if (error) console.error("    ❌ Erreur insertion employés:", error.message);
    else console.log(`    👥 ${toInsert.length} employés insérés.`);
  } else {
    console.log(`    👥 Équipe déjà complète (${existing?.length || 0} employés).`);
  }
}

async function seedServiceDays(restaurantId, revenueRange) {
  // Remplissage du 1er août au 18 septembre 2026 (48 jours)
  const fromDate = new Date("2026-08-01T00:00:00-04:00");
  const { data: existing } = await supabase
    .from("service_days")
    .select("date")
    .eq("restaurant_id", restaurantId)
    .gte("date", toDateStr(fromDate));

  const existingDates = new Set((existing ?? []).map((d) => d.date));
  const rows = [];

  let cur = new Date(fromDate);
  while (cur <= TODAY) {
    const dateStr = toDateStr(cur);
    if (!existingDates.has(dateStr)) {
      const dow = cur.getDay(); // 0 = dim, 5 = ven, 6 = sam
      const isWeekend = dow === 5 || dow === 6 || dow === 0;
      const boost = isWeekend ? 1.35 : 1.0;
      const baseRev = rand(revenueRange[0], revenueRange[1]) * boost;
      const revenue = Math.round(baseRev * 100) / 100;
      const expenses = Math.round(revenue * rand(0.30, 0.38) * 100) / 100;
      const reservationCount = Math.round(revenue / rand(38, 55));

      rows.push({
        restaurant_id: restaurantId,
        date: dateStr,
        revenue,
        expenses,
        reservation_count: reservationCount,
        main_source: pick(["salle", "salle", "livraison", "reservation"]),
        rush_level: isWeekend ? "rush" : "normal",
        events: isWeekend ? ["Service terrasse", "Affluence soirée"] : [],
        notes: isWeekend ? "Forte fréquentation fin de semaine." : "Service régulier.",
        promo_active: isWeekend,
        menu_change: false,
        reviewed: true,
      });
    }
    cur = addDays(cur, 1);
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("service_days").insert(rows);
    if (error) console.error("    ❌ Erreur insertion journées de service:", error.message);
    else console.log(`    📅 ${rows.length} journées de service ajoutées (jusqu'au 18 septembre 2026).`);
  } else {
    console.log(`    📅 Journées de service déjà à jour.`);
  }
}

async function seedOrders(restaurantId) {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .gte("created_at", "2026-09-01T00:00:00Z");

  if (count && count >= 12) {
    console.log(`    🛒 Commandes de septembre déjà présentes (${count}).`);
    return;
  }

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .eq("restaurant_id", restaurantId)
    .eq("active", true);

  if (!menuItems || menuItems.length === 0) {
    console.warn("    ⚠️ Aucun plat de menu pour générer les commandes.");
    return;
  }

  const ORDER_SPECS = [
    // 4 commandes "live" d'aujourd'hui (18 sept 2026)
    { status: "soumise", minutesAgo: 8, name: "Jean-Philippe Tremblay", phone: "+15145550301", mode: "sur_place" },
    { status: "en_preparation", minutesAgo: 22, name: "Chloé Bouchard", phone: "+15145550302", mode: "immediat" },
    { status: "en_preparation", minutesAgo: 35, name: "Marc-Antoine Gagnon", phone: "+14505550303", mode: "sur_place" },
    { status: "prete", minutesAgo: 48, name: "Émilie Cloutier", phone: "+15145550304", mode: "immediat" },
    // Commandes des jours précédents de septembre
    { status: "servie", daysAgo: 1, name: "Alexandre Roy", phone: "+15145550305", mode: "sur_place" },
    { status: "servie", daysAgo: 1, name: "Laurie Fortin", phone: "+14185550306", mode: "sur_place" },
    { status: "servie", daysAgo: 2, name: "David Lévesque", phone: "+15145550307", mode: "prep_apres_paiement" },
    { status: "servie", daysAgo: 3, name: "Sophie Pelletier", phone: "+14505550308", mode: "sur_place" },
    { status: "servie", daysAgo: 4, name: "Gabriel Bélanger", phone: "+18195550309", mode: "sur_place" },
    { status: "servie", daysAgo: 5, name: "Rosalie Gauthier", phone: "+15145550310", mode: "immediat" },
    { status: "servie", daysAgo: 7, name: "Nicolas Côté", phone: "+14185550311", mode: "sur_place" },
    { status: "servie", daysAgo: 9, name: "Sandrine Morin", phone: "+15145550312", mode: "sur_place" },
    { status: "servie", daysAgo: 12, name: "Mathieu Bergeron", phone: "+14505550313", mode: "prep_apres_paiement" },
  ];

  let insertedOrders = 0;

  for (const spec of ORDER_SPECS) {
    let createdAtDate;
    if (spec.minutesAgo != null) {
      createdAtDate = new Date(TODAY.getTime() - spec.minutesAgo * 60 * 1000);
    } else {
      createdAtDate = addDays(TODAY, -spec.daysAgo);
      createdAtDate.setHours(randInt(11, 21), randInt(0, 59), 0);
    }

    // Choisir 1 à 3 plats
    const numItems = randInt(1, 3);
    const chosenItems = [];
    let subtotal = 0;

    for (let i = 0; i < numItems; i++) {
      const item = pick(menuItems);
      const qty = randInt(1, 2);
      chosenItems.push({
        menu_item_id: item.id,
        item_name: item.name,
        unit_price: item.price,
        quantity: qty,
      });
      subtotal += item.price * qty;
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.14975 * 100) / 100;
    const tipAmount = spec.mode === "sur_place" ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
    const total = Math.round((subtotal + taxAmount + tipAmount) * 100) / 100;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        status: spec.status,
        guest_name: spec.name,
        guest_phone: spec.phone,
        subtotal,
        tax_amount: taxAmount,
        tip_amount: tipAmount,
        total,
        fulfillment_mode: spec.mode,
        payment_status: spec.status === "servie" ? "paye" : "non_requis",
        created_at: createdAtDate.toISOString(),
      })
      .select("id")
      .single();

    if (orderError) {
      console.warn("    ⚠️ Erreur commande:", orderError.message);
      continue;
    }

    const itemRows = chosenItems.map((ci) => ({
      order_id: order.id,
      menu_item_id: ci.menu_item_id,
      item_name: ci.item_name,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
    }));

    await supabase.from("order_items").insert(itemRows);
    insertedOrders++;
  }

  console.log(`    🛒 ${insertedOrders} commandes insérées avec leurs articles.`);
}

async function seedFinancialTransactions(restaurantId) {
  const { count } = await supabase
    .from("financial_transactions")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .gte("date", "2026-09-01");

  if (count && count >= 8) {
    console.log(`    💳 Transactions de septembre déjà présentes (${count}).`);
    return;
  }

  const TX_TEMPLATES = [
    { date: "2026-09-17", desc: "Encaissement TPE — service du soir", amount: 3420.50, dir: "in", cat: "Ventes en salle" },
    { date: "2026-09-16", desc: "Encaissement TPE — service midi & terrasse", amount: 2150.00, dir: "in", cat: "Ventes en salle" },
    { date: "2026-09-15", desc: "Règlement hebdomadaire Uber Eats", amount: 890.40, dir: "in", cat: "Livraison (commissions)" },
    { date: "2026-09-15", desc: "Facture Sysco Québec — viandes et épicerie", amount: -1245.80, dir: "out", cat: "Fournisseurs" },
    { date: "2026-09-14", desc: "Encaissement TPE — brunch dimanche", amount: 2980.00, dir: "in", cat: "Ventes en salle" },
    { date: "2026-09-14", desc: "Salaires équipe — première quinzaine septembre", amount: -7650.00, dir: "out", cat: "Personnel" },
    { date: "2026-09-12", desc: "Facture Fromagerie Saint-Guillaume — fromage frais", amount: -460.00, dir: "out", cat: "Fournisseurs" },
    { date: "2026-09-10", desc: "Règlement DoorDash hebdomadaire", amount: 412.30, dir: "in", cat: "Livraison (commissions)" },
    { date: "2026-09-08", desc: "Facture Torréfaction Saint-Henri — café espresso", amount: -380.00, dir: "out", cat: "Fournisseurs" },
    { date: "2026-09-05", desc: "Fournitures et emballages Cascades", amount: -290.00, dir: "out", cat: "Fournisseurs" },
    { date: "2026-09-03", desc: "Facture Hydro-Québec — électricité commerciale", amount: -485.50, dir: "out", cat: "Utilities" },
    { date: "2026-09-01", desc: "Loyer commercial — bail mensuel septembre 2026", amount: -3200.00, dir: "out", cat: "Loyer & charges" },
    { date: "2026-09-01", desc: "Abonnement logiciel de caisse & terminaux", amount: -79.00, dir: "out", cat: "Logiciels" },
  ];

  const rows = TX_TEMPLATES.map((tx) => ({
    restaurant_id: restaurantId,
    date: tx.date,
    description: tx.desc,
    amount: tx.amount,
    direction: tx.dir,
    category: tx.cat,
    source_account: "Compte opérationnel Desjardins",
    reviewed: true,
  }));

  const { error } = await supabase.from("financial_transactions").insert(rows);
  if (error) console.error("    ❌ Erreur insertion transactions:", error.message);
  else console.log(`    💳 ${rows.length} transactions financières insérées.`);
}

async function seedReviews(restaurantId) {
  const { count } = await supabase
    .from("restaurant_reviews")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if (count && count >= 4) {
    console.log(`    ⭐ Avis clients déjà présents (${count}).`);
    return;
  }

  const { data: customers } = await supabase
    .from("customers")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .limit(REVIEWS_TEMPLATES.length);

  if (!customers || customers.length === 0) {
    console.warn("    ⚠️ Aucun client disponible pour associer les avis.");
    return;
  }

  let insertedReviews = 0;
  for (let i = 0; i < Math.min(REVIEWS_TEMPLATES.length, customers.length); i++) {
    const t = REVIEWS_TEMPLATES[i];
    const customer = customers[i];
    const daysAgo = (i + 1) * 3;
    const createdAt = addDays(TODAY, -daysAgo).toISOString();

    const { error } = await supabase
      .from("restaurant_reviews")
      .upsert(
        {
          restaurant_id: restaurantId,
          customer_id: customer.id,
          rating: t.rating,
          comment: t.comment,
          owner_response: t.ownerResponse,
          owner_responded_at: t.ownerResponse ? addDays(TODAY, -daysAgo + 1).toISOString() : null,
          created_at: createdAt,
          visibility: "public",
        },
        { onConflict: "restaurant_id,customer_id" }
      );

    if (!error) insertedReviews++;
  }

  console.log(`    ⭐ ${insertedReviews} avis clients récents enregistrés.`);
}

async function seedRewardsAndOffers(restaurantId) {
  // 1. Rewards
  const { count: rewardCount } = await supabase
    .from("loyalty_rewards")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if (!rewardCount || rewardCount === 0) {
    const rows = REWARD_TEMPLATES.map((r) => ({
      restaurant_id: restaurantId,
      name: r.name,
      points_cost: r.pointsCost,
      description: r.description,
      active: true,
    }));
    await supabase.from("loyalty_rewards").insert(rows);
    console.log(`    🎁 ${rows.length} récompenses fidélité ajoutées.`);
  }

  // 2. Offers
  const { count: offerCount } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if (!offerCount || offerCount === 0) {
    const rows = OFFER_TEMPLATES.map((o) => ({
      restaurant_id: restaurantId,
      title: o.title,
      description: o.description,
      price: o.price,
      active: true,
      starts_at: "2026-09-01T00:00:00Z",
      ends_at: "2026-10-31T23:59:59Z",
    }));
    await supabase.from("offers").insert(rows);
    console.log(`    🏷️ ${rows.length} offres promotionnelles ajoutées.`);
  }
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`✨ Peuplement de l'Espace Propriétaire (Minerva Flow)`);
  console.log(`📅 Date de référence : ${toDateStr(TODAY)} (Septembre 2026)`);
  console.log(`======================================================\n`);

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, city, workspace_id")
    .eq("workspace_id", DEMO_WORKSPACE_ID)
    .order("name");

  if (error) throw error;
  if (!restaurants || restaurants.length === 0) {
    console.error("❌ Aucun restaurant trouvé pour le workspace démo.");
    process.exit(1);
  }

  console.log(`🏬 ${restaurants.length} établissements démo trouvés :`);

  // Fourchettes de revenus journaliers par établissement
  const revenueRanges = {
    "Minerva Flow": [2800, 4400],
    "Minerva Flow — Démo (Vieux-Port)": [2400, 3800],
    "Minerva Flow — Démo (Laval)": [2100, 3400],
    "Minerva Flow — Démo (Québec)": [1700, 2900],
    "Minerva Flow — Démo (Sherbrooke)": [1100, 2200],
  };

  for (const r of restaurants) {
    console.log(`\n--- [${r.name}] (${r.city}) ---`);
    const range = revenueRanges[r.name] || [1800, 3000];

    // 1. Fournisseurs
    const suppliers = await seedSuppliers(r.id);

    // 2. Inventaire
    await seedInventory(r.id, suppliers);

    // 3. Employés
    await seedEmployees(r.id);

    // 4. Journées de service (août & septembre 2026)
    await seedServiceDays(r.id, range);

    // 5. Commandes en cours & récentes
    await seedOrders(r.id);

    // 6. Transactions financières
    await seedFinancialTransactions(r.id);

    // 7. Avis clients et réponses
    await seedReviews(r.id);

    // 8. Récompenses fidélité et offres
    await seedRewardsAndOffers(r.id);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 Peuplement terminé avec succès pour tous les établissements !`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("❌ Erreur générale :", err);
  process.exit(1);
});
