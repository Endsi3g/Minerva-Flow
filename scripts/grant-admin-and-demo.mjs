// scripts/grant-admin-and-demo.mjs
//
// Attribue les privilèges administrateur de plateforme (is_platform_admin = true)
// et rattache l'utilisateur aux 5 restaurants du compte démo permanent avec le rôle "owner".

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

const TARGET_EMAIL = "rayanmohellebi2009@gmail.com";
const DEMO_WORKSPACE_ID = "7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d";

async function main() {
  console.log(`\n🔍 Recherche de l'utilisateur ${TARGET_EMAIL}...`);

  // 1. Récupération de l'utilisateur
  let targetUser = null;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());
    if (found) {
      targetUser = found;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!targetUser) {
    console.error(`❌ Utilisateur ${TARGET_EMAIL} non trouvé dans auth.users.`);
    process.exit(1);
  }

  console.log(`✅ Utilisateur trouvé : ID = ${targetUser.id}`);

  // 2. Mise à jour du profil : is_platform_admin = true & onboarding_completed = true
  console.log(`\n👑 Élévation du profil au rang administrateur de plateforme...`);
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      is_platform_admin: true,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUser.id);

  if (profileError) throw profileError;
  console.log(`✅ Profil mis à jour : is_platform_admin = true, onboarding_completed = true`);

  // 3. Récupération des restaurants du groupe démo
  console.log(`\n🏬 Récupération des restaurants du groupe démo...`);
  const { data: demoRestaurants, error: restError } = await supabase
    .from("restaurants")
    .select("id, name, city, workspace_id")
    .eq("workspace_id", DEMO_WORKSPACE_ID);

  if (restError) throw restError;

  if (!demoRestaurants || demoRestaurants.length === 0) {
    console.error(`❌ Aucun restaurant trouvé pour le workspace ${DEMO_WORKSPACE_ID}`);
    process.exit(1);
  }

  console.log(`Trouvé ${demoRestaurants.length} restaurants démo :`);
  for (const r of demoRestaurants) {
    console.log(`  - ${r.name} (${r.city}) [${r.id}]`);
  }

  // 4. Attribution du rôle "owner" pour chacun des 5 restaurants démo
  console.log(`\n🔑 Attribution des adhésions propriétaire (owner)...`);
  for (const r of demoRestaurants) {
    const { data: existing, error: selectError } = await supabase
      .from("restaurant_members")
      .select("id, role, status")
      .eq("restaurant_id", r.id)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      if (existing.role !== "owner" || existing.status !== "active") {
        const { error: updateError } = await supabase
          .from("restaurant_members")
          .update({ role: "owner", status: "active" })
          .eq("id", existing.id);
        if (updateError) throw updateError;
        console.log(`  🔄 Mis à jour en owner actif : ${r.name}`);
      } else {
        console.log(`  ℹ️ Déjà owner actif : ${r.name}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from("restaurant_members")
        .insert({
          restaurant_id: r.id,
          user_id: targetUser.id,
          role: "owner",
          status: "active",
        });
      if (insertError) throw insertError;
      console.log(`  ✨ Ajouté comme owner : ${r.name}`);
    }
  }

  // 5. Nettoyage de l'adhésion au restaurant vide temporaire ("Mon restaurant")
  console.log(`\n🧹 Vérification du restaurant temporaire vide...`);
  const { data: placeholderMembers, error: placeholderError } = await supabase
    .from("restaurant_members")
    .select("id, restaurant_id, restaurants(id, name, workspace_id)")
    .eq("user_id", targetUser.id);

  if (!placeholderError && placeholderMembers) {
    for (const m of placeholderMembers) {
      if (m.restaurants?.workspace_id !== DEMO_WORKSPACE_ID && m.restaurants?.name?.toLowerCase() === "mon restaurant") {
        console.log(`  🗑️ Suppression de l'adhésion au restaurant temporaire : "${m.restaurants.name}"`);
        await supabase.from("restaurant_members").delete().eq("id", m.id);
      }
    }
  }

  console.log(`\n🎉 Opération terminée avec succès pour ${TARGET_EMAIL} !`);
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
