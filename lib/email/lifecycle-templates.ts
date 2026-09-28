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

function safeSubjectText(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
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
  const preheader = "Configurez votre espace Minerva Flow et commencez par vos outils prioritaires.";

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
            Configurez les outils dont votre établissement a besoin : menu, commandes, équipe, inventaire et fidélisation.
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
            <strong>Votre établissement</strong> — Vérifiez les coordonnées, les horaires et les paramètres disponibles dans votre espace.
          </td>
        </tr>
        <tr>
          <td valign="top" width="28" style="padding-bottom: 10px;">
            <span style="display: inline-block; width: 20px; height: 20px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 11px; font-weight: 700; line-height: 20px;">2</span>
          </td>
          <td style="padding-bottom: 10px; font-size: 13px; line-height: 1.5; color: #1A1E16;">
            <strong>Menu et inventaire</strong> — Ajoutez vos articles, recettes et ingrédients pour organiser vos opérations.
          </td>
        </tr>
        <tr>
          <td valign="top" width="28">
            <span style="display: inline-block; width: 20px; height: 20px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 11px; font-weight: 700; line-height: 20px;">3</span>
          </td>
          <td style="font-size: 13px; line-height: 1.5; color: #1A1E16;">
            <strong>Équipe</strong> — Invitez les personnes qui vous aident à gérer le restaurant et attribuez leurs accès.
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBienvenue sur Minerva Flow. Votre compte est prêt.\n\nPour démarrer, vérifiez les paramètres de votre établissement, ajoutez vos articles au menu et invitez votre équipe.\n\nAccédez à votre compte : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: cleanShell({
      title,
      preheader,
      badgeText: "Bienvenue",
      badgeTone: "green",
      contentHtml,
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

  const title = "Comprendre vos coûts de nourriture et de personnel";
  const preheader = "Consignez les coûts associés à votre établissement et consultez leur évolution.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, découvrez comment suivre simplement vos deux plus grands postes de dépenses.</p>

    <!-- Formule & Seuils -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EEF8F3; border: 1px solid #D4EADB; border-radius: 14px; margin: 14px 0 18px; text-align: center;">
      <tr>
        <td style="padding: 18px 16px;">
          <p class="font-serif" style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #0E5A40;">
            Deux catégories de coûts à suivre
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4A5245;">
            Le coût des ingrédients et celui de la main-d’œuvre varient selon votre menu, vos horaires et votre modèle d’affaires. Minerva Flow vous aide à les consigner au même endroit.
          </p>
        </td>
      </tr>
    </table>

    <!-- Principales catégories de coûts -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E6E0D0; border-radius: 10px; overflow: hidden; font-size: 12.5px; margin: 16px 0;">
      <tr style="background-color: #F8F6EF;">
        <th align="left" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Indicateur</th>
        <th align="left" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Exemples</th>
        <th align="left" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">À vérifier</th>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Coût matières (Food cost)</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Ingrédients et boissons</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Quantités, prix et recettes</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Coût salarial (Labor cost)</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Heures et salaires</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Horaires et taux saisis</td>
      </tr>
      <tr style="background-color: #FAF8F2;">
        <td colspan="3" style="padding: 8px 10px; font-weight: 700; color: #0E5A40;">Utilisez ces indicateurs comme repères internes et adaptez-les à votre établissement.</td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nConsignez vos coûts d’ingrédients et de main-d’œuvre avec Minerva Flow. Les résultats dépendent des données que vous saisissez et du modèle de votre établissement.\n\nEnregistrer une journée : ${ctaUrl}\n\nL'équipe Minerva Flow`;

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

    <!-- Questions possibles -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF8F2; border: 1px solid #E6E0D0; border-radius: 12px; margin: 14px 0 18px;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #8D9488; text-transform: uppercase;">Questions à explorer :</p>
          <p class="font-serif" style="margin: 0 0 10px; font-size: 14.5px; font-style: italic; color: #167F5B;">
            « Quels articles ont généré le plus de ventes pendant la période sélectionnée ? »
          </p>
          <div style="border-top: 1px solid #EEE9DB; padding-top: 10px; font-size: 13px; line-height: 1.55; color: #3A4338;">
            Les résultats dépendent des données disponibles dans votre compte. Vérifiez les chiffres et leur période avant de les utiliser pour prendre une décision.
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
  const preheader = "Quelques repères pour configurer votre espace Minerva Flow.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, notre équipe est disponible si vous rencontrez le moindre blocage.</p>

    <!-- Repères de configuration -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 14px 0;">
      <tr>
        <td style="padding: 12px 14px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 13px;">1. Informations de l’établissement</strong>
          <p style="margin: 3px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            Vérifiez le nom, l’adresse et les paramètres visibles dans votre espace.
          </p>
        </td>
      </tr>
      <tr><td height="6"></td></tr>
      <tr>
        <td style="padding: 12px 14px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 13px;">2. Accès de l’équipe</strong>
          <p style="margin: 3px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            Invitez les personnes qui participent à la gestion et choisissez les rôles adaptés.
          </p>
        </td>
      </tr>
      <tr><td height="6"></td></tr>
      <tr>
        <td style="padding: 12px 14px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 13px;">3. Menu et inventaire</strong>
          <p style="margin: 3px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            Ajoutez vos articles et ingrédients pour organiser vos opérations quotidiennes.
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

  const title = "Des outils adaptés aux réalités de la restauration";
  const preheader = "Exemples illustratifs pour cafés, restaurants et groupes d’établissements.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, voici trois façons dont les équipes peuvent organiser leur travail avec Minerva Flow. Ces exemples illustrent des usages possibles.</p>

    <!-- Les 3 Paliers d'Établissements -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 14px 0; border: 1px solid #E6E0D0; border-radius: 12px; overflow: hidden; background-color: #FAF8F2;">
      <!-- Palier 1 : Petit qui débute -->
      <tr>
        <td style="padding: 14px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #DCECE3; color: #0E5A40; font-size: 10px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Café ou comptoir
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 14px; font-weight: 700; color: #1A1E16;">
            Organiser le menu et les ingrédients
          </p>
          <p style="margin: 0; font-size: 12px; color: #565F52; line-height: 1.45;">
            Regroupez les articles et les recettes de votre établissement pour retrouver plus facilement vos informations.
          </p>
        </td>
      </tr>

      <!-- Palier 2 : Moyen établi -->
      <tr>
        <td style="padding: 14px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #F6EFD9; color: #8A6414; font-size: 10px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Restaurant de quartier
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 14px; font-weight: 700; color: #1A1E16;">
            Suivre la fidélité de la clientèle
          </p>
          <p style="margin: 0; font-size: 12px; color: #565F52; line-height: 1.45;">
            Consultez les cartes, visites et récompenses disponibles pour les clients inscrits à votre programme.
          </p>
        </td>
      </tr>

      <!-- Palier 3 : Grand mature -->
      <tr>
        <td style="padding: 14px;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #ECEEEA; color: #3A4338; font-size: 10px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Groupe de restaurants
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 14px; font-weight: 700; color: #1A1E16;">
            Coordonner plusieurs établissements
          </p>
          <p style="margin: 0; font-size: 12px; color: #565F52; line-height: 1.45;">
            Rassemblez les établissements concernés dans un workspace et partagez l’accès avec votre équipe.
          </p>
        </td>
      </tr>
    </table>
  `;

  const secondaryStatsHtml = "";

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez des exemples illustratifs pour organiser un café, un restaurant ou plusieurs établissements avec Minerva Flow.\n\nVoir mon espace : ${ctaUrl}\n\nL'équipe Minerva Flow`;

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

  const title = "Les outils Minerva Flow pour votre établissement";
  const preheader = "Découvrez les fonctions disponibles dans votre compte et votre workspace.";

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">Bonjour ${name}, voici quelques outils que vous pouvez explorer dans votre espace Minerva Flow :</p>

    <!-- Tableau comparatif des options -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E6E0D0; border-radius: 10px; overflow: hidden; font-size: 12.5px; margin: 14px 0 18px;">
      <tr style="background-color: #F8F6EF;"><th align="left" style="padding: 10px;border-bottom:1px solid #E6E0D0;color:#1A1E16">Espace</th><th align="left" colspan="2" style="padding:10px;border-bottom:1px solid #E6E0D0;color:#1A1E16">À découvrir</th></tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Menu</td><td colspan="2" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Gérez vos articles et leurs informations.</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Commandes</td><td colspan="2" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Consultez et gérez les commandes accessibles à votre compte.</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Inventaire</td><td colspan="2" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Suivez les ingrédients et les stocks configurés.</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Fidélisation</td><td colspan="2" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Consultez le programme et les clients inscrits.</td>
      </tr>
      <tr style="background-color: #FAF8F2;">
        <td style="padding: 8px 10px; color: #1A1E16;">Workspace</td><td colspan="2" style="padding: 8px 10px;">Regroupez les établissements et gérez les accès d’équipe.</td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12.5px; color: #6F786B; text-align: center;">
      Les fonctions visibles dépendent des accès associés à votre compte.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez les outils de Minerva Flow pour le menu, les commandes, l’inventaire, la fidélisation et les workspaces. Les fonctions visibles dépendent des accès de votre compte.\n\nExplorer mon espace : ${ctaUrl}\n\nL'équipe Minerva Flow`;

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

  const totalSales = params.totalSales ?? "—";
  const primeCostRatio = params.primeCostRatio ?? "—";
  const foodCostRatio = params.foodCostRatio ?? "—";
  const laborCostRatio = params.laborCostRatio ?? "—";
  const totalHours = params.totalHoursWorked ?? "—";
  const comparison = params.comparisonPreviousWeek ?? "Comparaison non disponible";
  const topItems = [params.topItem1, params.topItem2, params.topItem3].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const topItemHtml = topItems.length
    ? topItems.map((item, index) => `<p style="margin:0 0 3px;font-size:12.5px;color:#4A5245">${index + 1}. <strong>${escapeHtml(item.name)}</strong> — ${item.qty} ventes${item.margin ? ` (marge : ${escapeHtml(item.margin)})` : ""}</p>`).join("")
    : `<p style="margin:0;font-size:12.5px;color:#565F52">Aucun article n’est disponible pour cette période.</p>`;

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
          <span style="font-size: 11px; color: #565F52;">Selon les données saisies</span>
        </td>
      </tr>
    </table>

    <!-- Décomposition des coûts -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #E6E0D0; border-radius: 10px; overflow: hidden; font-size: 12.5px; margin-bottom: 16px;">
      <tr style="background-color: #FAF8F2;">
        <th align="left" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Poste de dépense</th>
        <th align="center" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Ratio</th>
        <th align="right" style="padding: 8px 10px; border-bottom: 1px solid #E6E0D0; color: #1A1E16;">Données</th>
      </tr>
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB;">Coût matières (Nourriture &amp; Boissons)</td>
        <td align="center" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; font-weight: 700; color: #167F5B;">${escapeHtml(foodCostRatio)}</td>
        <td align="right" style="padding: 8px 10px; border-bottom: 1px solid #EEE9DB; color: #565F52;">Données saisies</td>
      </tr>
      <tr>
        <td style="padding: 8px 10px;">Masse salariale totale</td>
        <td align="center" style="padding: 8px 10px; font-weight: 700; color: #167F5B;">${escapeHtml(laborCostRatio)}</td>
        <td align="right" style="padding: 8px 10px; color: #565F52;">${escapeHtml(totalHours)}</td>
      </tr>
    </table>

    <!-- Top plats de la semaine -->
    <div style="background-color: #FAF8F2; border: 1px solid #E6E0D0; border-radius: 10px; padding: 12px 14px;">
      <p style="margin: 0 0 6px; font-size: 11.5px; font-weight: 700; color: #1A1E16; text-transform: uppercase;">
        Articles les plus vendus :
      </p>
      ${topItemHtml}
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
  const plan = params.planName ? escapeHtml(params.planName) : "votre espace Minerva Flow";
  const discount = params.discountSummary ? escapeHtml(params.discountSummary) : "Consultez les options actuellement offertes dans votre espace.";
  const ctaUrl = params.ctaUrl ?? `${params.appUrl ?? "https://minervaflow.app"}/settings`;

  const title = params.discountSummary
    ? `Offre Minerva Flow : ${safeSubjectText(params.discountSummary)}${params.restaurantName ? ` pour ${safeSubjectText(params.restaurantName)}` : ""}`
    : "Découvrez les options de votre compte";
  const preheader = `Consultez les fonctionnalités et modalités applicables à ${plan}${restaurant}.`;

  const contentHtml = `
    <p style="margin: 0 0 14px; text-align: center;">${name}, retrouvez les fonctionnalités et les modalités de votre compte Minerva Flow.</p>

    <!-- Encadré Offre -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; margin: 14px 0 18px; text-align: center;">
      <tr>
        <td style="padding: 18px 16px;">
          <p class="font-serif" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #167F5B;">
            ${discount}
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4A5245;">
            Votre espace rassemble les outils disponibles pour gérer votre établissement et sa relation avec ses clients.
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
            <td style="padding-bottom: 8px;"><strong>Opérations quotidiennes</strong> — consultez vos commandes, votre inventaire et votre activité.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 8px;"><strong>Menu et rentabilité</strong> — gérez votre menu et suivez les indicateurs disponibles dans votre espace.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 8px;"><strong>Fidélisation</strong> — consultez les outils de fidélité et les cartes clients de votre établissement.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td><strong>Accompagnement</strong> — contactez notre équipe si vous avez une question sur votre compte.</td>
        </tr>
      </table>
    </div>
  `;

  const text = `Bonjour ${name},\n\n${discount}\n\nConsultez les options de votre compte : ${ctaUrl}\n\nL'équipe Minerva Flow`;

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
  const points = params.pointsBalance !== undefined ? escapeHtml(String(params.pointsBalance)) : "{{{POINTS_BALANCE}}}";
  const tier = params.tierName ? escapeHtml(params.tierName) : "";
  const nextPoints = params.nextTierPoints ?? "—";
  const reward = params.rewardTitle ? escapeHtml(params.rewardTitle) : "Consultez les récompenses disponibles dans votre carte.";
  const message = params.retentionMessage ? escapeHtml(params.retentionMessage) : "{{{RETENTION_MESSAGE}}}";
  const ctaUrl = params.portalUrl ?? "{{{PORTAL_URL}}}";
  const appUrl = params.appUrl ?? "https://minervaflow.app";

  const title = `Vos points de fidélité vous attendent chez ${restaurant}`;
  const preheader = `Consultez le solde et les récompenses de votre carte chez ${restaurant}.`;

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
            Carte Numérique${tier ? ` · Palier ${tier}` : ""}
          </span>
          <p class="font-serif" style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #167F5B;">
            ${points} points
          </p>
    <p style="margin: 0; font-size: 12.5px; color: #4A5245;">
            ${nextPoints === "—" ? "Consultez votre carte pour connaître le prochain objectif." : `Plus que <strong>${escapeHtml(String(nextPoints))} points</strong> avant votre prochain palier.`}
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
