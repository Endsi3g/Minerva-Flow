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
  renderWeeklyReportEmail,
  renderSpecialOfferEmail,
  renderLoyaltyRetentionEmail,
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
  <div style="max-width:520px; margin:0 auto; padding:36px 28px; background:#fffefa; border:1px solid #e6e0d0; border-radius:20px; text-align:center;">
    <div style="margin-bottom:18px;">
      <img src="https://minervaflow.app/icon-192.png" width="54" height="54" alt="Minerva Flow" style="display:inline-block; border-radius:14px; border:0;" />
    </div>
    <div style="font-size:14px; line-height:1.65; color:#4a5245; text-align:left; margin-bottom:22px;">
      ${bodyHtml}
    </div>
    <div style="margin:22px 0 10px; text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block; padding:12px 28px; background-color:#167f5b; color:#fffefa; text-decoration:none; border-radius:999px; font-size:14px; font-weight:600;">${ctaLabel} →</a>
    </div>
    <p style="margin-top:24px; padding-top:16px; border-top:1px solid #eee9db; font-size:11.5px; line-height:1.5; color:#8d9488; text-align:center;">
      Ce lien expire dans 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel.<br />
      Minerva Flow · Minerva Technologies Inc. · Montréal (Québec), Canada
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
  console.log("=== Synchronisation intégrale des 13 Templates vers le Dashboard Resend ===");

  const welcomeHtmlPath = path.join(__dirname, "../emails/flow-bienvenue.html");
  let welcomeHtmlContent = "";
  try {
    welcomeHtmlContent = fs.readFileSync(welcomeHtmlPath, "utf-8");
  } catch {
    welcomeHtmlContent = renderWelcomeEmail(templateVariablesParams).html;
  }

  const templatesToSync: TemplateDef[] = [
    {
      name: "Flow — 01. Bienvenue & Démarrage",
      subject: "Bienvenue sur Minerva Flow",
      html: renderWelcomeEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 02. Suivi des Coûts J+1",
      subject: "Suivre vos coûts de nourriture et de personnel",
      html: renderActivationEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 03. Assistant & Marges J+3",
      subject: "Poser une question sur vos ventes et vos marges",
      html: renderFeatureHighlightEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 04. Aide & Support J+5",
      subject: "Besoin d'aide pour configurer votre compte ?",
      html: renderSupportCheckinEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 05. Exemples Concrets J+7",
      subject: "Comment 6 commerces d'ici utilisent Minerva Flow",
      html: renderCaseStudyEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 06. Options Avancées J+10",
      subject: "Les options avancées de Minerva Flow",
      html: renderConversionEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — 07. Données de Service",
      subject: "Vos données de service restent accessibles",
      html: renderReactivationEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Flow — Rapport Hebdomadaire",
      subject: "Rapport de la semaine : {{{RESTAURANT_NAME}}}",
      html: renderWeeklyReportEmail({
        firstName: "{{{FIRST_NAME}}}",
        restaurantName: "{{{RESTAURANT_NAME}}}",
        weekRange: "{{{WEEK_RANGE}}}",
        totalSales: "{{{TOTAL_SALES}}}",
        primeCostRatio: "{{{PRIME_COST_RATIO}}}",
        foodCostRatio: "{{{FOOD_COST_RATIO}}}",
        laborCostRatio: "{{{LABOR_COST_RATIO}}}",
        totalHoursWorked: "{{{TOTAL_HOURS}}}",
        comparisonPreviousWeek: "{{{COMPARISON}}}",
        appUrl: APP_ORIGIN,
      }).html,
      variables: [
        { key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" },
        { key: "WEEK_RANGE", type: "string", fallback: "la semaine écoulée" },
        { key: "TOTAL_SALES", type: "string", fallback: "14 820 $" },
        { key: "PRIME_COST_RATIO", type: "string", fallback: "58,4 %" },
        { key: "FOOD_COST_RATIO", type: "string", fallback: "29,6 %" },
        { key: "LABOR_COST_RATIO", type: "string", fallback: "28,8 %" },
        { key: "TOTAL_HOURS", type: "string", fallback: "246 h" },
        { key: "COMPARISON", type: "string", fallback: "+3,2 % vs semaine précédente" },
      ],
    },
    {
      name: "Flow — Offre Spéciale & Forfaits",
      subject: "Offre spéciale : 2 mois offerts sur l'abonnement annuel",
      html: renderSpecialOfferEmail({
        firstName: "{{{FIRST_NAME}}}",
        restaurantName: "{{{RESTAURANT_NAME}}}",
        discountSummary: "{{{DISCOUNT_SUMMARY}}}",
        ctaUrl: `${APP_ORIGIN}/settings`,
        appUrl: APP_ORIGIN,
      }).html,
      variables: [
        { key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" },
        { key: "DISCOUNT_SUMMARY", type: "string", fallback: "2 mois offerts sur l'abonnement annuel" },
      ],
    },
    {
      name: "Flow — Fidélisation Relance Client",
      subject: "Vos points de fidélité vous attendent chez {{{RESTAURANT_NAME}}}",
      html: renderLoyaltyRetentionEmail({
        customerName: "{{{CUSTOMER_NAME}}}",
        restaurantName: "{{{RESTAURANT_NAME}}}",
        pointsBalance: "{{{POINTS_BALANCE}}}",
        tierName: "{{{TIER_NAME}}}",
        nextTierPoints: "{{{NEXT_TIER_POINTS}}}",
        rewardTitle: "{{{REWARD_TITLE}}}",
        retentionMessage: "{{{RETENTION_MESSAGE}}}",
        portalUrl: "{{{PORTAL_URL}}}",
        appUrl: APP_ORIGIN,
      }).html,
      variables: [
        { key: "CUSTOMER_NAME", type: "string", fallback: "Cher client" },
        { key: "RESTAURANT_NAME", type: "string", fallback: "votre restaurant favori" },
        { key: "POINTS_BALANCE", type: "string", fallback: "85" },
        { key: "TIER_NAME", type: "string", fallback: "Habitué" },
        { key: "NEXT_TIER_POINTS", type: "string", fallback: "15" },
        { key: "REWARD_TITLE", type: "string", fallback: "Boisson ou dessert offert à votre prochaine visite" },
        { key: "RETENTION_MESSAGE", type: "string", fallback: "Merci pour votre fidélité ! Vos récompenses sont disponibles." },
        { key: "PORTAL_URL", type: "string", fallback: `${APP_ORIGIN}/portal` },
      ],
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
      name: "Flow — Bienvenue Plateforme",
      subject: "Bienvenue sur Minerva Flow",
      html: welcomeHtmlContent,
    },
  ];

  // 1. Récupérer les templates existants sur Resend
  const { data: existingList } = await resend.templates.list();
  const existingTemplates = existingList?.data || [];
  console.log(`Templates existants trouvés sur Resend: ${existingTemplates.length}`);

  // 2. Supprimer les anciens templates
  for (const existing of existingTemplates) {
    if (existing.name.startsWith("Flow —")) {
      console.log(`🗑️ Remplacement de l'ancien template : "${existing.name}" (${existing.id})...`);
      try {
        await resend.templates.remove(existing.id);
      } catch (err: any) {
        console.warn(`Impossible de supprimer ${existing.name}:`, err?.message);
      }
    }
  }

  // 3. Créer les nouveaux templates enrichis
  for (const tpl of templatesToSync) {
    console.log(`➕ Publication du nouveau template : "${tpl.name}"...`);
    try {
      const payload: any = {
        name: tpl.name,
        subject: tpl.subject,
        html: tpl.html,
      };
      if (tpl.variables && tpl.variables.length > 0) {
        payload.variables = tpl.variables;
      }
      const res = await resend.templates.create(payload);
      if (res.error) {
        console.error(`❌ Erreur création "${tpl.name}":`, res.error);
      } else {
        console.log(`✓ Créé avec succès : "${tpl.name}" (ID: ${res.data?.id})`);
      }
    } catch (err: any) {
      console.error(`❌ Exception création "${tpl.name}":`, err?.message);
    }
  }

  // 4. Liste finale
  const { data: finalList } = await resend.templates.list();
  console.log(`\n📋 ${finalList?.data?.length || 0} templates présents dans votre Dashboard Resend :`);
  finalList?.data?.forEach((t) => console.log(`  • ${t.name} (ID: ${t.id})`));
  console.log("\n🎉 Tous les 13 templates enrichis sont maintenant publiés et visibles dans https://resend.com/templates !");
}

syncTemplates().catch((e) => {
  console.error("Erreur générale :", e);
  process.exit(1);
});
