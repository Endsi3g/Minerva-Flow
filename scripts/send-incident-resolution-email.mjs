// scripts/send-incident-resolution-email.mjs
//
// Courriel éditorial officiel Minerva Flow — Rétablissement d'accès & correctif v2.46.0
//
// Usage:
//   node --experimental-strip-types scripts/send-incident-resolution-email.mjs --test
//   node --experimental-strip-types scripts/send-incident-resolution-email.mjs --target clalondeofficial@gmail.com

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";
import { renderMinervaEmail } from "../lib/email/brand-shell.ts";
import { MINERVA_EMAIL_FROM, MINERVA_EMAIL_REPLY_TO } from "../lib/email/identity.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY introuvable dans .env.local");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

const SENDER = MINERVA_EMAIL_FROM;
const REPLY_TO = MINERVA_EMAIL_REPLY_TO;
const APP_LOGIN_URL = "https://minervaflow.app/login";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateEditorialEmailHtml({ userName = "" } = {}) {
  const greeting = userName ? `Bonjour ${escapeHtml(userName)},` : "Bonjour,";
  const bodyHtml = `
    <p style="margin:0 0 16px;font-weight:600;color:#1a1e16">${greeting}</p>
    <p style="margin:0 0 16px">Lors de votre récente visite sur <strong>Minerva Flow</strong>, vous avez rencontré une interruption temporaire au moment d'accéder à votre compte. Nous tenions à vous présenter personnellement nos excuses pour ce contretemps.</p>
    <p style="margin:0 0 16px">Notre équipe d'ingénierie a immédiatement identifié l'anomalie et déployé un correctif complet dans notre dernière mise à jour de production.</p>
    <div style="margin:20px 0;padding:18px 20px;background-color:#fbf9f3;border-left:3px solid #167f5b;border-radius:0 12px 12px 0">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#1a1e16"><strong>Votre compte est prêt :</strong> vous n'avez pas besoin de créer un nouveau compte. Il vous suffit de vous connecter avec votre compte Google ou votre courriel habituel.</p>
    </div>
    <p style="margin:0 0 20px">Toutes les fonctionnalités de pilotage, de fidélisation et de gestion de votre établissement sont disponibles.</p>
    <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #eee9db;font-size:13px;color:#7d8579">Pour obtenir de l'aide ou signaler un comportement inattendu, répondez simplement à ce courriel.</p>
    <p style="margin:18px 0 0;font-size:13px"><strong>L'équipe Minerva Flow</strong><br /><a href="mailto:${REPLY_TO}" style="color:#167f5b;text-decoration:underline">${REPLY_TO}</a></p>`;

  return renderMinervaEmail({
    eyebrow: "Mise à jour v2.46.0 · Correctif déployé",
    title: "Votre accès est pleinement opérationnel.",
    preheader: "Le correctif est en production et vous pouvez accéder à votre espace.",
    bodyHtml,
    ctaLabel: "Accéder à mon espace Minerva Flow",
    ctaUrl: APP_LOGIN_URL,
    footer: "Ce message opérationnel fait suite à votre démarche sur Minerva Flow.",
  });
}

async function sendEmail({ to, userName = "" }) {
  console.log(`\n📨 Envoi du courriel à : ${to}`);
  const html = generateEditorialEmailHtml({ userName });
  const subject = "Votre accès Minerva Flow est rétabli — Bienvenue sur votre espace";

  const { data, error } = await resend.emails.send({
    from: SENDER,
    to: [to],
    reply_to: REPLY_TO,
    subject,
    html,
  });

  if (error) {
    console.error(`❌ Échec de l'envoi à ${to} :`, error);
    throw error;
  }

  console.log(`✅ Succès ! Message ID : ${data.id}`);
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes("--test");
  const targetIdx = args.indexOf("--target");
  const specificTarget = targetIdx !== -1 ? args[targetIdx + 1] : null;

  if (isTest) {
    const testRecipient = "kbelceus776@gmail.com";
    console.log("🧪 === TEST D'EXPÉDITION PRÉALABLE MINERVA FLOW ===");
    await sendEmail({ to: testRecipient, userName: "Kael" });
    console.log(`\n🎉 Courriel test avec logo officiel expédié avec succès à ${testRecipient}.`);
    return;
  }

  if (specificTarget) {
    console.log("🚀 === EXPÉDITION CIBLÉE MINERVA FLOW ===");
    await sendEmail({ to: specificTarget });
    console.log(`\n🎉 Courriel officiel avec logo expédié avec succès à ${specificTarget}.`);
    return;
  }

  console.log("Usage :");
  console.log("  node --experimental-strip-types scripts/send-incident-resolution-email.mjs --test");
  console.log("  node --experimental-strip-types scripts/send-incident-resolution-email.mjs --target clalondeofficial@gmail.com");
}

main().catch((err) => {
  console.error("Erreur d'exécution :", err);
  process.exit(1);
});
