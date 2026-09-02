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
 * Shell Email Moderne avec Emblème Logo & Carte Centrée
 * Inspiré des interfaces de référence : Emblème squircle, carte d'action menthe/crème,
 * étapes en capsules numérotées, métriques d'impact et bouton CTA arrondi.
 */
function luxuryShell({
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
  badgeTone?: "green" | "gold" | "lime";
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
    lime: "background-color: #DFFF5F; color: #0A4531; border: 1px solid #C4E83E;",
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
      .content-cell { padding: 32px 20px 28px !important; }
      .stat-col { display: block !important; width: 100% !important; margin-bottom: 10px !important; }
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
      <td align="center" style="padding: 40px 14px 50px;">
        
        <table role="presentation" class="email-container" width="580" cellpadding="0" cellspacing="0" border="0" style="width: 580px; max-width: 580px; margin: 0 auto;">
          
          <!-- Carte Principale Haute Définition -->
          <tr>
            <td class="content-cell" style="background-color: #FFFEFA; border: 1px solid #E6E0D0; border-radius: 24px; padding: 44px 38px 38px; box-shadow: 0 10px 30px rgba(26, 30, 22, 0.05);">
              
              <!-- Emblème / Logo Officiel de la Compagnie (Squircle centré) -->
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://minervaflow.app/icon-192.png" width="62" height="62" alt="Minerva Flow" style="display: inline-block; border-radius: 17px; box-shadow: 0 4px 16px rgba(22, 127, 91, 0.22); border: 0;" />
              </div>

              <!-- Badge de catégorie centré -->
              <div style="text-align: center; margin-bottom: 18px;">
                <span style="${badgeStyles} display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 5px 14px; border-radius: 999px;">
                  ✦ ${escapeHtml(badgeText)}
                </span>
              </div>

              <!-- Titre Héroïque Centré -->
              <h1 class="font-serif" style="margin: 0 0 14px; font-size: 26px; line-height: 1.3; font-weight: 700; color: #1A1E16; letter-spacing: -0.02em; text-align: center;">
                ${safeTitle}
              </h1>

              <!-- Corps Dynamique & Riche -->
              <div style="font-size: 15px; line-height: 1.68; color: #4A5245;">
                ${contentHtml}
              </div>

              <!-- Bloc KPI / Statistiques Optionnel -->
              ${
                secondaryStatsHtml
                  ? `<div style="margin: 26px 0 20px;">${secondaryStatsHtml}</div>`
                  : ""
              }

              <!-- Bouton d'Action Arrondi Signature (Pill Button Centré) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" class="cta-button" style="display: inline-block; padding: 14px 34px; background-color: #167F5B; background-image: linear-gradient(180deg, #198c64 0%, #167f5b 100%); color: #FFFEFA; text-decoration: none; border-radius: 999px; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; box-shadow: 0 4px 16px rgba(22, 127, 91, 0.32);">
                      ${safeCtaText} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Signature Éditoriale Centrée -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EEE9DB; text-align: center; font-size: 13px; line-height: 1.55; color: #6F786B;">
                <p style="margin: 0; font-weight: 700; color: #1A1E16;">L'équipe Minerva Flow</p>
                <p style="margin: 3px 0 0; font-size: 11.5px; color: #8D9488;">Le standard d'excellence opérationnelle pour restaurants et cafés</p>
              </div>

            </td>
          </tr>

          <!-- Pied de page LCAP Canada -->
          <tr>
            <td style="padding: 26px 10px 0; text-align: center; font-size: 12px; line-height: 1.65; color: #8D9488;">
              <p style="margin: 0 0 6px;">
                <strong style="color: #565F52;">Minerva Flow</strong> · Minerva Technologies Inc.
              </p>
              <p style="margin: 0 0 10px;">
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
 * 1. BIENVENUE (Immédiat) — Confirmation & Décollage opérationnel
 */
export function renderWelcomeEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "bonjour";
  const restaurant = params.restaurantName ? ` pour <strong>${escapeHtml(params.restaurantName)}</strong>` : "";
  const ctaUrl = `${params.appUrl}/onboarding`;

  const title = "Votre cockpit Minerva Flow est prêt";
  const preheader = "Vos ratios financiers, vos clôtures de caisse et votre équipe centralisés en un seul endroit.";

  const contentHtml = `
    <p style="margin: 0 0 16px; text-align: center;">Bonjour ${name}, votre espace${restaurant} est officiellement opérationnel.</p>
    
    <!-- Encadré Héroïque Doux Menthe (Style Check Your Inbox) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EEF8F3; border: 1px solid #D4EADB; border-radius: 18px; margin: 18px 0 24px; text-align: center;">
      <tr>
        <td style="padding: 22px 18px;">
          <div style="display: inline-block; width: 36px; height: 36px; background-color: #FFFFFF; border-radius: 10px; line-height: 36px; font-size: 18px; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(22, 127, 91, 0.12);">
            🚀
          </div>
          <p class="font-serif" style="margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #0E5A40;">
            Initialisation en moins de 3 minutes
          </p>
          <p style="margin: 0; font-size: 13.5px; line-height: 1.5; color: #4A5245;">
            Configurez votre menu, connectez votre système POS et lancez votre premier service sans tableurs complexes.
          </p>
        </td>
      </tr>
    </table>

    <!-- Section WHAT'S NEXT / ÉTAPES -->
    <div style="margin-top: 24px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #8D9488; margin: 0 0 14px; text-align: center;">
        Vos prochaines étapes
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" width="32" style="padding-bottom: 12px;">
            <span style="display: inline-block; width: 24px; height: 24px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 12px; font-weight: 700; line-height: 24px;">1</span>
          </td>
          <td style="padding-bottom: 12px; font-size: 14px; line-height: 1.5; color: #1A1E16;">
            <strong>Profil de l'établissement</strong> — Confirmez vos horaires et paramètres de taxes.
          </td>
        </tr>
        <tr>
          <td valign="top" width="32" style="padding-bottom: 12px;">
            <span style="display: inline-block; width: 24px; height: 24px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 12px; font-weight: 700; line-height: 24px;">2</span>
          </td>
          <td style="padding-bottom: 12px; font-size: 14px; line-height: 1.5; color: #1A1E16;">
            <strong>Connexion Caisse (POS)</strong> — Synchronisez Square, Lightspeed ou Stripe.
          </td>
        </tr>
        <tr>
          <td valign="top" width="32">
            <span style="display: inline-block; width: 24px; height: 24px; background-color: #E2EFE7; color: #167F5B; border-radius: 50%; text-align: center; font-size: 12px; font-weight: 700; line-height: 24px;">3</span>
          </td>
          <td style="font-size: 14px; line-height: 1.5; color: #1A1E16;">
            <strong>Équipe &amp; Quarts</strong> — Invitez vos chefs et gérants pour le suivi salarial.
          </td>
        </tr>
      </table>
    </div>
  `;

  const secondaryStatsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
      <tr>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 12px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">2 min</span>
          <span style="font-size: 11px; color: #565F52; font-weight: 600;">Saisie de clôture</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 12px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">100%</span>
          <span style="font-size: 11px; color: #565F52; font-weight: 600;">Ratios en direct</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 12px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">24/7</span>
          <span style="font-size: 11px; color: #565F52; font-weight: 600;">Assistant Flow AI</span>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nVotre espace Minerva Flow est prêt.\n\nPour démarrer :\n1. Configurez votre établissement\n2. Connectez votre caisse (Square/Lightspeed/Stripe)\n3. Invitez votre équipe\n\nAccédez à votre cockpit : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Décollage Opérationnel",
      badgeTone: "green",
      contentHtml,
      secondaryStatsHtml,
      ctaText: "Accéder à mon espace",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 2. PREMIÈRE ACTIVATION (Jour 1 / 24h) — La saisie en 2 minutes & Prime Cost
 */
export function renderActivationEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/days`;

  const title = "Maîtrisez votre Prime Cost en 2 minutes";
  const preheader = "Saisissez 3 chiffres et visualisez instantanément votre rentabilité brute.";

  const contentHtml = `
    <p style="margin: 0 0 16px; text-align: center;">Bonjour ${name}, découvrez la métrique reine de la restauration.</p>

    <!-- Encadré Formule Stylisé -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EEF8F3; border: 1px solid #D4EADB; border-radius: 18px; margin: 18px 0 22px; text-align: center;">
      <tr>
        <td style="padding: 22px 18px;">
          <div style="display: inline-block; width: 36px; height: 36px; background-color: #FFFFFF; border-radius: 10px; line-height: 36px; font-size: 18px; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(22, 127, 91, 0.12);">
            ⚖️
          </div>
          <p class="font-serif" style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0E5A40;">
            Prime Cost = Coût Matières + Masse Salariale
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4A5245;">
            Cible idéale : <strong>&lt; 58 % à 62 %</strong> des ventes nettes pour sécuriser vos bénéfices.
          </p>
        </td>
      </tr>
    </table>

    <div style="margin-top: 20px;">
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #8D9488; margin: 0 0 14px; text-align: center;">
        Comment tester sur votre service
      </p>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" width="28" style="padding-bottom: 10px; font-size: 15px;">⚡</td>
          <td style="padding-bottom: 10px; font-size: 14px; line-height: 1.5; color: #1A1E16;">
            <strong>Onglet Journées</strong> : Entrez vos ventes et heures de service.
          </td>
        </tr>
        <tr>
          <td valign="top" width="28" style="font-size: 15px;">📊</td>
          <td style="font-size: 14px; line-height: 1.5; color: #1A1E16;">
            <strong>Alertes en direct</strong> : Minerva Flow signale tout dépassement de ratio.
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nCalculez votre Prime Cost en 2 minutes avec Minerva Flow et maîtrisez vos marges réelles dès aujourd'hui.\n\nSaisir ma première journée : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Activation Quotidienne",
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
 * 3. DÉMONSTRATION FONCTION CLÉ (Jour 3) — Flow AI & Ingénierie de Menu
 */
export function renderFeatureHighlightEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/assistant`;

  const title = "Votre copilote Flow AI au service de vos marges";
  const preheader = "Posez une question en langage naturel et obtenez des analyses financières instantanées.";

  const contentHtml = `
    <p style="margin: 0 0 16px; text-align: center;">Bonjour ${name}, obtenez des réponses financières instantanées 24/7.</p>

    <!-- Simulation d'interaction Flow AI (Style Dark Card) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1A1E16; border-radius: 18px; margin: 18px 0 22px; color: #F5F1E6;">
      <tr>
        <td style="padding: 22px 20px;">
          <div style="margin-bottom: 10px;">
            <span style="background-color: #DFFF5F; color: #0A4531; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">Exemple d'invite Flow AI</span>
          </div>
          <p class="font-serif" style="margin: 0 0 10px; font-size: 15px; font-style: italic; color: #DFFF5F;">
            « Quels sont nos 3 plats les plus rentables cette semaine ? »
          </p>
          <div style="border-top: 1px solid #33392A; padding-top: 10px; font-size: 13px; line-height: 1.6; color: #D7DEC9;">
            ✦ <strong>Réponse Flow AI :</strong> « Votre Tartare dégage 74% de marge brute. Recommandation : ajuster la portion d'accompagnement pour stabiliser le coût matière. »
          </div>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez comment Flow AI agit comme votre directeur financier virtuel pour optimiser vos menus.\n\nTester Flow AI : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Intelligence Artificielle",
      badgeTone: "lime",
      contentHtml,
      ctaText: "Discuter avec Flow AI",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 4. AIDE ET SUPPORT PERSONNALISÉ (Jour 5) — Diagnostics & Solutions
 */
export function renderSupportCheckinEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/support`;

  const title = "Besoin d'un coup de pouce pour votre espace ?";
  const preheader = "Notre équipe d'experts en restauration est là pour adapter Minerva Flow à vos spécificités.";

  const contentHtml = `
    <p style="margin: 0 0 16px; text-align: center;">Bonjour ${name}, notre équipe basée à Montréal est à vos côtés.</p>

    <!-- 3 FAQ rapides -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
      <tr>
        <td style="padding: 14px 16px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px;">
          <strong style="color: #167F5B; font-size: 13.5px;">1. Import automatique des ventes</strong>
          <p style="margin: 4px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.5;">
            Connectez Square, Lightspeed ou Stripe dans <em>Paramètres > Intégrations</em>.
          </p>
        </td>
      </tr>
      <tr><td height="8"></td></tr>
      <tr>
        <td style="padding: 14px 16px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px;">
          <strong style="color: #167F5B; font-size: 13.5px;">2. Gestion des quarts et masse salariale</strong>
          <p style="margin: 4px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.5;">
            Définissez les taux horaires et suivez le ratio de masse salariale en temps réel.
          </p>
        </td>
      </tr>
      <tr><td height="8"></td></tr>
      <tr>
        <td style="padding: 14px 16px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px;">
          <strong style="color: #167F5B; font-size: 13.5px;">3. Onboarding guidé de 15 minutes</strong>
          <p style="margin: 4px 0 0; font-size: 12.5px; color: #565F52; line-height: 1.5;">
            Répondez simplement à ce courriel avec vos disponibilités.
          </p>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBesoin d'assistance pour configurer votre établissement sur Minerva Flow ? Notre équipe est à votre disposition.\n\nAccéder au support : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Accompagnement Dédié",
      badgeTone: "gold",
      contentHtml,
      ctaText: "Consulter le centre d'aide",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 5. ÉTUDES DE CAS RÉELLES (Jour 7) — 6 Profils Audités & Rétention 75% à 100%
 * Source : https://minervaflow.framer.website/
 */
export function renderCaseStudyEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/overview`;

  const title = "Du petit café au grand bistro : 6 cas réels";
  const preheader = "Découvrez comment 6 commerces québécois génèrent entre 75 % et 100 % de rétention.";

  const contentHtml = `
    <p style="margin: 0 0 16px; text-align: center;">Bonjour ${name}, voici les résultats réels observés sur 6 profils d'exploitation :</p>

    <!-- Grille des 3 Échelles de Maturité -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 18px 0 20px; border: 1px solid #E6E0D0; border-radius: 16px; overflow: hidden; background-color: #FAF8F2;">
      <!-- Échelle 1 : Petit qui débute -->
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #DCECE3; color: #0E5A40; font-size: 10.5px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Petit · Câlin Café &amp; Poutine &amp; Cie (18 j)
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 15px; font-weight: 700; color: #1A1E16;">
            75 % de clients revenus 2 fois ou +
          </p>
          <p style="margin: 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            <em>« 15 des 20 clients sont déjà revenus sans budget marketing. »</em> — Denis Paquette
          </p>
        </td>
      </tr>

      <!-- Échelle 2 : Moyen établi -->
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #F6EFD9; color: #8A6414; font-size: 10.5px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Moyen · Café Lucide &amp; Burger Nomade (30 j)
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 15px; font-weight: 700; color: #1A1E16;">
            100 % de rétention &amp; 4,4 visites moyennes
          </p>
          <p style="margin: 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            <em>« Le tableau de clients me dit qui revient d'un coup d'œil. »</em> — Théo Bernier
          </p>
        </td>
      </tr>

      <!-- Échelle 3 : Grand mature -->
      <tr>
        <td style="padding: 16px;">
          <div style="display: inline-block; padding: 2px 8px; background-color: #DFFF5F; color: #0A4531; font-size: 10.5px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Grand · Bureau &amp; Brew &amp; Le Trèfle Doré (43 j)
          </div>
          <p class="font-serif" style="margin: 6px 0 2px; font-size: 15px; font-weight: 700; color: #1A1E16;">
            9,1 visites / client &amp; 86 392 $ CA
          </p>
          <p style="margin: 0; font-size: 12.5px; color: #565F52; line-height: 1.45;">
            <em>« Détection prédictive de l'attrition des habitués. »</em> — Marc-André Fournier
          </p>
        </td>
      </tr>
    </table>
  `;

  const secondaryStatsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 12px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">75 %</span>
          <span style="font-size: 11px; color: #565F52; font-weight: 600;">Rétention palier 1</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 12px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">100 %</span>
          <span style="font-size: 11px; color: #565F52; font-weight: 600;">Rétention paliers 2-3</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 12px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">×3,6</span>
          <span style="font-size: 11px; color: #565F52; font-weight: 600;">Gain fréquence</span>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez les 6 études de cas de Minerva Flow (Câlin Café, Poutine & Cie, Café Lucide, Burger Nomade, Bureau & Brew, Le Trèfle Doré) : 75% à 100% de rétention.\n\nConsulter mon tableau de bord : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "6 Cas Réels",
      badgeTone: "gold",
      contentHtml,
      secondaryStatsHtml,
      ctaText: "Ouvrir mon tableau de bord",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 6. CONVERSION / FORFAITS FLOW PRO (Jour 10-14) — Débloquer la puissance totale
 */
export function renderConversionEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/settings`;

  const title = "Passez à la vitesse supérieure avec Flow Pro";
  const preheader = "Débloquez les analyses prédictives, les connexions POS multi-sites et le moteur de fidélité.";

  const contentHtml = `
    <p style="margin: 0 0 16px; text-align: center;">Bonjour ${name}, débloquez l'automatisation complète de votre exploitation.</p>

    <!-- Grille des fonctionnalités Pro -->
    <div style="background-color: #FAF8F2; border: 1px solid #E6E0D0; border-radius: 16px; padding: 20px 18px; margin: 18px 0 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; line-height: 1.55;">
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 8px;"><strong>POS &amp; Banques illimités</strong> — Square, Lightspeed, Stripe sans friction.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 8px;"><strong>Assistant Flow AI illimité</strong> — Audits de rentabilité et détection d'anomalies.</td>
        </tr>
        <tr>
          <td valign="top" width="22" style="color: #167F5B; font-weight: 700;">✓</td>
          <td><strong>Moteur de fidélité &amp; CRM</strong> — Récompenses automatiques et QR studio.</td>
        </tr>
      </table>
    </div>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez Minerva Flow Pro : synchronisations illimitées, Flow AI avancé et moteur de fidélisation.\n\nExplorer les forfaits : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Offres Pro",
      badgeTone: "lime",
      contentHtml,
      ctaText: "Découvrir les forfaits Flow Pro",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 7. RÉACTIVATION (Inactivité 7+ jours) — Retour sans culpabilité
 */
export function renderReactivationEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/overview`;

  const title = "Votre cockpit est toujours prêt pour le service";
  const preheader = "Reprenez le pilotage de vos marges là où vous vous étiez arrêté.";

  const contentHtml = `
    <p style="margin: 0 0 16px; text-align: center;">Bonjour ${name}, votre espace est sauvegardé et prêt pour votre prochain service.</p>

    <!-- Nouveautés ajoutées récemment -->
    <div style="background-color: #F8F6EF; border-left: 4px solid #167F5B; padding: 16px 18px; border-radius: 10px; margin: 18px 0 20px;">
      <p class="font-serif" style="margin: 0 0 6px; font-size: 14.5px; font-weight: 700; color: #1A1E16;">
        ✦ Nouveautés déployées :
      </p>
      <p style="margin: 0 0 4px; font-size: 13px; color: #4A5245;">
        • Nouveaux rapports de rentabilité par plat et quart de travail.
      </p>
      <p style="margin: 0; font-size: 13px; color: #4A5245;">
        • Export comptable automatisé en un clic.
      </p>
    </div>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nVotre espace Minerva Flow est toujours prêt. Reprenez le pilotage de vos opérations en un clic.\n\nAccéder à mon espace : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Reprise de Service",
      badgeTone: "green",
      contentHtml,
      ctaText: "Reprendre mon activité",
      ctaUrl,
      appUrl: params.appUrl,
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
