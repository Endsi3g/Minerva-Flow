// scripts/send-incident-resolution-email.mjs
//
// Courriel éditorial officiel Minerva Flow — Rétablissement d'accès & correctif v2.46.0
//
// Usage:
//   node scripts/send-incident-resolution-email.mjs --test
//   node scripts/send-incident-resolution-email.mjs --target clalondeofficial@gmail.com

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY introuvable dans .env.local");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

const SENDER = "Minerva Flow <flow@minervaflow.app>";
const REPLY_TO = "support@minervaflow.app";
const APP_LOGIN_URL = "https://minervaflow.app/login";
const BRAND_LOGO_URL = "https://www.minervaflow.app/icon-192.png";

function generateEditorialEmailHtml({ userName = "" } = {}) {
  const greeting = userName ? `Bonjour ${userName},` : "Bonjour,";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre accès Minerva Flow est rétabli</title>
</head>
<body style="margin:0; padding:32px 16px; background-color:#F5F1E6; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1A1E16; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px; background-color:#FFFEFA; border:1px solid #E6E0D0; border-radius:24px; box-shadow:0 12px 36px rgba(26, 30, 22, 0.06); overflow:hidden;">
          
          <!-- Header Brand Bar with Verified Sender Badge -->
          <tr>
            <td style="padding:32px 36px 18px 36px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="vertical-align:middle; padding-right:14px;">
                    <img src="${BRAND_LOGO_URL}" width="48" height="48" alt="Minerva Flow" style="display:block; border-radius:14px; box-shadow:0 6px 18px rgba(22,127,91,0.22); border:1px solid #DCECE3;" />
                  </td>
                  <td style="vertical-align:middle; text-align:left;">
                    <div style="font-family:'New York', -apple-system-serif, 'Playfair Display', Georgia, serif; font-size:22px; font-weight:600; letter-spacing:-0.02em; color:#1A1E16; line-height:1.2;">
                      Minerva Flow
                    </div>
                    <div style="margin-top:3px;">
                      <span style="font-size:12px; font-weight:600; color:#167F5B; display:inline-flex; align-items:center;">
                        <span style="display:inline-block; width:7px; height:7px; background-color:#167F5B; border-radius:50%; margin-right:5px;"></span>
                        Expéditeur officiel vérifié · flow@minervaflow.app
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="margin-top:16px;">
                <span style="display:inline-block; padding:4px 14px; background-color:#EEF5F0; border:1px solid #DCECE3; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#167F5B;">
                  Mise à jour v2.46.0 · Correctif déployé
                </span>
              </div>
            </td>
          </tr>

          <!-- Editorial Title -->
          <tr>
            <td style="padding:10px 36px 20px 36px; text-align:center;">
              <h1 style="margin:0; font-family:'New York', -apple-system-serif, 'Playfair Display', Georgia, serif; font-size:25px; line-height:1.3; font-weight:600; color:#1A1E16; letter-spacing:-0.015em;">
                Votre accès est pleinement opérationnel.
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:0 36px 28px 36px; font-size:15px; line-height:1.68; color:#565F52;">
              <p style="margin:0 0 16px 0; color:#1A1E16; font-weight:600;">
                ${greeting}
              </p>
              <p style="margin:0 0 16px 0;">
                Lors de votre récente visite sur <strong>Minerva Flow</strong>, vous avez rencontré une interruption temporaire au moment d'accéder à votre compte. Nous tenions à vous présenter personnellement nos excuses pour ce contretemps.
              </p>
              <p style="margin:0 0 16px 0;">
                Notre équipe d'ingénierie a immédiatement identifié l'anomalie et déployé un correctif complet dans notre dernière mise à jour de production.
              </p>
              
              <!-- Highlight Callout Box -->
              <div style="margin:20px 0; padding:18px 20px; background-color:#FBF9F3; border-left:3px solid #167F5B; border-radius:0 12px 12px 0;">
                <p style="margin:0; font-size:14px; line-height:1.6; color:#1A1E16;">
                  <strong>Votre compte est prêt :</strong> vous n'avez pas besoin de créer un nouveau compte. Il vous suffit de vous connecter directement à l'aide de votre compte Google ou de votre courriel habituel.
                </p>
              </div>

              <p style="margin:0 0 26px 0;">
                Toutes les fonctionnalités de pilotage, de fidélisation et de gestion de votre établissement sont immédiatement disponibles.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px 0;">
                    <a href="${APP_LOGIN_URL}" target="_blank" style="display:inline-block; padding:15px 34px; background:linear-gradient(135deg, #167F5B 0%, #0E5A40 100%); color:#FFFEFA; text-decoration:none; border-radius:999px; font-size:15px; font-weight:700; letter-spacing:0.01em; box-shadow:0 6px 20px rgba(22, 127, 91, 0.28); -webkit-text-size-adjust:none;">
                      Accéder à mon espace Minerva Flow &nbsp;→
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Concierge Note -->
              <p style="margin:24px 0 0 0; font-size:13.5px; line-height:1.6; color:#7D8579; border-top:1px solid #EEE9DB; padding-top:20px;">
                Si vous souhaitez un accompagnement personnalisé dans la configuration de votre établissement ou si vous observez le moindre comportement inattendu, répondez simplement à ce courriel : notre équipe est à votre écoute directe.
              </p>

              <!-- Sender Signature Block with Logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                <tr>
                  <td style="vertical-align:middle; padding-right:12px;">
                    <img src="${BRAND_LOGO_URL}" width="38" height="38" alt="Minerva Flow" style="display:block; border-radius:10px; border:1px solid #E6E0D0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:14px; font-weight:700; color:#1A1E16; line-height:1.2;">
                      L'équipe Minerva Flow
                    </div>
                    <div style="font-size:12px; color:#7D8579; margin-top:2px;">
                      Direction des opérations · <a href="mailto:${REPLY_TO}" style="color:#167F5B; text-decoration:none;">${REPLY_TO}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CASL / Legal Footer -->
          <tr>
            <td style="padding:22px 36px 30px 36px; background-color:#FAF7EE; border-top:1px solid #EEE9DB; font-size:11.5px; line-height:1.6; color:#8D9488; text-align:center;">
              <p style="margin:0 0 6px 0;">
                <strong>Minerva Technologies Inc.</strong> · Montréal (Québec), Canada
              </p>
              <p style="margin:0 0 6px 0;">
                Ce message opérationnel fait suite à votre démarche sur <a href="https://minervaflow.app" style="color:#167F5B; text-decoration:none;">minervaflow.app</a>.
              </p>
              <p style="margin:0;">
                Support & assistance directe : <a href="mailto:${REPLY_TO}" style="color:#167F5B; text-decoration:none;">${REPLY_TO}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  console.log("  node scripts/send-incident-resolution-email.mjs --test");
  console.log("  node scripts/send-incident-resolution-email.mjs --target clalondeofficial@gmail.com");
}

main().catch((err) => {
  console.error("Erreur d'exécution :", err);
  process.exit(1);
});
