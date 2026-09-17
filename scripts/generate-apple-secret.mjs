#!/usr/bin/env node

/**
 * Minerva Flow — Générateur de Secret Key JWT pour Sign in with Apple (Supabase Auth)
 *
 * Apple n'utilise pas un secret statique comme Google, mais un jeton JWT signé avec
 * votre clé privée .p8 via l'algorithme ES256, valide pour une durée maximale de 6 mois (180 jours).
 *
 * Usage :
 *   node scripts/generate-apple-secret.mjs <chemin_vers_cle.p8> <KEY_ID>
 *
 * Exemple :
 *   node scripts/generate-apple-secret.mjs ~/Downloads/AuthKey_8X9ABC1234.p8 8X9ABC1234
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TEAM_ID = "NHMPLN46TN";
const SERVICES_ID = "com.minervaflow.loyalty.web";

const args = process.argv.slice(2);
let p8Path = args[0];
let keyId = args[1];

if (!p8Path) {
  console.error("\n❌ Erreur : veuillez fournir le chemin vers votre fichier .p8");
  console.error("Usage : node scripts/generate-apple-secret.mjs <chemin_fichier.p8> [KEY_ID]\n");
  process.exit(1);
}

// Résolution du chemin absolu
const resolvedPath = path.resolve(p8Path.replace(/^~/, process.env.HOME || ""));

if (!fs.existsSync(resolvedPath)) {
  console.error(`\n❌ Fichier introuvable : ${resolvedPath}\n`);
  process.exit(1);
}

// Détection automatique du Key ID depuis le nom de fichier (ex: AuthKey_8X9ABC1234.p8) si non fourni
if (!keyId) {
  const match = path.basename(resolvedPath).match(/AuthKey_([A-Z0-9]+)\.p8$/i);
  if (match) {
    keyId = match[1];
  } else {
    console.error("\n❌ Erreur : Impossible de deviner le Key ID depuis le nom de fichier.");
    console.error("Veuillez le fournir en 2e argument : node scripts/generate-apple-secret.mjs <chemin.p8> <KEY_ID>\n");
    process.exit(1);
  }
}

try {
  const privateKey = fs.readFileSync(resolvedPath, "utf8");

  // Durée maximale autorisée par Apple : 6 mois (180 jours = 15 552 000 secondes)
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15552000;

  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };

  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: exp,
    aud: "https://appleid.apple.com",
    sub: SERVICES_ID,
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }, "base64url");

  const jwt = `${signingInput}.${signature}`;

  const expDate = new Date(exp * 1000).toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  console.log("\n========================================================");
  console.log("🍏 Apple Client Secret JWT généré avec succès pour Supabase !");
  console.log("========================================================");
  console.log(`• Team ID     : ${TEAM_ID}`);
  console.log(`• Service ID  : ${SERVICES_ID}`);
  console.log(`• Key ID      : ${keyId}`);
  console.log(`• Expire le   : ${expDate} (dans ~6 mois)`);
  console.log("--------------------------------------------------------");
  console.log("Copiez le JWT ci-dessous dans Supabase (Secret Key) :");
  console.log("--------------------------------------------------------\n");
  console.log(jwt);
  console.log("\n========================================================\n");
} catch (err) {
  console.error("\n❌ Erreur lors de la signature du JWT :", err.message);
  process.exit(1);
}
