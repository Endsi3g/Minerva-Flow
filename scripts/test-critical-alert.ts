import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { notifyCriticalError } from "../lib/alerts/error-notifier";

async function main() {
  console.log("=== Test de Notification d'Erreur Critique Minerva Flow ===");

  const simulatedError = new Error(
    "FATAL_TEST_EXCEPTION: Impossible de se connecter au pool Supabase (Simulation de test de sécurité)"
  );
  simulatedError.name = "DatabaseConnectionTimeout";

  console.log("1. Déclenchement de la première alerte critique...");
  const firstResult = await notifyCriticalError({
    error: simulatedError,
    source: "server_action",
    context: "Script de vérification opérationnelle des alertes",
    url: "https://minervaflow.app/api/cron/pos-catalog-reconcile",
    userId: "test-admin-kael",
    userEmail: "kbelceus776@gmail.com",
    metadata: {
      environment: "test_verification",
      simulatedSeverity: "HIGH",
    },
  });

  console.log("Résultat 1 :", firstResult);

  console.log("\n2. Test de protection anti-spam / déduplication (envoi immédiat du même bug)...");
  const duplicateResult = await notifyCriticalError({
    error: simulatedError,
    source: "server_action",
    context: "Script de vérification opérationnelle des alertes",
  });

  console.log("Résultat 2 (déduplication attendue) :", duplicateResult);

  if (duplicateResult.reason === "deduplicated_suppression_active") {
    console.log("✅ Déduplication validée avec succès : le second email a été bloqué pour éviter le spam.");
  } else {
    console.warn("⚠️ Attention : la déduplication n'a pas retourné la raison attendue.");
  }
}

main().catch((err) => {
  console.error("Erreur d'exécution du test:", err);
  process.exit(1);
});
