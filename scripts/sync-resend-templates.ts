import { Resend } from "resend";
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
const exportMode = process.argv.includes("--export-json");
if (!apiKey && !exportMode) {
  console.error("Erreur: RESEND_API_KEY n'est pas définie dans l'environnement.");
  process.exit(1);
}

const resend = apiKey ? new Resend(apiKey) : null;
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
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:28px 14px;background:#f5f1e6;color:#25342b;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#fffefa;border:1px solid #e6e0d0;border-radius:18px;border-collapse:separate;overflow:hidden">
    <tr><td align="center" style="padding:30px 24px 15px"><img src="https://minervaflow.app/icon-192.png" width="48" height="48" alt="Minerva Flow" border="0" style="display:block;width:48px;height:48px;border:0;border-radius:14px"></td></tr>
    <tr><td style="padding:8px 30px 24px;color:#4a5245;font-size:14px;line-height:1.75">${bodyHtml}</td></tr>
    <tr><td align="center" style="padding:5px 30px 30px"><a href="${ctaUrl}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#167f5b;color:#fffefa;text-decoration:none;font-size:14px;font-weight:700">${ctaLabel} &rarr;</a></td></tr>
    <tr><td align="center" style="border-top:1px solid #eee9db;padding:17px 24px;color:#818a7d;font-size:11px;line-height:1.6">Minerva Flow · Minerva Technologies Inc. · Montréal (Québec), Canada</td></tr>
  </table>
</body></html>`;
}

interface TemplateDef {
  name: string;
  subject: string;
  html: string;
  variables?: { key: string; type: "string" | "number"; fallback?: string | number }[];
}

async function syncTemplates() {
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
      subject: renderCaseStudyEmail(templateVariablesParams).subject,
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
        { key: "TOTAL_SALES", type: "string", fallback: "—" },
        { key: "PRIME_COST_RATIO", type: "string", fallback: "—" },
        { key: "FOOD_COST_RATIO", type: "string", fallback: "—" },
        { key: "LABOR_COST_RATIO", type: "string", fallback: "—" },
        { key: "TOTAL_HOURS", type: "string", fallback: "—" },
        { key: "COMPARISON", type: "string", fallback: "Comparaison non disponible" },
      ],
    },
    {
      name: "Flow — Offre Spéciale & Forfaits",
      subject: "Découvrez les options de votre abonnement Minerva Flow",
      html: renderSpecialOfferEmail({
        firstName: "{{{FIRST_NAME}}}",
        restaurantName: "{{{RESTAURANT_NAME}}}",
        discountSummary: "{{{DISCOUNT_SUMMARY}}}",
        ctaUrl: `${APP_ORIGIN}/settings`,
        appUrl: APP_ORIGIN,
      }).html,
      variables: [
        { key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" },
        { key: "DISCOUNT_SUMMARY", type: "string", fallback: "Consultez les modalités actuellement offertes dans votre espace." },
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
        { key: "POINTS_BALANCE", type: "string", fallback: "—" },
        { key: "TIER_NAME", type: "string", fallback: "—" },
        { key: "NEXT_TIER_POINTS", type: "string", fallback: "—" },
        { key: "REWARD_TITLE", type: "string", fallback: "Consultez les récompenses disponibles dans votre carte." },
        { key: "RETENTION_MESSAGE", type: "string", fallback: "Consultez votre carte pour voir les récompenses configurées par le restaurant." },
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
      html: renderWelcomeEmail(templateVariablesParams).html,
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "votre établissement" }],
    },
    {
      name: "Ambassadeurs — Votre lien est prêt",
      subject: "Bienvenue dans le programme ambassadeur Minerva Flow",
      html: getTransactionalShell(`<p style="margin:0 0 12px;color:#167f5b;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Programme ambassadeur</p><h1 style="margin:0 0 14px;color:#173d2d;font-family:Georgia,serif;font-size:27px;font-weight:500;line-height:1.25">Votre lien est prêt.</h1><p>Partagez votre expérience avec les restaurateurs de votre réseau. Vos recommandations et les commissions admissibles seront suivies depuis votre espace ambassadeur.</p><p>Vous recevez 10 % de la première facture payée d’un client admissible. La commission devient payable après 30 jours; les versements passent par Stripe après vérification de votre compte.</p>`, "Ouvrir mon espace ambassadeur", "{{{AMBASSADOR_URL}}}"),
      variables: [{ key: "AMBASSADOR_URL", type: "string", fallback: `${APP_ORIGIN}/workspace/ambassadeurs` }],
    },
    {
      name: "Ambassadeurs — Commission enregistrée",
      subject: "Une commission Minerva Flow est en attente",
      html: getTransactionalShell(`<p style="margin:0 0 12px;color:#167f5b;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Programme ambassadeur</p><h1 style="margin:0 0 14px;color:#173d2d;font-family:Georgia,serif;font-size:27px;font-weight:500;line-height:1.25">Une commission a été enregistrée.</h1><p>Une recommandation admissible a généré <strong>{{{COMMISSION_AMOUNT}}}</strong>, soit 10 % de la première facture payée.</p><p>Elle devient payable après le délai de 30 jours, à partir du <strong>{{{PAYABLE_DATE}}}</strong>. Vous pourrez suivre son état et configurer les versements dans votre espace.</p>`, "Voir mes commissions", "{{{AMBASSADOR_URL}}}"),
      variables: [{ key: "COMMISSION_AMOUNT", type: "string", fallback: "0,00 $ CA" }, { key: "PAYABLE_DATE", type: "string", fallback: "la date indiquée dans votre espace" }, { key: "AMBASSADOR_URL", type: "string", fallback: `${APP_ORIGIN}/workspace/ambassadeurs` }],
    },
    {
      name: "Ambassadeurs — Versement envoyé",
      subject: "Votre versement ambassadeur a été envoyé à Stripe",
      html: getTransactionalShell(`<p style="margin:0 0 12px;color:#167f5b;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Programme ambassadeur</p><h1 style="margin:0 0 14px;color:#173d2d;font-family:Georgia,serif;font-size:27px;font-weight:500;line-height:1.25">Votre versement est parti.</h1><p>Un montant de <strong>{{{PAYOUT_AMOUNT}}}</strong> a été envoyé à votre compte Stripe connecté. Stripe dépose ensuite les fonds selon son calendrier bancaire.</p><p>Référence : <span style="font-family:monospace">{{{PAYOUT_REFERENCE}}}</span></p>`, "Consulter mon espace ambassadeur", "{{{AMBASSADOR_URL}}}"),
      variables: [{ key: "PAYOUT_AMOUNT", type: "string", fallback: "0,00 $ CA" }, { key: "PAYOUT_REFERENCE", type: "string", fallback: "consultable dans votre espace" }, { key: "AMBASSADOR_URL", type: "string", fallback: `${APP_ORIGIN}/workspace/ambassadeurs` }],
    },
    {
      name: "Ambassadeurs — Publication UGC approuvée",
      subject: "Votre contenu restaurant est approuvé",
      html: getTransactionalShell(`<p style="margin:0 0 12px;color:#167f5b;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Contenu ambassadeur</p><h1 style="margin:0 0 14px;color:#173d2d;font-family:Georgia,serif;font-size:27px;font-weight:500;line-height:1.25">Votre publication est approuvée.</h1><p>Votre contenu pour <strong>{{{RESTAURANT_NAME}}}</strong> a été approuvé par l’équipe Minerva Flow.</p><p>Merci de mettre en valeur les restaurants avec leur accord et de respecter les règles de divulgation publicitaire indiquées dans le programme.</p>`, "Voir mon contenu", "{{{AMBASSADOR_URL}}}"),
      variables: [{ key: "RESTAURANT_NAME", type: "string", fallback: "le restaurant partenaire" }, { key: "AMBASSADOR_URL", type: "string", fallback: `${APP_ORIGIN}/workspace/ambassadeurs` }],
    },
    {
      name: "Ambassadeurs — Publication UGC à modifier",
      subject: "Une modification est requise pour votre contenu",
      html: getTransactionalShell(`<p style="margin:0 0 12px;color:#167f5b;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Contenu ambassadeur</p><h1 style="margin:0 0 14px;color:#173d2d;font-family:Georgia,serif;font-size:27px;font-weight:500;line-height:1.25">Votre publication demande une modification.</h1><p>Consultez la note de révision dans votre espace ambassadeur, puis soumettez une nouvelle version lorsque les ajustements sont faits.</p>`, "Voir la note de révision", "{{{AMBASSADOR_URL}}}"),
      variables: [{ key: "AMBASSADOR_URL", type: "string", fallback: `${APP_ORIGIN}/workspace/ambassadeurs` }],
    },
    {
      name: "Ambassadeurs — Mise à jour du programme",
      subject: "Le programme ambassadeur Minerva Flow évolue",
      html: getTransactionalShell(`<p style="margin:0 0 12px;color:#167f5b;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Nouveautés Minerva Flow</p><h1 style="margin:0 0 14px;color:#173d2d;font-family:Georgia,serif;font-size:27px;font-weight:500;line-height:1.25">Recommandations et contenu, réunis au même endroit.</h1><p>Votre espace ambassadeur rassemble votre lien de recommandation, les commissions admissibles, la configuration Stripe et les soumissions de contenu pour les restaurants participants.</p><p>Les modalités de commission et d’approbation restent celles affichées dans votre espace.</p>`, "Découvrir le programme", "{{{AMBASSADOR_URL}}}"),
      variables: [{ key: "AMBASSADOR_URL", type: "string", fallback: `${APP_ORIGIN}/workspace/ambassadeurs` }],
    },
  ];

  if (exportMode) {
    const exportName = process.argv.find((arg) => arg.startsWith("--export-name="))?.slice("--export-name=".length);
    console.log(JSON.stringify(exportName ? templatesToSync.filter((template) => template.name === exportName) : templatesToSync));
    return;
  }
  if (!resend) throw new Error("Resend client unavailable");
  console.log("=== Synchronisation des modèles de courriel Minerva Flow vers Resend ===");

  const { data: existingList } = await resend.templates.list({ limit: 100 });
  const existingTemplates = existingList?.data || [];
  console.log(`Templates existants trouvés sur Resend: ${existingTemplates.length}`);

  // Met à jour les modèles en place afin de conserver leurs IDs et alias; crée uniquement les nouveaux modèles.
  for (const tpl of templatesToSync) {
    const existing = existingTemplates.find((item) => item.name === tpl.name);
    console.log(`${existing ? "Mise à jour" : "Création"} du modèle : "${tpl.name}"...`);
    try {
      const payload = {
        name: tpl.name,
        subject: tpl.subject,
        html: tpl.html,
        from: "Minerva Flow <flow@minervaflow.app>",
        replyTo: ["support@minervaflow.app"],
        variables: tpl.variables?.map(({ key, type, fallback }) => type === "number"
          ? { key, type: "number" as const, ...(typeof fallback === "number" ? { fallbackValue: fallback } : {}) }
          : { key, type: "string" as const, ...(typeof fallback === "string" ? { fallbackValue: fallback } : {}) }),
      };
      const res = existing
        ? await resend.templates.update(existing.id, payload)
        : await resend.templates.create(payload).publish();
      if (res.error) {
        console.error(`Erreur de synchronisation "${tpl.name}":`, res.error);
      } else {
        if (existing) {
          const published = await resend.templates.publish(existing.id);
          if (published.error) console.error(`Erreur de publication "${tpl.name}":`, published.error);
        }
        console.log(`Synchronisé : "${tpl.name}" (ID: ${res.data?.id})`);
      }
    } catch (err: unknown) {
      console.error(`Exception de synchronisation "${tpl.name}":`, err instanceof Error ? err.message : String(err));
    }
  }

  // 4. Liste finale
  const { data: finalList } = await resend.templates.list();
  console.log(`\n📋 ${finalList?.data?.length || 0} templates présents dans votre Dashboard Resend :`);
  finalList?.data?.forEach((t) => console.log(`  • ${t.name} (ID: ${t.id})`));
  console.log(`\n${templatesToSync.length} modèles synchronisés et visibles dans le Dashboard Resend.`);
}

syncTemplates().catch((e) => {
  console.error("Erreur générale :", e);
  process.exit(1);
});
