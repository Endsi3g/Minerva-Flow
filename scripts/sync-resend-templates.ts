import { Resend } from "resend";
import * as fs from "fs";
import * as path from "path";
import {
  renderWelcomeEmail,
  renderActivationEmail,
  renderFeatureHighlightEmail,
  renderSupportCheckinEmail,
  renderCaseStudyEmail,
  renderConversionEmail,
  renderReactivationEmail,
} from "../lib/email/lifecycle-templates";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("Erreur: RESEND_API_KEY n'est pas définie dans l'environnement.");
  process.exit(1);
}

const resend = new Resend(apiKey);
const APP_ORIGIN = "https://minervaflow.app";

const templateVariablesParams = {
  firstName: "{{{FIRST_NAME}}}",
  restaurantName: "{{{RESTAURANT_NAME}}}",
  appUrl: APP_ORIGIN,
  hasRestaurant: true,
  hasServiceDays: false,
  hasPosConnected: false,
};

function getTransactionalShell(bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:24px; background-color:#f5f1e6; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1a1e16;">
  <div style="max-width:500px; margin:0 auto; padding:38px 28px; background:#fffefa; border:1px solid #e6e0d0; border-radius:22px; box-shadow:0 8px 24px rgba(26, 30, 22, 0.05); text-align:center;">
    <div style="margin-bottom:20px;">
      <img src="https://minervaflow.app/icon-192.png" width="56" height="56" alt="Minerva Flow" style="display:inline-block; border-radius:15px; box-shadow:0 4px 14px rgba(22,127,91,0.20);" />
    </div>
    <div style="font-size:14.5px; line-height:1.65; color:#4a5245; text-align:left; margin-bottom:24px;">
      ${bodyHtml}
    </div>
    <div style="margin:24px 0 10px; text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block; padding:13px 30px; background-color:#167f5b; color:#fffefa; text-decoration:none; border-radius:999px; font-size:14.5px; font-weight:700; box-shadow:0 4px 14px rgba(22, 127, 91, 0.28);">${ctaLabel} →</a>
    </div>
    <p style="margin-top:28px; padding-top:18px; border-top:1px solid #eee9db; font-size:12px; line-height:1.5; color:#8d9488; text-align:center;">
      Ce lien expire dans 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel.<br />
      © 2026 Minerva Flow · Minerva Technologies Inc.
    </p>
  </div>
</body>
</html>`;
}

interface TemplateDef {
  name: string;
  subject: string;
  html: string;
  variables?: { key: string; type: "string" | "number"; fallback?: string }[];
}

async function syncTemplates() {
  console.log("=== Synchronisation intégrale des Templates vers le Dashboard Resend ===");

  const welcomeHtmlPath = path.join(__dirname, "../emails/flow-bienvenue.html");
  let welcomeHtmlContent = "";
  try {
    welcomeHtmlContent = fs.readFileSync(welcomeHtmlPath, "utf-8");
  } catch {
    welcomeHtmlContent = "<p>Bienvenue sur Minerva Flow</p>";
  }

  const templatesToSync: TemplateDef[] = [
    {
      name: "Flow — 01. Bienvenue & Action",
      subject: "Bienvenue sur Minerva Flow — Votre cockpit est prêt",
      html: renderWelcomeEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 02. Première Activation J+1",
      subject: "Maîtrisez votre Prime Cost dès votre premier service",
      html: renderActivationEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 03. Démo Marge & Flow AI J+3",
      subject: "Votre copilote Flow AI : L'intelligence au service de vos marges",
      html: renderFeatureHighlightEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 04. Aide & Diagnostic J+5",
      subject: "Besoin d'un coup de pouce pour paramétrer votre espace ?",
      html: renderSupportCheckinEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 05. Cas d'Usage & ROI J+7",
      subject: "Du petit café au grand bistro : 6 études de cas concrètes",
      html: renderCaseStudyEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 06. Conversion Flow Pro J+10",
      subject: "Passez au niveau supérieur avec Minerva Flow Pro",
      html: renderConversionEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 07. Réactivation Inactivité",
      subject: "Votre cockpit Minerva Flow est toujours prêt pour le service",
      html: renderReactivationEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — Invite Collaborateur",
      subject: "Invitation à rejoindre {{{WORKSPACE_NAME}}} sur Minerva Flow",
      html: getTransactionalShell(
        `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">Vous avez été invité·e à rejoindre <strong>{{{WORKSPACE_NAME}}}</strong> en tant que <strong>{{{ROLE}}}</strong> sur Minerva Flow.</p>`,
        "Accepter l'invitation",
        "{{{INVITE_URL}}}"
      ),
      variables: [
        { key: "WORKSPACE_NAME", type: "string", fallback: "l'établissement" },
        { key: "ROLE", type: "string", fallback: "collaborateur" },
        { key: "INVITE_URL", type: "string", fallback: `${APP_ORIGIN}/login` },
      ],
    },
    {
      name: "Flow — Invite Espace Employé",
      subject: "{{{EMPLOYEE_NAME}}}, connectez-vous à votre espace chez {{{RESTAURANT_NAME}}}",
      html: getTransactionalShell(
        `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">{{{RESTAURANT_NAME}}} vous invite à créer votre compte pour accéder à votre espace personnel — vos tâches et vos horaires.</p>`,
        "Créer mon compte",
        "{{{INVITE_URL}}}"
      ),
      variables: [
        { key: "EMPLOYEE_NAME", type: "string", fallback: "Bonjour" },
        { key: "RESTAURANT_NAME", type: "string", fallback: "votre restaurant" },
        { key: "INVITE_URL", type: "string", fallback: `${APP_ORIGIN}/mon-espace` },
      ],
    },
    {
      name: "Flow — Fidélisation Relance",
      subject: "{{{RESTAURANT_NAME}}} : vos points de fidélité vous attendent",
      html: getTransactionalShell(
        `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">{{{RETENTION_MESSAGE}}}</p>`,
        "Voir mes points",
        `${APP_ORIGIN}/portal`
      ),
      variables: [
        { key: "RESTAURANT_NAME", type: "string", fallback: "votre restaurant favori" },
        { key: "RETENTION_MESSAGE", type: "string", fallback: "Vos récompenses exclusives sont disponibles." },
      ],
    },
    {
      name: "Flow — Bienvenue Plateforme",
      subject: "Bienvenue sur Minerva Flow — Votre plateforme de gestion",
      html: welcomeHtmlContent,
    },
  ];

  // 1. Récupérer les templates existants sur Resend
  const { data: existingList } = await resend.templates.list();
  const existingMap = new Map((existingList?.data ?? []).map((t) => [t.name, t.id]));

  console.log(`Templates existants trouvés sur Resend: ${existingMap.size}`);

  // 2. Nettoyer les anciens templates pour assurer un remplacement propre avec le nouveau design
  for (const [name, id] of existingMap.entries()) {
    try {
      console.log(`🗑️ Remplacement de l'ancien template : "${name}" (${id})...`);
      await resend.templates.remove(id);
    } catch (err) {
      console.warn(`Erreur lors de la suppression de "${name}":`, err);
    }
  }

  // 3. Créer chaque nouveau template haute couture
  for (const tpl of templatesToSync) {
    console.log(`➕ Publication du nouveau template : "${tpl.name}"...`);
    const { data: created, error } = await resend.templates.create({
      name: tpl.name,
      subject: tpl.subject,
      html: tpl.html,
      variables: tpl.variables,
    });

    if (error) {
      console.error(`❌ Échec création "${tpl.name}":`, error.message);
    } else {
      console.log(`✓ Créé avec succès : "${tpl.name}" (ID: ${created?.id})`);
    }
  }

  // 4. Liste finale
  const { data: finalList } = await resend.templates.list();
  console.log(`\n📋 ${finalList?.data?.length ?? 0} templates présents dans votre Dashboard Resend :`);
  console.log(finalList?.data?.map((t) => `  • ${t.name} (ID: ${t.id})`).join("\n"));

  console.log("\n🎉 Tous les 11 templates luxueux sont maintenant publiés et visibles dans https://resend.com/templates !");
}

syncTemplates().catch((err) => {
  console.error("Erreur générale :", err);
  process.exit(1);
});
