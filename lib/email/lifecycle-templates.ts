export type LifecycleStep =
  | "welcome"
  | "activation"
  | "feature_highlight"
  | "support_checkin"
  | "case_study"
  | "conversion"
  | "reactivation";

export interface LifecycleTemplateParams {
  firstName?: string | null;
  restaurantName?: string | null;
  appUrl: string;
  hasRestaurant?: boolean;
  hasServiceDays?: boolean;
  hasPosConnected?: boolean;
}

export interface LoyaltyEmailParams {
  customerName?: string | null;
  restaurantName?: string | null;
  pointsBalance?: number | string;
  tierName?: string;
  nextTierPoints?: number | string;
  rewardTitle?: string;
  retentionMessage?: string;
  portalUrl?: string;
  appUrl?: string;
}

export interface WeeklyReportParams {
  firstName?: string | null;
  restaurantName?: string | null;
  weekRange?: string;
  totalSales?: string;
  primeCostRatio?: string;
  foodCostRatio?: string;
  laborCostRatio?: string;
  totalHoursWorked?: string;
  topItem1?: { name: string; qty: number; margin: string };
  topItem2?: { name: string; qty: number; margin: string };
  topItem3?: { name: string; qty: number; margin: string };
  comparisonPreviousWeek?: string;
  appUrl?: string;
}

export interface SpecialOfferParams {
  firstName?: string | null;
  restaurantName?: string | null;
  planName?: string;
  discountSummary?: string;
  featureHighlights?: string[];
  ctaUrl?: string;
  appUrl?: string;
}

export interface EmailRenderOutput {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shell Email Haute Couture & Sobre — Minerva Flow
 * Structure dense, élégante, typographie soignée (New York serif + Plus Jakarta Sans).
 * Zéro buzzword, zéro effet glow, aucune nuance lime.
 */
function cleanShell({
  title,
  preheader,
  badgeText,
  badgeTone = "green",
  contentHtml,
  ctaText,
  ctaUrl,
  appUrl,
  secondaryStatsHtml,
  isPromotional = false,
}: {
  title: string;
  preheader: string;
  badgeText: string;
  badgeTone?: "green" | "gold" | "slate";
  contentHtml: string;
  ctaText: string;
  ctaUrl: string;
  appUrl: string;
  secondaryStatsHtml?: string;
  isPromotional?: boolean;
}): string {
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  const safeCtaText = escapeHtml(ctaText);

  const badgeStyles = {
    green: "background-color: #E2EFE7; color: #0E5A40; border: 1px solid #B8DCC8;",
    gold: "background-color: #F6EFD9; color: #8A6414; border: 1px solid #E5D6A7;",
    slate: "background-color: #ECEEEA; color: #3A4338; border: 1px solid #D6DAD3;",
  }[badgeTone];

  return `<!doctype html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #F5F1E6 !important;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      color: #1A1E16;
    }
    .font-serif {
      font-family: 'New York', 'Playfair Display', Georgia, serif !important;
    }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-cell { padding: 28px 16px 24px !important; }
      .stat-col { display: block !important; width: 100% !important; margin-bottom: 8px !important; }
      .cta-button { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1E6;">
  
  <!-- Preheader invisible -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #F5F1E6;">
    ${safePreheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F1E6;">
    <tr>
      <td align="center" style="padding: 32px 12px 40px;">
        
        <table role="presentation" class="email-container" width="580" cellpadding="0" cellspacing="0" border="0" style="width: 580px; max-width: 580px; margin: 0 auto;">
          
          <!-- Carte Principale -->
          <tr>
            <td class="content-cell" style="background-color: #FFFEFA; border: 1px solid #E6E0D0; border-radius: 20px; padding: 38px 34px 32px;">
              
              <!-- Emblème / Logo Officiel Minerva (Squircle centré sobre) -->
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://minervaflow.app/icon-192.png" width="56" height="56" alt="Minerva Flow" style="display: inline-block; border-radius: 14px; border: 0;" />
              </div>

              <!-- Badge de contexte -->
              <div style="text-align: center; margin-bottom: 14px;">
                <span style="${badgeStyles} display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 12px; border-radius: 999px;">
                  ${escapeHtml(badgeText)}
                </span>
              </div>

              <!-- Titre Principal -->
              <h1 class="font-serif" style="margin: 0 0 14px; font-size: 24px; line-height: 1.35; font-weight: 700; color: #1A1E16; letter-spacing: -0.01em; text-align: center;">
                ${safeTitle}
              </h1>

              <!-- Corps de texte dense -->
              <div style="font-size: 14px; line-height: 1.65; color: #4A5245;">
                ${contentHtml}
              </div>

              <!-- Bloc KPI / Grille Optionnelle -->
              ${
                secondaryStatsHtml
                  ? `<div style="margin: 22px 0 16px;">${secondaryStatsHtml}</div>`
                  : ""
              }

              <!-- Bouton d'action épuré sans effet glow -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 26px 0 18px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" class="cta-button" style="display: inline-block; padding: 13px 32px; background-color: #167F5B; color: #FFFEFA; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 600;">
                      ${safeCtaText} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #EEE9DB; text-align: center; font-size: 12px; line-height: 1.5; color: #6F786B;">
                <p style="margin: 0; font-weight: 600; color: #1A1E16;">L'équipe Minerva Flow</p>
                <p style="margin: 2px 0 0; font-size: 11px; color: #8D9488;">Gestion de rentabilité pour cafés et restaurants</p>
              </div>

            </td>
          </tr>

          <!-- Pied de page LCAP Canada -->
          <tr>
            <td style="padding: 20px 10px 0; text-align: center; font-size: 11.5px; line-height: 1.6; color: #8D9488;">
              <p style="margin: 0 0 4px;">
                <strong style="color: #565F52;">Minerva Flow</strong> · Minerva Technologies Inc.
              </p>
              <p style="margin: 0 0 6px;">
                Montréal (Québec), Canada · Standards LCAP / CASL
              </p>
              <p style="margin: 0;">
                ${
                  isPromotional
                    ? `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #8D9488; text-decoration: underline;">Se désabonner</a> · `
                    : ""
                }
                <a href="${appUrl}" style="color: #8D9488; text-decoration: underline;">Ouvrir l'application</a> · 
                <a href="mailto:support@minervaflow.app" style="color: #8D9488; text-decoration: underline;">Support</a>
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

/**
 * 1. BIENVENUE (J+0) — Démarrage opérationnel structuré & complet
 */
export function renderWelcomeEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "bonjour";
  const restaurant = params.restaurantName ? ` pour <strong>${escapeHtml(params.restaurantName)}</strong>` : "";
  const ctaUrl = `${params.appUrl}/onboarding`;

  const title = "Bienvenue sur Minerva Flow";
  const preheader = "Vos ventes, vos coûts matières et vos heures de travail au même endroit.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, votre compte${restaurant} est prêt.</p>
    
    <!-- Encadré doux de démarrage -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EEF8F3; border: 1px solid #D4EADB; border-radius: 14px; margin: 14px 0 18px; text-align: center;">
      <tr>
        <td style="padding: 18px 16px;">
          <p class="font-serif" style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #0E5A40;">
            Ce que vous pouvez faire dès aujourd'hui
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4A5245;">
            Centralisez vos rapports de fin de journée, calculez votre coût de revient en temps réel et suivez les heures de service de votre équipe sans tableur manuel.
          </p>
        </td>
      </tr>
    </table>

    <!-- 3 étapes détaillées -->
    <div style="margin-top: 18px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #8D9488; margin: 0 0 10px; text-align: center;">
        Plan de mise en place recommandé
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" width="28" style="padding-bottom: 10px;">
            <span style="display: inline-block; width: 20px; height: 20px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 11px; font-weight: 700; line-height: 20px;">1</span>
          </td>
          <td style="padding-bottom: 10px; font-size: 13px; line-height: 1.5; color: #1A1E16;">
            <strong>Paramètres &amp; Taxes</strong> — Validez vos taux de TPS/TVQ, vos horaires de service et vos catégories de menu.
          </td>
        </tr>
        <tr>
          <td valign="top" width="28" style="padding-bottom: 10px;">
            <span style="display: inline-block; width: 20px; height: 20px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 11px; font-weight: 700; line-height: 20px;">2</span>
          </td>
          <td style="padding-bottom: 10px; font-size: 13px; line-height: 1.5; color: #1A1E16;">
            <strong>Système de caisse</strong> — Synchronisez Square, Lightspeed ou Stripe pour importer automatiquement vos fermetures.
          </td>
        </tr>
        <tr>
          <td valign="top" width="28">
            <span style="display: inline-block; width: 20px; height: 20px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 11px; font-weight: 700; line-height: 20px;">3</span>
          </td>
          <td style="font-size: 13px; line-height: 1.5; color: #1A1E16;">
            <strong>Équipe &amp; Taux horaires</strong> — Invitez vos chefs et gérants pour assurer un suivi exact de la masse salariale.
          </td>
        </tr>
      </table>
    </div>
  `;

  const secondaryStatsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 12px;">
      <tr>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; padding: 10px; text-align: center;">
          <span class="font-serif" style="font-size: 18px; font-weight: 700; color: #167F5B; display: block;">2 min</span>
          <span style="font-size: 10.5px; color: #565F52; font-weight: 600;">Saisie de clôture</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; padding: 10px; text-align: center;">
          <span class="font-serif" style="font-size: 18px; font-weight: 700; color: #167F5B; display: block;">100 %</span>
          <span style="font-size: 10.5px; color: #565F52; font-weight: 600;">Visibilité des coûts</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; padding: 10px; text-align: center;">
          <span class="font-serif" style="font-size: 18px; font-weight: 700; color: #167F5B; display: block;">7 j / 7</span>
          <span style="font-size: 10.5px; color: #565F52; font-weight: 600;">Historique accessible</span>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBienvenue sur Minerva Flow. Votre compte est prêt.\n\nPour démarrer :\n1. Configurez vos paramètres\n2. Associez votre caisse (Square / Lightspeed / Stripe)\n3. Invitez votre équipe\n\nAccédez à votre compte : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Bienvenue",
      badgeTone: "green",
      contentHtml,
      secondaryStatsHtml,
      ctaText: "Ouvrir mon compte",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 2. ACTIVATION (J+1) — Coûts principaux & Ratios de restauration
 */
export function renderActivationEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/days`;

  const title = "Suivre vos coûts de nourriture et de personnel";
  const preheader = "Deux indicateurs clés pour évaluer la rentabilité réelle de votre service.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, découvrez comment suivre simplement vos deux plus grands postes de dépenses.</p>

    <!-- Formule & Seuils -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EEF8F3; border: 1px solid #D4EADB; border-radius: 14px; margin: 14px 0 18px; text-align: center;">
      <tr>
        <td style="padding: 18px 16px;">
          <p class="font-serif" style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #0E5A40;">
            Coûts principaux = Nourriture &amp; Boissons + Masse Salariale
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4A5245;">
            Dans la restauration, l'objectif est de maintenir ce total sous les <strong>60 % des ventes nettes</strong> pour préserver vos bénéfices après le loyer et les frais fixes.
          </p>
        </td>
      </tr>
    </table>

    <!-- Tableau de référence -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E6E0D0; border-radius: 10px; overflow: hidden; font-size: 12.5px; margin: 16px 0;">
      <tr style="background-color: #F8F6EF;">
        <th align="left" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Indicateur</th>
        <th align="center" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Cible moyenne</th>
        <th align="left" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Impact</th>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Coût matières (Food cost)</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">28 % à 32 %</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Portions &amp; achats</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Coût salarial (Labor cost)</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">28 % à 32 %</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Heures de service</td>
      </tr>
      <tr style="background-color: #FAF8F2;">
        <td style="padding: 8px 10px; font-weight: 700; color: #0E5A40;">Coûts principaux combinés</td>
        <td align="center" style="padding: 8px 10px; font-weight: 700; color: #0E5A40;">&lt; 60 %</td>
        <td style="padding: 8px 10px; color: #0E5A40; font-weight: 600;">Marge nette sécurisée</td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nSuivez vos coûts de nourriture et de personnel avec Minerva Flow pour maintenir vos dépenses sous les 60 % de vos ventes.\n\nEnregistrer une journée : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Coûts de revient",
      badgeTone: "green",
      contentHtml,
      ctaText: "Enregistrer une journée de service",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 3. ANALYSE ET ASSISTANT (J+3) — Marges par plat et questions de gestion
 */
export function renderFeatureHighlightEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/assistant`;

  const title = "Poser une question sur vos ventes et vos marges";
  const preheader = "Obtenez des réponses claires sur la rentabilité de vos plats et de vos services.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, analysez vos marges réelles par élément de menu sans calcul fastidieux.</p>

    <!-- Exemple concret de question/réponse -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF8F2; border: 1px solid #E6E0D0; border-radius: 12px; margin: 14px 0 18px;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #8D9488; text-transform: uppercase;">Exemple de question posée :</p>
          <p class="font-serif" style="margin: 0 0 10px; font-size: 14.5px; font-style: italic; color: #167F5B;">
            « Quels sont nos 3 plats les plus rentables cette semaine ? »
          </p>
          <div style="border-top: 1px solid #EEE9DB; padding-top: 10px; font-size: 13px; line-height: 1.55; color: #3A4338;">
            <strong>Réponse :</strong><br />
            1. Tartare de bœuf — Marge brute : <strong>74 %</strong> (142 ventes)<br />
            2. Pâtes fraîches maison — Marge brute : <strong>71 %</strong> (98 ventes)<br />
            3. Mocktail signature — Marge brute : <strong>83 %</strong> (210 ventes)
          </div>
        </td>
      </tr>
    </table>

    <div style="margin-top: 16px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #8D9488; margin: 0 0 10px; text-align: center;">
        D'autres questions courantes
      </p>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #565F52;">
        <li>« Quel quart de travail a eu le coût salarial le plus élevé ? »</li>
        <li>« Quel est l'impact d'une hausse de 5 % sur le prix de notre plat du midi ? »</li>
        <li>« Quelles recettes ont le coût matière le plus sensible aux prix actuels ? »</li>
      </ul>
    </div>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nPosez directement vos questions sur vos ventes et marges avec l'assistant Minerva Flow.\n\nPoser une question : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Assistant de gestion",
      badgeTone: "slate",
      contentHtml,
      ctaText: "Poser une question à l'assistant",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 4. AIDE ET SUPPORT (J+5) — Accompagnement technique et opérationnel
 */
export function renderSupportCheckinEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/support`;

  const title = "Besoin d'aide pour configurer votre compte ?";
  const preheader = "Notre équipe à Montréal est disponible pour vous accompagner.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, notre équipe est disponible si vous rencontrez le moindre blocage.</p>

    <!-- 4 piliers d'aide -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 14px 0;">
      <tr>
        <td style="padding: 12px 14px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 13px;">1. Connexion de votre caisse</strong>
          <p style="margin: 3px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            Liez Square, Lightspeed ou Stripe dans <em>Paramètres > Intégrations</em> pour automatiser l'import.
          </p>
        </td>
      </tr>
      <tr><td height="6"></td></tr>
      <tr>
        <td style="padding: 12px 14px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 13px;">2. Paramétrage des salaires</strong>
          <p style="margin: 3px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            Renseignez les postes et taux horaires de votre équipe pour un calcul précis du coût de main-d'œuvre.
          </p>
        </td>
      </tr>
      <tr><td height="6"></td></tr>
      <tr>
        <td style="padding: 12px 14px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 13px;">3. Export comptable</strong>
          <p style="margin: 3px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            Générez des rapports synthétiques mensuels prêts à être transmis à votre comptable.
          </p>
        </td>
      </tr>
      <tr><td height="6"></td></tr>
      <tr>
        <td style="padding: 12px 14px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 13px;">4. Échange direct avec notre équipe</strong>
          <p style="margin: 3px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            Répondez directement à ce courriel avec vos questions ou disponibilités.
          </p>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBesoin d'aide pour configurer votre établissement sur Minerva Flow ? Notre équipe est disponible.\n\nAccéder au centre d'aide : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Aide & Support",
      badgeTone: "gold",
      contentHtml,
      ctaText: "Accéder au centre d'aide",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 5. ÉTUDES DE CAS (J+7) — 6 Commerces d'ici (DENSE & DÉTAILLÉ)
 * Source : https://minervaflow.framer.website/
 */
export function renderCaseStudyEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/overview`;

  const title = "Comment 6 commerces d'ici utilisent Minerva Flow";
  const preheader = "Exemples concrets de 3 cafés et 3 restaurants de quartier à Montréal.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, voici les données observées sur 6 établissements en conditions réelles :</p>

    <!-- Les 3 Paliers d'Établissements -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 14px 0; border: 1px solid #E6E0D0; border-radius: 12px; overflow: hidden; background-color: #FAF8F2;">
      <!-- Palier 1 : Petit qui débute -->
      <tr>
        <td style="padding: 14px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #DCECE3; color: #0E5A40; font-size: 10px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Petit · Câlin Café &amp; Poutine &amp; Cie (18 jours)
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 14px; font-weight: 700; color: #1A1E16;">
            75 % des clients sont revenus au moins une 2e fois
          </p>
          <p style="margin: 0; font-size: 12px; color: #565F52; line-height: 1.45;">
            Panier moyen : 19,98 $ (café) à 44,65 $ (resto) · 15 clients sur 20 sont revenus sans budget marketing.
          </p>
        </td>
      </tr>

      <!-- Palier 2 : Moyen établi -->
      <tr>
        <td style="padding: 14px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #F6EFD9; color: #8A6414; font-size: 10px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Moyen · Café Lucide &amp; Burger Nomade (30 jours)
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 14px; font-weight: 700; color: #1A1E16;">
            100 % de rétention &amp; 4,4 visites moyennes par client
          </p>
          <p style="margin: 0; font-size: 12px; color: #565F52; line-height: 1.45;">
            Panier moyen : 37,22 $ à 86,84 $ · Fréquence doublée et suivi immédiat des habitués au tableau de bord.
          </p>
        </td>
      </tr>

      <!-- Palier 3 : Grand mature -->
      <tr>
        <td style="padding: 14px;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #ECEEEA; color: #3A4338; font-size: 10px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Grand · Bureau &amp; Brew &amp; Le Trèfle Doré (43 jours)
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 14px; font-weight: 700; color: #1A1E16;">
            9,1 visites par client &amp; 86 392 $ de chiffre d'affaires
          </p>
          <p style="margin: 0; font-size: 12px; color: #565F52; line-height: 1.45;">
            Panier moyen : 81,80 $ à 206,64 $ · Détection rapide des baisses de fréquentation sur la clientèle fidèle.
          </p>
        </td>
      </tr>
    </table>
  `;

  const secondaryStatsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; padding: 10px; text-align: center;">
          <span class="font-serif" style="font-size: 18px; font-weight: 700; color: #167F5B; display: block;">75 %</span>
          <span style="font-size: 10.5px; color: #565F52; font-weight: 600;">Retour palier 1</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; padding: 10px; text-align: center;">
          <span class="font-serif" style="font-size: 18px; font-weight: 700; color: #167F5B; display: block;">100 %</span>
          <span style="font-size: 10.5px; color: #565F52; font-weight: 600;">Retour paliers 2-3</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; padding: 10px; text-align: center;">
          <span class="font-serif" style="font-size: 18px; font-weight: 700; color: #167F5B; display: block;">×3,6</span>
          <span style="font-size: 10.5px; color: #565F52; font-weight: 600;">Fréquence de visite</span>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez comment 6 cafés et restaurants québécois utilisent Minerva Flow : 75% à 100% de retour client.\n\nVoir mon tableau de bord : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Exemples concrets",
      badgeTone: "gold",
      contentHtml,
      secondaryStatsHtml,
      ctaText: "Voir mon tableau de bord",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 6. OPTIONS AVANCÉES & FORFAITS (J+10) — Grille comparative transparente
 */
export function renderConversionEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/settings`;

  const title = "Les options avancées de Minerva Flow";
  const preheader = "Multi-établissements, synchronisations automatiques et programme fidélité.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, voici les fonctionnalités disponibles selon l'envergure de votre établissement :</p>

    <!-- Tableau comparatif des options -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E6E0D0; border-radius: 10px; overflow: hidden; font-size: 12.5px; margin: 14px 0 18px;">
      <tr style="background-color: #F8F6EF;">
        <th align="left" style="padding: 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Fonctionnalité</th>
        <th align="center" style="padding: 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Standard</th>
        <th align="center" style="padding: 10px; border-bottom: 1px solid #E6E0D0; color: #167F5B;">Flow Pro</th>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Clôtures de service &amp; Coûts de revient</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Inclus</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">Illimité</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Synchronisation caisse POS</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">1 caisse</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">Multi-caisses</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Assistant de gestion de menu</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Essentiel</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">Avancé</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Programme de fidélité numérique &amp; QR</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">—</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">Inclus</td>
      </tr>
      <tr style="background-color: #FAF8F2;">
        <td style="padding: 8px 10px; color: #1A1E16;">Gestion des accès équipe &amp; rôles</td>
        <td align="center" style="padding: 8px 10px;">Jusqu'à 3</td>
        <td align="center" style="padding: 8px 10px; font-weight: 700; color: #167F5B;">Illimité</td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12.5px; color: #6F786B; text-align: center;">
      Sans engagement de durée · Changement de formule possible à tout moment.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez les options de Minerva Flow : connexions illimitées, assistant avancé et fidélité.\n\nVoir les options : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Options de service",
      badgeTone: "slate",
      contentHtml,
      ctaText: "Découvrir les options",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 7. RETOUR AUX DONNÉES (Inactivité 7+ jours) — Sans culpabilité
 */
export function renderReactivationEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/overview`;

  const title = "Vos données de service restent accessibles";
  const preheader = "Reprenez la saisie de vos journées quand vous le souhaitez.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, votre espace reste enregistré et prêt pour votre prochain service.</p>

    <!-- Rappel des données disponibles -->
    <div style="background-color: #F8F6EF; border-left: 3px solid #167F5B; padding: 14px 16px; border-radius: 8px; margin: 14px 0 16px;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #1A1E16; font-weight: 600;">
        Retrouvez en un coup d'œil :
      </p>
      <p style="margin: 0 0 4px; font-size: 12.5px; color: #4A5245;">
        • Vos rapports de ventes précédents et moyennes de journées.
      </p>
      <p style="margin: 0 0 4px; font-size: 12.5px; color: #4A5245;">
        • Vos fiches recettes et vos marges calculées par plat.
      </p>
      <p style="margin: 0; font-size: 12.5px; color: #4A5245;">
        • Vos paramètres d'équipe et vos taux horaires.
      </p>
    </div>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nVos données de service sur Minerva Flow restent accessibles.\n\nAccéder à mon compte : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Rappel",
      badgeTone: "green",
      contentHtml,
      ctaText: "Ouvrir mon compte",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 8. RAPPORT HEBDOMADAIRE (Chaque semaine) — Synthèse de performance chiffrée
 */
export function renderWeeklyReportEmail(params: WeeklyReportParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const restaurant = params.restaurantName ? escapeHtml(params.restaurantName) : "votre établissement";
  const week = params.weekRange ? escapeHtml(params.weekRange) : "la semaine passée";
  const ctaUrl = `${params.appUrl ?? "https://minervaflow.app"}/reports`;

  const totalSales = params.totalSales ?? "14 820 $";
  const primeCostRatio = params.primeCostRatio ?? "58,4 %";
  const foodCostRatio = params.foodCostRatio ?? "29,6 %";
  const laborCostRatio = params.laborCostRatio ?? "28,8 %";
  const totalHours = params.totalHoursWorked ?? "246 h";
  const comparison = params.comparisonPreviousWeek ?? "+3,2 % vs semaine précédente";

  const title = `Rapport de la semaine : ${restaurant}`;
  const preheader = `Ventes nettes : ${totalSales} · Prime Cost : ${primeCostRatio} · ${comparison}`;

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, voici le résumé de l'activité pour ${week} :</p>

    <!-- Résumé Chiffré 2 Colonnes -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 14px 0 16px;">
      <tr>
        <td class="stat-col" width="49%" style="background-color: #EEF8F3; border: 1px solid #D4EADB; border-radius: 12px; padding: 14px; text-align: center;">
          <span style="font-size: 11px; font-weight: 700; color: #0E5A40; text-transform: uppercase;">Ventes nettes</span>
          <span class="font-serif" style="font-size: 22px; font-weight: 700; color: #0E5A40; display: block; margin: 4px 0 2px;">${escapeHtml(totalSales)}</span>
          <span style="font-size: 11px; color: #167F5B; font-weight: 600;">${escapeHtml(comparison)}</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="49%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 14px; text-align: center;">
          <span style="font-size: 11px; font-weight: 700; color: #565F52; text-transform: uppercase;">Prime Cost moyen</span>
          <span class="font-serif" style="font-size: 22px; font-weight: 700; color: #167F5B; display: block; margin: 4px 0 2px;">${escapeHtml(primeCostRatio)}</span>
          <span style="font-size: 11px; color: #565F52;">Cible &lt; 60 % atteinte</span>
        </td>
      </tr>
    </table>

    <!-- Décomposition des coûts -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E6E0D0; border-radius: 10px; overflow: hidden; font-size: 12.5px; margin-bottom: 16px;">
      <tr style="background-color: #FAF8F2;">
        <th align="left" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Poste de dépense</th>
        <th align="center" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Ratio</th>
        <th align="right" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Volume</th>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Coût matières (Nourriture &amp; Boissons)</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">${escapeHtml(foodCostRatio)}</td>
        <td align="right" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Achats semaine</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px;">Masse salariale totale</td>
        <td align="center" style="padding: 8px 10px; font-weight: 700; color: #167F5B;">${escapeHtml(laborCostRatio)}</td>
        <td align="right" style="padding: 8px 10px; color: #565F52;">${escapeHtml(totalHours)} travaillées</td>
      </tr>
    </table>

    <!-- Top plats de la semaine -->
    <div style="background-color: #FAF8F2; border: 1px solid #E6E0D0; border-radius: 10px; padding: 12px 14px;">
      <p style="margin: 0 0 6px; font-size: 11.5px; font-weight: 700; color: #1A1E16; text-transform: uppercase;">
        Top 3 des plats vendus cette semaine :
      </p>
      <p style="margin: 0 0 3px; font-size: 12.5px; color: #4A5245;">
        1. <strong>${escapeHtml(params.topItem1?.name ?? "Tartare de saumon")}</strong> — ${params.topItem1?.qty ?? 84} ventes (Marge : ${escapeHtml(params.topItem1?.margin ?? "72 %")})
      </p>
      <p style="margin: 0 0 3px; font-size: 12.5px; color: #4A5245;">
        2. <strong>${escapeHtml(params.topItem2?.name ?? "Burger maison")}</strong> — ${params.topItem2?.qty ?? 76} ventes (Marge : ${escapeHtml(params.topItem2?.margin ?? "68 %")})
      </p>
      <p style="margin: 0; font-size: 12.5px; color: #4A5245;">
        3. <strong>${escapeHtml(params.topItem3?.name ?? "Salade repas")}</strong> — ${params.topItem3?.qty ?? 52} ventes (Marge : ${escapeHtml(params.topItem3?.margin ?? "79 %")})
      </p>
    </div>
  `;

  const text = `Bonjour ${name},\n\nRapport de la semaine pour ${restaurant} :\nVentes nettes : ${totalSales}\nPrime Cost : ${primeCostRatio}\nHeures travaillées : ${totalHours}\n\nConsulter le rapport complet : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Rapport Hebdomadaire",
      badgeTone: "green",
      contentHtml,
      ctaText: "Consulter le rapport complet",
      ctaUrl,
      appUrl: params.appUrl ?? "https://minervaflow.app",
    }),
    text,
  };
}

/**
 * 9. OFFRE SPÉCIALE & MISE À NIVEAU (Offres) — Transparente et sobre
 */
export function renderSpecialOfferEmail(params: SpecialOfferParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const restaurant = params.restaurantName ? ` pour ${escapeHtml(params.restaurantName)}` : "";
  const plan = params.planName ? escapeHtml(params.planName) : "l'abonnement annuel";
  const discount = params.discountSummary ? escapeHtml(params.discountSummary) : "2 mois offerts sur l'abonnement annuel";
  const ctaUrl = params.ctaUrl ?? `${params.appUrl ?? "https://minervaflow.app"}/settings`;

  const title = `Offre spéciale : ${discount}`;
  const preheader = `Accédez à toutes les options de gestion avancées${restaurant}.`;

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, découvrez notre formule annuelle pour optimiser la gestion de votre établissement.</p>

    <!-- Encadré Offre -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; margin: 14px 0 18px; text-align: center;">
      <tr>
        <td style="padding: 18px 16px;">
          <p class="font-serif" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #167F5B;">
            ${discount}
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4A5245;">
            Bénéficiez de la synchronisation de toutes vos caisses, du programme fidélité complet et de l'assistant de rentabilité de menu sans limite.
          </p>
        </td>
      </tr>
    </table>

    <div style="margin: 16px 0;">
      <p style="font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #8D9488; margin: 0 0 10px; text-align: center;">
        Ce qui est inclus dans cette formule
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.55;">
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 8px;"><strong>Connexions de caisse illimitées</strong> — Square, Lightspeed et Stripe synchronisés en temps réel.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 8px;"><strong>Calcul automatique des coûts de menu</strong> — Marge brute par ingrédient et recette.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 8px;"><strong>Programme fidélité &amp; CRM</strong> — Cartes numériques, points automatiques et relances.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td><strong>Support dédié à Montréal</strong> — Assistance par courriel et accompagnement direct.</td>
        </tr>
      </table>
    </div>
  `;

  const text = `Bonjour ${name},\n\nProfitez de l'offre spéciale : ${discount}.\n\nAccéder à l'offre : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Offre Spéciale",
      badgeTone: "gold",
      contentHtml,
      ctaText: "Découvrir l'offre",
      ctaUrl,
      appUrl: params.appUrl ?? "https://minervaflow.app",
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 10. FIDÉLISATION RELANCE CLIENT (ULTRA DENSE & RICHE)
 * Remplace l'ancien email vide de relance de fidélité.
 */
export function renderLoyaltyRetentionEmail(params: LoyaltyEmailParams): EmailRenderOutput {
  const customer = params.customerName ? escapeHtml(params.customerName) : "Bonjour";
  const restaurant = params.restaurantName ? escapeHtml(params.restaurantName) : "{{{RESTAURANT_NAME}}}";
  const points = params.pointsBalance !== undefined ? String(params.pointsBalance) : "{{{POINTS_BALANCE}}}";
  const tier = params.tierName ?? "Habitué";
  const nextPoints = params.nextTierPoints ?? "15";
  const reward = params.rewardTitle ?? "{{{REWARD_TITLE}}}";
  const message = params.retentionMessage ?? "{{{RETENTION_MESSAGE}}}";
  const ctaUrl = params.portalUrl ?? "{{{PORTAL_URL}}}";
  const appUrl = params.appUrl ?? "https://minervaflow.app";

  const title = `Vos points de fidélité vous attendent chez ${restaurant}`;
  const preheader = `Vous avez ${points} points accumulés. Votre récompense est disponible.`;

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">${customer}, vous faites partie de nos clients réguliers chez <strong>${restaurant}</strong>.</p>

    <!-- Message personnalisé du restaurateur -->
    <div style="background-color: #FAF8F2; border-left: 3px solid #167F5B; padding: 14px 16px; border-radius: 8px; margin: 12px 0 18px; font-size: 13.5px; line-height: 1.55; color: #3A4338;">
      ${message}
    </div>

    <!-- Carte de Fidélité Stylisée -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EEF8F3; border: 1px solid #B8DCC8; border-radius: 14px; margin: 16px 0 18px; text-align: center;">
      <tr>
        <td style="padding: 20px 18px;">
          <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #0E5A40; letter-spacing: 0.05em; text-transform: uppercase; background-color: #FFFFFF; padding: 3px 10px; border-radius: 999px; margin-bottom: 8px;">
            Carte Numérique · Palier ${escapeHtml(tier)}
          </span>
          <p class="font-serif" style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #167F5B;">
            ${points} points
          </p>
          <p style="margin: 0; font-size: 12.5px; color: #4A5245;">
            Plus que <strong>${nextPoints} points</strong> pour atteindre le palier <em>Privilégié</em>.
          </p>
        </td>
      </tr>
    </table>

    <!-- Récompense Déblocable -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E6E0D0; border-radius: 10px; overflow: hidden; background-color: #FFFEFA; margin-bottom: 16px;">
      <tr>
        <td style="padding: 14px 16px;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #8A6414; text-transform: uppercase;">
            Récompense disponible à votre prochain passage :
          </p>
          <p class="font-serif" style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #1A1E16;">
            ✦ ${reward}
          </p>
          <p style="margin: 0; font-size: 12px; color: #6F786B; line-height: 1.45;">
            Présentez simplement votre nom ou ce courriel au comptoir ou à votre serveur pour appliquer votre avantage.
          </p>
        </td>
      </tr>
    </table>

    <!-- Paliers de Fidélité -->
    <div style="margin-top: 14px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #8D9488; margin: 0 0 8px; text-align: center;">
        Les 4 paliers de fidélité chez ${restaurant}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 11.5px; color: #565F52;">
        <tr>
          <td width="25%" align="center" style="padding: 6px; background-color: #F8F6EF; border-radius: 6px;">
            <strong>Découverte</strong><br />1 visite
          </td>
          <td width="2%"></td>
          <td width="25%" align="center" style="padding: 6px; background-color: #DCECE3; border-radius: 6px; font-weight: 700; color: #0E5A40;">
            <strong>Habitué</strong><br />2 à 5 visites
          </td>
          <td width="2%"></td>
          <td width="25%" align="center" style="padding: 6px; background-color: #F8F6EF; border-radius: 6px;">
            <strong>Privilégié</strong><br />6 à 10 visites
          </td>
          <td width="2%"></td>
          <td width="25%" align="center" style="padding: 6px; background-color: #F8F6EF; border-radius: 6px;">
            <strong>Ambassadeur</strong><br />11+ visites
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = `${customer},\n\nVos points de fidélité vous attendent chez ${restaurant} !\nSolde actuel : ${points} points\nRécompense : ${reward}\n\n${message}\n\nVoir ma carte : ${ctaUrl}`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Fidélité",
      badgeTone: "green",
      contentHtml,
      ctaText: "Voir ma carte et mes points",
      ctaUrl,
      appUrl,
      isPromotional: true,
    }),
    text,
  };
}

export function renderLifecycleEmail(step: LifecycleStep, params: LifecycleTemplateParams): EmailRenderOutput {
  switch (step) {
    case "welcome":
      return renderWelcomeEmail(params);
    case "activation":
      return renderActivationEmail(params);
    case "feature_highlight":
      return renderFeatureHighlightEmail(params);
    case "support_checkin":
      return renderSupportCheckinEmail(params);
    case "case_study":
      return renderCaseStudyEmail(params);
    case "conversion":
      return renderConversionEmail(params);
    case "reactivation":
      return renderReactivationEmail(params);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FACTURATION — essai qui se termine, échec de paiement, relance de
// paiement, quota IA atteint, reconquête post-annulation.
// Même coquille (cleanShell) que la séquence lifecycle ci-dessus, envoyées
// depuis lib/email/billing-lifecycle.ts (déclenchées par le webhook Stripe
// pour les étapes ponctuelles, par le cron billing-lifecycle-engine pour
// les relances différées).
// ═══════════════════════════════════════════════════════════════════════

export type BillingLifecycleStep =
  | "trial_ending"
  | "payment_failed"
  | "payment_reminder"
  | "quota_exceeded"
  | "winback";

export interface BillingLifecycleParams {
  firstName?: string | null;
  restaurantName?: string | null;
  appUrl: string;
  planName?: string;
  trialEndDate?: string;
  amountDue?: string;
}

function renderTrialEndingEmail(params: BillingLifecycleParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/billing`;
  const title = "Votre essai Minerva Flow se termine bientôt";
  const preheader = "Ajoutez une méthode de paiement pour continuer sans interruption.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">
      ${name}, votre période d'essai${params.trialEndDate ? ` se termine le <strong>${escapeHtml(params.trialEndDate)}</strong>` : " se termine bientôt"}.
      Votre carte enregistrée prendra le relais automatiquement — aucune action requise si tout est en ordre.
    </p>
    <p style="margin: 0; text-align: center; font-size: 12.5px; color: #6F786B;">
      Besoin de changer de forfait ou de méthode de paiement avant la fin de l'essai ? Tout se gère depuis votre page de facturation.
    </p>
  `;
  const text = `${name}, votre essai Minerva Flow se termine bientôt. Gérez votre facturation : ${ctaUrl}`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Essai gratuit",
      badgeTone: "gold",
      contentHtml,
      ctaText: "Voir ma facturation",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

function renderPaymentFailedEmail(params: BillingLifecycleParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/billing`;
  const title = "Le paiement de votre abonnement a échoué";
  const preheader = "Mettez à jour votre méthode de paiement pour éviter une interruption de service.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">
      ${name}, le dernier paiement de votre abonnement Minerva Flow${params.amountDue ? ` (${escapeHtml(params.amountDue)})` : ""} n'a pas pu être traité.
      Votre accès reste actif pour l'instant — mettez à jour votre carte pour éviter toute interruption.
    </p>
  `;
  const text = `${name}, le paiement de votre abonnement Minerva Flow a échoué. Mettez à jour votre carte : ${ctaUrl}`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Paiement à régulariser",
      badgeTone: "slate",
      contentHtml,
      ctaText: "Mettre à jour ma carte",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

function renderPaymentReminderEmail(params: BillingLifecycleParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/billing`;
  const title = "Rappel : votre abonnement est toujours en attente de paiement";
  const preheader = "Quelques jours restent avant une possible suspension de service.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">
      ${name}, nous n'avons toujours pas pu traiter le paiement de votre abonnement Minerva Flow.
      Réglez ceci dès maintenant pour garder un accès ininterrompu à vos outils de gestion.
    </p>
  `;
  const text = `${name}, votre abonnement Minerva Flow est toujours en attente de paiement. Réglez ceci ici : ${ctaUrl}`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Dernier rappel",
      badgeTone: "gold",
      contentHtml,
      ctaText: "Régulariser mon paiement",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

function renderQuotaExceededEmail(params: BillingLifecycleParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/billing`;
  const title = "Votre quota Flow AI du mois est atteint";
  const preheader = "Passez à un forfait supérieur pour continuer à utiliser l'IA sans interruption.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">
      ${name}, votre workspace${params.planName ? ` (forfait ${escapeHtml(params.planName)})` : ""} a atteint son quota mensuel de tokens Flow AI.
      Le reste de Minerva Flow continue de fonctionner normalement — seules les réponses de l'assistant IA sont mises en pause jusqu'au renouvellement, ou vous pouvez passer à un forfait supérieur dès maintenant.
    </p>
  `;
  const text = `${name}, votre quota Flow AI mensuel est atteint. Passez à un forfait supérieur : ${ctaUrl}`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Quota Flow AI",
      badgeTone: "slate",
      contentHtml,
      ctaText: "Voir les forfaits",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

function renderWinbackEmail(params: BillingLifecycleParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/billing`;
  const title = "Une place vous attend chez Minerva Flow";
  const preheader = "Revenez quand vous voulez — rien n'a été supprimé.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">
      ${name}, votre abonnement Minerva Flow${params.restaurantName ? ` pour ${escapeHtml(params.restaurantName)}` : ""} est terminé depuis un moment.
      Si le contexte a changé de votre côté, votre compte et vos données sont toujours là — réactiver votre abonnement ne prend qu'une minute.
    </p>
    <p style="margin: 0; text-align: center; font-size: 12.5px; color: #6F786B;">
      Une question, un frein en particulier ? Répondez simplement à ce courriel.
    </p>
  `;
  const text = `${name}, votre abonnement Minerva Flow est terminé. Réactivez-le quand vous voulez : ${ctaUrl}`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "On vous garde une place",
      badgeTone: "green",
      contentHtml,
      ctaText: "Réactiver mon abonnement",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

export function renderBillingLifecycleEmail(
  step: BillingLifecycleStep,
  params: BillingLifecycleParams
): EmailRenderOutput {
  switch (step) {
    case "trial_ending":
      return renderTrialEndingEmail(params);
    case "payment_failed":
      return renderPaymentFailedEmail(params);
    case "payment_reminder":
      return renderPaymentReminderEmail(params);
    case "quota_exceeded":
      return renderQuotaExceededEmail(params);
    case "winback":
      return renderWinbackEmail(params);
  }
}
