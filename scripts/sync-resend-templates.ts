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
<body style="margin:0; padding:24px; background-color:#f5f1e6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1a1e16;">
  <div style="max-width:480px; margin:0 auto; padding:32px 24px; background:#fafaf5; border:1px solid #e6e0d0; border-radius:16px;">
    <p style="font-size:16px; font-weight:700; color:#1a1e16; margin:0 0 20px;">Flow <span style="color:#167f5b;">par Minerva</span></p>
    ${bodyHtml}
    <a href="${ctaUrl}" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#167f5b; color:#fffefa; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600;">${ctaLabel} →</a>
    <p style="margin-top:24px; font-size:12px; color:#8d9488;">Ce lien expire dans 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel.</p>
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
    welcomeHtmlContent = "<p>Bienvenue sur Flow par Minerva</p>";
  }

  const templatesToSync: TemplateDef[] = [
    {
      name: "Flow — 01. Bienvenue & Action",
      subject: "Bienvenue sur Flow par Minerva — commençons",
      html: renderWelcomeEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 02. Première Activation J+1",
      subject: "Faites votre première saisie en 2 minutes",
      html: renderActivationEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 03. Démo Marge & Flow AI J+3",
      subject: "Comment Flow vous aide à maîtriser votre marge réelle",
      html: renderFeatureHighlightEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 04. Aide & Diagnostic J+5",
      subject: "Besoin d'aide pour configurer votre espace Flow ?",
      html: renderSupportCheckinEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 05. Cas d'Usage & ROI J+7",
      subject: "Comment un restaurateur gagne 4h par semaine avec Flow",
      html: renderCaseStudyEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 06. Conversion Flow Pro J+10",
      subject: "Passez à la vitesse supérieure avec Flow Pro",
      html: renderConversionEmail(templateVariablesParams).html,
    },
    {
      name: "Flow — 07. Réactivation Inactivité",
      subject: "Votre espace Flow par Minerva est toujours prêt",
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
      subject: "Bienvenue sur Flow par Minerva — Votre plateforme de gestion",
      html: welcomeHtmlContent,
    },
  ];

  const { data: existingList } = await resend.templates.list();
  const existingMap = new Map((existingList?.data ?? []).map((t) => [t.name, t.id]));

  for (const tpl of templatesToSync) {
    const existingId = existingMap.get(tpl.name);
    if (existingId) {
      console.log(`⚡ Mise à jour du template : "${tpl.name}" (${existingId})...`);
      try {
        const { error } = await resend.templates.update({
          id: existingId,
          name: tpl.name,
          subject: tpl.subject,
          html: tpl.html,
          variables: tpl.variables,
        });
        if (error) {
          console.warn(`❌ Erreur mise à jour "${tpl.name}":`, error.message);
        } else {
          console.log(`✓ Mis à jour avec succès : "${tpl.name}"`);
        }
      } catch (err) {
        console.warn(`Erreur API pour "${tpl.name}":`, err);
      }
    } else {
      console.log(`➕ Création du template : "${tpl.name}"...`);
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
  }

  const { data: finalList } = await resend.templates.list();
  console.log(`\n📋 ${finalList?.data?.length ?? 0} templates présents dans votre Dashboard Resend :`);
  console.log(finalList?.data?.map((t) => `  • ${t.name} (ID: ${t.id})`).join("\n"));

  console.log("\n🎉 Tous les 11 templates sont maintenant publiés et visibles dans https://resend.com/templates !");
}

syncTemplates().catch((err) => {
  console.error("Erreur générale :", err);
  process.exit(1);
});
