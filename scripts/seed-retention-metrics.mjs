// scripts/seed-retention-metrics.mjs
//
// Popule les métriques de fidélisation et de rétention sur 30 jours (du 20 août au 18 septembre 2026)
// pour les 5 restaurants du groupe démo Minerva Flow :
// - Minerva Flow — Démo (Sherbrooke)
// - Minerva Flow — Démo (Laval)
// - Minerva Flow — Démo (Vieux-Port)
// - Minerva Flow — Démo (Québec)
// - Minerva Flow (Montréal)
//
// Aligné sur les ratios d'excellence Minerva Flow (GEMINI.md) :
// - Rétention 2e visite : 75 % - 85 %
// - Nouveaux membres 30j : 28 - 35 membres par établissement
// - Ventes incrémentales fidélité : 2 100 $ à 3 600 $
// - Rétention 30 jours : 75 % - 88 %
//
// Exécution : node scripts/seed-retention-metrics.mjs

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
const RAYAN_USER_ID = "85ba42a6-87aa-4b68-ade7-95ba8b6baede";

const RESTAURANT_IDS = [
  "b452094e-82d8-46b8-a68d-0d8a78e702b9", // Sherbrooke
  "b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b", // Laval
  "c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c", // Vieux-Port
  "d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e", // Québec
  "60a59423-c7a0-4d92-a866-3058f34c17d1", // Montréal Flagship
];

const FIRST_NAMES = [
  "Audrey", "Mathieu", "Camille", "Alexandre", "Sophie", "Guillaume",
  "Florence", "Maxime", "Juliette", "Étienne", "Béatrice", "Nicolas",
  "Rose", "Olivier", "Gabrielle", "Samuel", "Chloé", "Félix",
  "Émilie", "Antoine", "Rosalie", "Jean-Philippe", "Laurie", "David",
  "Sandrine", "Marc-André", "Laurence", "Simon", "Valérie", "Vincent"
];

const LAST_NAMES = [
  "Bouchard", "Tremblay", "Gagnon", "Roy", "Côté", "Gauthier",
  "Morin", "Lavoie", "Fortin", "Gagné", "Bélanger", "Pelletier",
  "Lévesque", "Bergeron", "Leblanc", "Paquette", "Dufour", "Girard",
  "Simard", "Cloutier"
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

async function ensureWorkspaceAccess() {
  console.log("🔒 Vérification de l'accès au workspace démo pour Rayan...");
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", DEMO_WORKSPACE_ID)
    .eq("user_id", RAYAN_USER_ID)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: DEMO_WORKSPACE_ID,
      user_id: RAYAN_USER_ID,
      role: "owner",
      status: "active",
    });
    if (error) {
      console.warn("⚠️ Impossible d'ajouter Rayan au workspace démo :", error.message);
    } else {
      console.log("✅ Rayan rattaché comme propriétaire du workspace démo.");
    }
  } else {
    console.log("✅ Accès workspace déjà configuré pour Rayan.");
  }
}

async function seedRestaurantRetention(restaurantId) {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", restaurantId)
    .single();

  const name = restaurant?.name || restaurantId;
  console.log(`\n📍 Traitement de l'établissement : ${name}`);

  // 1. Clients récents sur les 30 derniers jours (du 20 août au 17 septembre 2026)
  const { count: recentCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .gte("created_at", "2026-08-20T00:00:00Z");

  let createdCustomers = [];
  const targetNewCustomers = 30;
  const needToAdd = Math.max(0, targetNewCustomers - (recentCount || 0));

  if (needToAdd > 0) {
    console.log(`  ➕ Insertion de ${needToAdd} nouveaux clients récents (cohorte 30 jours)...`);
    const customersToInsert = [];
    for (let i = 0; i < needToAdd; i++) {
      const fName = pick(FIRST_NAMES);
      const lName = pick(LAST_NAMES);
      const daysAgo = randInt(1, 28);
      const createdAt = new Date(Date.now() - daysAgo * 86_400_000);
      
      // Rétention 2e visite ciblée à ~80%
      const isRepeat = Math.random() < 0.82;
      const visitCount = isRepeat ? randInt(2, 6) : 1;
      const avgSpendPerVisit = rand(24, 48);
      const totalSpent = Math.round(visitCount * avgSpendPerVisit * 100) / 100;
      const lastVisitDaysAgo = Math.min(daysAgo, randInt(0, 10));
      const lastVisitAt = new Date(Date.now() - lastVisitDaysAgo * 86_400_000);

      const phone = `514-555-${String(randInt(1000, 9999))}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${randInt(10, 99)}@example.ca`;

      customersToInsert.push({
        restaurant_id: restaurantId,
        name: `${fName} ${lName}`,
        email,
        phone,
        visit_count: visitCount,
        total_spent: totalSpent,
        loyalty_points: visitCount * randInt(20, 50),
        last_visit_at: lastVisitAt.toISOString(),
        created_at: createdAt.toISOString(),
        marketing_consent: true,
        consent_source: "qr_code",
        consent_at: createdAt.toISOString(),
        notification_frequency: "all",
      });
    }

    const { data: inserted, error: custError } = await supabase
      .from("customers")
      .insert(customersToInsert)
      .select("id, name, visit_count, created_at, last_visit_at");

    if (custError) {
      console.error("  ❌ Erreur insertion clients :", custError.message);
    } else {
      createdCustomers = inserted || [];
      console.log(`  ✅ ${createdCustomers.length} clients créés avec succès.`);
    }
  }

  // Récupérer tous les clients de ce restaurant pour générer événements et envois
  const { data: allCustomers } = await supabase
    .from("customers")
    .select("id, name, visit_count, created_at, last_visit_at")
    .eq("restaurant_id", restaurantId);

  const customerPool = allCustomers || [];
  if (customerPool.length === 0) return;

  // 2. Lifecycle Events récents (30 derniers jours)
  const { count: existingEventsCount } = await supabase
    .from("lifecycle_events")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .gte("created_at", "2026-08-20T00:00:00Z");

  if ((existingEventsCount || 0) < 50) {
    console.log(`  ⚡ Génération d'événements de cycle de vie (funnel de rétention)...`);
    const eventsToInsert = [];

    // Scans & Inscriptions
    for (let i = 0; i < 65; i++) {
      const daysAgo = randInt(1, 28);
      const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
      eventsToInsert.push({
        restaurant_id: restaurantId,
        event_type: "qr_code_scanned",
        created_at: date,
        metadata: { source: "table_tent" },
      });
    }

    for (let i = 0; i < 45; i++) {
      const daysAgo = randInt(1, 28);
      const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
      eventsToInsert.push({
        restaurant_id: restaurantId,
        event_type: "form_started",
        created_at: date,
        metadata: {},
      });
    }

    // Événements liés aux clients existants
    for (const c of customerPool) {
      const cDate = new Date(c.created_at || Date.now());
      eventsToInsert.push({
        restaurant_id: restaurantId,
        customer_id: c.id,
        event_type: "registration_completed",
        created_at: cDate.toISOString(),
        metadata: { customerName: c.name },
      });

      if (c.visit_count >= 1) {
        eventsToInsert.push({
          restaurant_id: restaurantId,
          customer_id: c.id,
          event_type: "first_visit_recognized",
          created_at: new Date(cDate.getTime() + 3_600_000).toISOString(),
          metadata: { customerName: c.name },
        });
      }

      if (c.visit_count >= 2) {
        const v2Date = new Date(cDate.getTime() + randInt(3, 14) * 86_400_000);
        eventsToInsert.push({
          restaurant_id: restaurantId,
          customer_id: c.id,
          event_type: "second_visit_recognized",
          created_at: v2Date.toISOString(),
          metadata: { customerName: c.name },
        });
      }
    }

    // Campagnes & Ventes attribuées (8 à 12 visites générées avec montant dépensé)
    for (let i = 0; i < 10; i++) {
      const targetCust = pick(customerPool);
      const daysAgo = randInt(2, 16);
      const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
      const amountSpent = randInt(35, 88);

      eventsToInsert.push({
        restaurant_id: restaurantId,
        customer_id: targetCust.id,
        event_type: "campaign_visit_generated",
        created_at: date,
        metadata: {
          customerName: targetCust.name,
          amountSpent,
          campaignName: "Retour Gourmand du Dimanche",
        },
      });
    }

    // Batch insert
    const chunkSize = 50;
    for (let i = 0; i < eventsToInsert.length; i += chunkSize) {
      const chunk = eventsToInsert.slice(i, i + chunkSize);
      await supabase.from("lifecycle_events").insert(chunk);
    }
    console.log(`  ✅ ${eventsToInsert.length} événements de cycle de vie créés.`);
  }

  // 3. Customer Retention Sends (15 à 20 relances sur les 14 derniers jours)
  const { count: sendsCount } = await supabase
    .from("customer_retention_sends")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  const selectedForSends = customerPool.slice(0, 18);

  if ((sendsCount || 0) < 10) {
    console.log(`  ✉️ Création des envois de relance automatique (customer_retention_sends)...`);
    const retentionSendsToInsert = [];
    for (const c of selectedForSends) {
      const sendDaysAgo = randInt(3, 13);
      const sentAt = new Date(Date.now() - sendDaysAgo * 86_400_000).toISOString();
      retentionSendsToInsert.push({
        restaurant_id: restaurantId,
        customer_id: c.id,
        trigger_type: pick(["inactivity", "value_drift", "birthday", "reward_available"]),
        channel: pick(["sms", "email"]),
        sent_at: sentAt,
      });
    }

    const { data: insertedSends, error: sendErr } = await supabase
      .from("customer_retention_sends")
      .insert(retentionSendsToInsert)
      .select();

    if (sendErr) {
      console.error("  ❌ Erreur insertion sends :", sendErr.message);
    } else {
      console.log(`  ✅ ${insertedSends?.length || 0} relances de fidélisation enregistrées.`);
    }
  }

  // 4. Loyalty Transactions (35 à 45 transactions "visite" générant le CA incrémental)
  const { count: txCount } = await supabase
    .from("loyalty_transactions")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if ((txCount || 0) < 15) {
    console.log(`  💳 Génération de l'historique de transactions fidélité (visites & CA)...`);
    const transactionsToInsert = [];

    // Transactions consécutives aux relances (pour calcul getIncrementalRetentionRevenue)
    for (const c of selectedForSends) {
      const daysAgo = randInt(1, 8);
      const txDate = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
      const amountSpent = randInt(38, 92);
      transactionsToInsert.push({
        restaurant_id: restaurantId,
        customer_id: c.id,
        type: "visite",
        amount_spent: amountSpent,
        points_delta: Math.round(amountSpent * 1.5),
        note: "Visite enregistrée au comptoir (suite à notification de relance)",
        created_at: txDate,
      });
    }

    // Autres visites régulières
    for (const c of customerPool) {
      if (Math.random() < 0.6) {
        const daysAgo = randInt(2, 25);
        const txDate = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
        const amountSpent = randInt(22, 65);
        transactionsToInsert.push({
          restaurant_id: restaurantId,
          customer_id: c.id,
          type: "visite",
          amount_spent: amountSpent,
          points_delta: Math.round(amountSpent * 1.5),
          note: "Visite membre fidélité",
          created_at: txDate,
        });
      }
    }

    const { data: insertedTx, error: txErr } = await supabase
      .from("loyalty_transactions")
      .insert(transactionsToInsert)
      .select();

    if (txErr) {
      console.error("  ❌ Erreur insertion transactions :", txErr.message);
    } else {
      console.log(`  ✅ ${insertedTx?.length || 0} transactions fidélité créées.`);
    }
  }

  // 5. Clôture de journée aujourd'hui (2026-09-18) pour s'assurer que Ventes du jour est positive
  const todayStr = "2026-09-18";
  const { data: existingDay } = await supabase
    .from("service_days")
    .select("id, revenue")
    .eq("restaurant_id", restaurantId)
    .eq("date", todayStr)
    .maybeSingle();

  if (!existingDay || Number(existingDay.revenue || 0) <= 0) {
    const todayRevenue = randInt(1850, 3950) + randInt(10, 99) / 100;
    if (existingDay) {
      await supabase
        .from("service_days")
        .update({ revenue: todayRevenue, clients_count: randInt(45, 95) })
        .eq("id", existingDay.id);
    } else {
      await supabase.from("service_days").insert({
        restaurant_id: restaurantId,
        date: todayStr,
        revenue: todayRevenue,
        clients_count: randInt(45, 95),
        food_cost: Math.round(todayRevenue * 0.285 * 100) / 100,
        labor_cost: Math.round(todayRevenue * 0.292 * 100) / 100,
        marge: Math.round(todayRevenue * 0.423 * 100) / 100,
        status: "ouvert",
      });
    }
    console.log(`  💰 Ventes du jour (${todayStr}) configurées à ${todayRevenue} $.`);
  }
}

async function main() {
  console.log("🚀 Début du peuplement de fidélisation et rétention 30 jours...");
  await ensureWorkspaceAccess();

  for (const id of RESTAURANT_IDS) {
    await seedRestaurantRetention(id);
  }

  console.log("\n✨ Terminé avec succès ! Toutes les métriques de fidélisation sont prêtes.");
}

main().catch((err) => {
  console.error("💥 Erreur fatale :", err);
  process.exit(1);
});
