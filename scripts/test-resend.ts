import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("Erreur: variable d'environnement RESEND_API_KEY manquante.");
  process.exit(1);
}
const resend = new Resend(apiKey);

async function main() {
  console.log("=== Test de Configuration Resend — Minerva Flow ===");
  console.log("1. Vérification des domaines...");
  const domains = await resend.domains.list();
  console.log("Domaines configurés :", domains.data?.data?.map(d => ({
    name: d.name,
    status: d.status,
    region: d.region
  })));

  console.log("\n2. Vérification des segments / audiences...");
  const audiences = await resend.audiences.list();
  console.log("Audiences :", audiences.data?.data);

  console.log("\n3. Clé API Resend opérationnelle avec succès !");
}

main().catch(console.error);
