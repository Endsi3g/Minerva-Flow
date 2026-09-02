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
 * Shell Email Haute Couture & Éditorial — Minerva Flow
 * Aligné avec l'identité de marque : https://minervaflow.framer.website/
 * Typographie : New York / Playfair Display (Titres & Chiffres) + Plus Jakarta Sans (Corps)
 * Palette : Fond papier crème #F5F1E6, Carte surface #FFFEFA, Vert Émeraude #167F5B, Forêt #0E5A40, Encre #1A1E16, Doré #AB7D1F
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
    green: "background-color: #DCECE3; color: #0E5A40; border: 1px solid #B8DCC8;",
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
      .content-cell { padding: 28px 18px 24px !important; }
      .stat-col { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .stack-row { display: block !important; width: 100% !important; }
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
        
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; margin: 0 auto;">
          
          <!-- En-tête supérieur de marque -->
          <tr>
            <td style="padding: 0 8px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span class="font-serif" style="font-size: 22px; font-weight: 700; color: #1A1E16; letter-spacing: -0.02em;">
                      Minerva <span style="color: #167F5B;">Flow</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #565F52; background-color: #EEE9DB; padding: 5px 12px; border-radius: 999px; display: inline-block;">
                      Édition Restauration
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Carte Principale Haute Définition -->
          <tr>
            <td class="content-cell" style="background-color: #FFFEFA; border: 1px solid #E6E0D0; border-radius: 20px; padding: 40px 36px 36px; box-shadow: 0 8px 24px rgba(26, 30, 22, 0.04);">
              
              <!-- Badge de catégorie stylisé -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
                <tr>
                  <td style="${badgeStyles} font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 6px 14px; border-radius: 999px;">
                    ✦ ${escapeHtml(badgeText)}
                  </td>
                </tr>
              </table>

              <!-- Titre Héroïque Serif -->
              <h1 class="font-serif" style="margin: 0 0 18px; font-size: 26px; line-height: 1.3; font-weight: 700; color: #1A1E16; letter-spacing: -0.02em;">
                ${safeTitle}
              </h1>

              <!-- Corps Dynamique & Riche -->
              <div style="font-size: 15px; line-height: 1.68; color: #4A5245;">
                ${contentHtml}
              </div>

              <!-- Bloc KPI / Statistiques Optionnel -->
              ${
                secondaryStatsHtml
                  ? `<div style="margin: 28px 0 24px;">${secondaryStatsHtml}</div>`
                  : ""
              }

              <!-- Bouton d'Action Primaire Signature -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0 20px;">
                <tr>
                  <td align="left">
                    <a href="${ctaUrl}" class="cta-button" style="display: inline-block; padding: 14px 30px; background-color: #167F5B; background-image: linear-gradient(180deg, #188a63 0%, #167f5b 100%); color: #FFFEFA; text-decoration: none; border-radius: 12px; font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em; box-shadow: 0 4px 14px rgba(22, 127, 91, 0.32);">
                      ${safeCtaText} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Signature Éditoriale -->
              <div style="margin-top: 32px; padding-top: 22px; border-top: 1px solid #EEE9DB; font-size: 13.5px; line-height: 1.55; color: #6F786B;">
                <p style="margin: 0 0 4px;">Avec toute notre rigueur,</p>
                <p style="margin: 0; font-weight: 700; color: #1A1E16;">L'équipe Minerva Flow</p>
                <p style="margin: 2px 0 0; font-size: 12px; color: #8D9488;">Cockpit d'exploitation & d'intelligence financière pour restaurants et cafés</p>
              </div>

            </td>
          </tr>

          <!-- Pied de page LCAP Canada -->
          <tr>
            <td style="padding: 28px 10px 0; text-align: center; font-size: 12px; line-height: 1.65; color: #8D9488;">
              <p style="margin: 0 0 6px;">
                <strong style="color: #565F52;">Minerva Flow</strong> · Minerva Technologies Inc.
              </p>
              <p style="margin: 0 0 10px;">
                Montréal (Québec), Canada · Le standard d'excellence opérationnelle en restauration
              </p>
              <p style="margin: 0;">
                ${
                  isPromotional
                    ? `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #8D9488; text-decoration: underline;">Se désabonner de ces annonces</a> · `
                    : ""
                }
                <a href="${appUrl}" style="color: #8D9488; text-decoration: underline;">Ouvrir l'application</a> · 
                <a href="mailto:support@minervaflow.app" style="color: #8D9488; text-decoration: underline;">Contacter le support</a>
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

  const title = "Bienvenue sur Minerva Flow — Votre cockpit est prêt";
  const preheader = "Vos ratios financiers, vos clôtures de caisse et votre équipe centralisés en un seul endroit.";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Bonjour ${name},</p>
    <p style="margin: 0 0 18px;">
      Votre espace <strong>Minerva Flow</strong>${restaurant} est officiellement déployé. Vous disposez désormais d'un standard d'excellence conçu sur-mesure pour les restaurateurs, cafés et groupes d'ici.
    </p>

    <!-- Carte des 3 étapes d'initialisation -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FBF9F3; border: 1px solid #E6E0D0; border-radius: 14px; margin: 22px 0 20px;">
      <tr>
        <td style="padding: 22px 20px;">
          <p class="font-serif" style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #167F5B;">
            🚀 Vos 3 actions prioritaires :
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" width="28" style="padding-bottom: 14px;">
                <span style="display: inline-block; width: 22px; height: 22px; background-color: #167F5B; color: #FFFEFA; border-radius: 50%; text-align: center; font-size: 12px; font-weight: 700; line-height: 22px;">1</span>
              </td>
              <td style="padding-bottom: 14px; font-size: 14px; line-height: 1.55; color: #1A1E16;">
                <strong>Configuration de l'établissement</strong> — Confirmez votre adresse civique, vos heures de service et vos taxes.
              </td>
            </tr>
            <tr>
              <td valign="top" width="28" style="padding-bottom: 14px;">
                <span style="display: inline-block; width: 22px; height: 22px; background-color: #167F5B; color: #FFFEFA; border-radius: 50%; text-align: center; font-size: 12px; font-weight: 700; line-height: 22px;">2</span>
              </td>
              <td style="padding-bottom: 14px; font-size: 14px; line-height: 1.55; color: #1A1E16;">
                <strong>Synchronisation de votre caisse (POS)</strong> — Connectez Square, Lightspeed ou Stripe pour automatiser l'import de vos ventes.
              </td>
            </tr>
            <tr>
              <td valign="top" width="28">
                <span style="display: inline-block; width: 22px; height: 22px; background-color: #167F5B; color: #FFFEFA; border-radius: 50%; text-align: center; font-size: 12px; font-weight: 700; line-height: 22px;">3</span>
              </td>
              <td style="font-size: 14px; line-height: 1.55; color: #1A1E16;">
                <strong>Ajout de l'équipe</strong> — Invitez vos gérants et chefs de cuisine pour la gestion des quarts et des coûts salariaux.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 6px;">
      Notre équipe à Montréal est à vos côtés. Pour toute question, répondez directement à ce message.
    </p>
  `;

  const secondaryStatsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 14px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">2 min</span>
          <span style="font-size: 11.5px; color: #565F52; font-weight: 600;">Temps de clôture</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 14px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">100%</span>
          <span style="font-size: 11.5px; color: #565F52; font-weight: 600;">Ratios en temps réel</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 14px; text-align: center;">
          <span class="font-serif" style="font-size: 20px; font-weight: 700; color: #167F5B; display: block;">24/7</span>
          <span style="font-size: 11.5px; color: #565F52; font-weight: 600;">Assistant Flow AI</span>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBienvenue sur Minerva Flow ! Votre espace de gestion est prêt.\n\nPour démarrer :\n1. Configurez votre établissement\n2. Connectez votre caisse (Square/Lightspeed/Stripe)\n3. Invitez votre équipe\n\nAccédez à votre cockpit : ${ctaUrl}\n\nL'équipe Minerva Flow`;

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
      ctaText: "Accéder à mon espace Minerva Flow",
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

  const title = "Maîtrisez votre Prime Cost dès votre premier service";
  const preheader = "Saisissez 3 chiffres et visualisez instantanément votre rentabilité brute.";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Bonjour ${name},</p>
    <p style="margin: 0 0 18px;">
      Le secret de la rentabilité en restauration réside dans le <strong>Prime Cost</strong> (coût des matières premières + masse salariale). Sur Minerva Flow, calculer ce ratio ne prend que 2 minutes par jour.
    </p>

    <!-- Bloc d'explication pédagogique avec formule -->
    <div style="background-color: #F3EFE4; border-left: 4px solid #167F5B; padding: 18px 20px; border-radius: 8px; margin: 0 0 22px;">
      <p class="font-serif" style="margin: 0 0 8px; font-size: 15px; font-weight: 700; color: #1A1E16;">
        ✦ La formule d'or de Minerva Flow :
      </p>
      <p style="margin: 0 0 8px; font-size: 13.5px; line-height: 1.6; color: #167F5B; font-weight: 600;">
        Prime Cost % = (Coût Nourriture & Boissons + Salaires Service) ÷ Ventes Nettes
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #565F52;">
        <em>Objectif optimal : maintenir ce ratio sous la barre des <strong>58 % à 62 %</strong> pour dégager un bénéfice net pérenne.</em>
      </p>
    </div>

    <p style="margin: 0 0 12px; font-weight: 600; color: #1A1E16;">Comment tester dès aujourd'hui :</p>
    <ol style="margin: 0 0 18px; padding-left: 20px; line-height: 1.7; font-size: 14.5px;">
      <li>Ouvrez l'onglet <strong>Journées</strong> dans Minerva Flow.</li>
      <li>Inscrivez vos ventes du jour et les heures de vos employés.</li>
      <li>Obtenez immédiatement vos graphiques de rentabilité et vos alertes de dérive.</li>
    </ol>
  `;

  const secondaryStatsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBF5F0; border: 1px solid #CEE8DB; border-radius: 12px; padding: 16px;">
      <tr>
        <td>
          <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #0E5A40; letter-spacing: 0.04em;">Cible de Rentabilité</span>
          <p class="font-serif" style="margin: 4px 0 2px; font-size: 22px; font-weight: 700; color: #167F5B;">&lt; 60% Prime Cost</p>
          <span style="font-size: 12.5px; color: #4A5245;">Minerva Flow vous avertit en rouge dès qu'un quart dépasse le seuil critique.</span>
        </td>
      </tr>
    </table>
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
      secondaryStatsHtml,
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

  const title = "Votre copilote Flow AI : L'intelligence au service de vos marges";
  const preheader = "Posez une question en langage naturel et obtenez des analyses financières instantanées.";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Bonjour ${name},</p>
    <p style="margin: 0 0 18px;">
      Finie l'époque des classeurs Excel illisibles et des analyses comptables livrées avec 3 semaines de retard. Avec <strong>Flow AI</strong>, vous disposez d'un directeur financier virtuel accessible 24/7.
    </p>

    <!-- Simulation d'interaction Flow AI -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1A1E16; border-radius: 14px; margin: 20px 0 22px; color: #F5F1E6;">
      <tr>
        <td style="padding: 22px 20px;">
          <div style="margin-bottom: 12px;">
            <span style="background-color: #DFFF5F; color: #0A4531; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">Exemple d'invite Flow AI</span>
          </div>
          <p class="font-serif" style="margin: 0 0 10px; font-size: 15px; font-style: italic; color: #DFFF5F;">
            « Quels sont nos 3 plats les plus rentables cette semaine et quel poste a généré le plus d'heures supplémentaires ? »
          </p>
          <div style="border-top: 1px solid #33392A; padding-top: 10px; font-size: 13px; line-height: 1.6; color: #D7DEC9;">
            ✦ <strong>Réponse Flow AI :</strong> « Votre Tartare de Saumon dégage 74% de marge brute. Cependant, la cuisine du soir a enregistré 6.5h d'overtime vendredi. Recommandation : décaler l'arrivée du second de 45 min. »
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 6px;">
      Flow AI analyse vos données de ventes, vos fiches techniques de recettes et vos quarts d'employés pour vous souffler les meilleures décisions opérationnelles.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez comment Flow AI agit comme votre directeur financier virtuel pour optimiser vos menus et vos coûts d'équipe.\n\nTester l'assistant Flow AI : ${ctaUrl}\n\nL'équipe Minerva Flow`;

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

  const title = "Besoin d'un coup de pouce pour paramétrer votre espace ?";
  const preheader = "Notre équipe d'experts en restauration est là pour adapter Minerva Flow à vos spécificités.";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Bonjour ${name},</p>
    <p style="margin: 0 0 18px;">
      Gérer un restaurant ou un café est un métier de terrain exigeant. Si vous n'avez pas encore finalisé votre configuration, voici les questions les plus fréquemment posées par nos partenaires :
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 18px 0;">
      <tr>
        <td style="padding: 14px 16px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; margin-bottom: 10px;">
          <strong style="color: #167F5B; font-size: 14px;">1. Comment importer mes ventes automatiquement ?</strong>
          <p style="margin: 4px 0 0; font-size: 13px; color: #565F52; line-height: 1.5;">
            Dans <em>Paramètres > Intégrations</em>, connectez votre compte Square, Lightspeed ou Stripe. Les rapports de ventes se synchronisent chaque nuit sans intervention manuelle.
          </p>
        </td>
      </tr>
      <tr><td height="10"></td></tr>
      <tr>
        <td style="padding: 14px 16px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; margin-bottom: 10px;">
          <strong style="color: #167F5B; font-size: 14px;">2. Comment gérer les pourboires et le taux horaire réel ?</strong>
          <p style="margin: 4px 0 0; font-size: 13px; color: #565F52; line-height: 1.5;">
            Ajoutez vos collaborateurs avec leurs rôles (Service, Cuisine, Bar) et leurs taux pour calculer fidèlement le ratio masse salariale.
          </p>
        </td>
      </tr>
      <tr><td height="10"></td></tr>
      <tr>
        <td style="padding: 14px 16px; background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px;">
          <strong style="color: #167F5B; font-size: 14px;">3. Vous souhaitez un onboarding guidé de 15 minutes ?</strong>
          <p style="margin: 4px 0 0; font-size: 13px; color: #565F52; line-height: 1.5;">
            Répondez simplement à cet email en nous indiquant vos disponibilités : un spécialiste produit prendra en main la configuration avec vous.
          </p>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBesoin d'assistance pour configurer votre établissement sur Minerva Flow ? Notre équipe est à votre disposition.\n\nAccéder au centre d'aide : ${ctaUrl}\nOu répondez directement à ce courriel.\n\nL'équipe Minerva Flow`;

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

  const title = "Du petit café de quartier au grand bistro : 6 études de cas concrètes";
  const preheader = "Découvrez comment 6 commerces québécois génèrent entre 75 % et 100 % de rétention.";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Bonjour ${name},</p>
    <p style="margin: 0 0 18px;">
      Le système <strong>Minerva Flow</strong> aide-t-il uniquement les commerces déjà établis, ou apporte-t-il une valeur réelle même à un tout jeune établissement sans historique ?
    </p>
    <p style="margin: 0 0 20px;">
      Voici les résultats réels observés sur <strong>6 profils d'exploitation</strong> (3 cafés et 3 restaurants répartis sur 3 échelles de maturité) :
    </p>

    <!-- Grille des 3 Échelles de Maturité -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 24px; border: 1px solid #E6E0D0; border-radius: 14px; overflow: hidden; background-color: #FAF8F2;">
      <!-- Échelle 1 : Petit qui débute -->
      <tr style="border-bottom: 1px solid #E6E0D0;">
        <td style="padding: 18px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 3px 10px; background-color: #DCECE3; color: #0E5A40; font-size: 11px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Échelle 1 · Débutant (18 jours)
          </div>
          <p class="font-serif" style="margin: 8px 0 4px; font-size: 16px; font-weight: 700; color: #1A1E16;">
            Câlin Café &amp; Poutine &amp; Cie : 75% de rétention immédiate
          </p>
          <p style="margin: 0 0 8px; font-size: 13.5px; line-height: 1.55; color: #565F52;">
            <em>« Je m'attendais à devoir attendre des mois avant de voir un client revenir une deuxième fois. Trois sur quatre l'ont déjà fait. »</em> — Denis Paquette, Câlin Café (19,98 $ panier moy.)
          </p>
          <span style="font-size: 12px; font-weight: 700; color: #167F5B;">✦ Résultat : 15 des 20 premiers clients sont déjà revenus au moins une fois sans budget publicitaire.</span>
        </td>
      </tr>

      <!-- Échelle 2 : Moyen établi -->
      <tr style="border-bottom: 1px solid #E6E0D0;">
        <td style="padding: 18px; border-bottom: 1px solid #EEE9DB;">
          <div style="display: inline-block; padding: 3px 10px; background-color: #F6EFD9; color: #8A6414; font-size: 11px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Échelle 2 · Établi (30 jours)
          </div>
          <p class="font-serif" style="margin: 8px 0 4px; font-size: 16px; font-weight: 700; color: #1A1E16;">
            Café Lucide &amp; Burger Nomade : 100% de retour &amp; 4,4 visites moy.
          </p>
          <p style="margin: 0 0 8px; font-size: 13.5px; line-height: 1.55; color: #565F52;">
            <em>« Le vrai changement, c'est que je n'ai plus à me demander qui revient — le tableau de clients me le dit d'un coup d'œil. »</em> — Théo Bernier, Café Lucide (15 144 $ CA)
          </p>
          <span style="font-size: 12px; font-weight: 700; color: #167F5B;">✦ Résultat : 100 % des clients sont revenus 2 fois ou plus. Fréquence moyenne doublée.</span>
        </td>
      </tr>

      <!-- Échelle 3 : Grand mature -->
      <tr>
        <td style="padding: 18px;">
          <div style="display: inline-block; padding: 3px 10px; background-color: #DFFF5F; color: #0A4531; font-size: 11px; font-weight: 700; border-radius: 999px; text-transform: uppercase;">
            Échelle 3 · Mature (43 jours)
          </div>
          <p class="font-serif" style="margin: 8px 0 4px; font-size: 16px; font-weight: 700; color: #1A1E16;">
            Bureau &amp; Brew &amp; Le Trèfle Doré : 9,1 visites moy. &amp; 86 392 $ CA
          </p>
          <p style="margin: 0 0 8px; font-size: 13.5px; line-height: 1.55; color: #565F52;">
            <em>« Flow nous a donné les chiffres pour repérer exactement ceux qui commencent à s'éloigner avant qu'il ne soit trop tard. »</em> — Marc-André Fournier, Le Trèfle Doré (206,64 $ panier)
          </p>
          <span style="font-size: 12px; font-weight: 700; color: #167F5B;">✦ Résultat : Fréquence multipliée par ×3,6. Détection automatique de l'attrition.</span>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 6px;">
      Peu importe votre échelle, Minerva Flow amplifie ce que vous faites déjà de mieux : fidéliser vos clients et sécuriser votre marge brute.
    </p>
  `;

  const secondaryStatsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 14px; text-align: center;">
          <span class="font-serif" style="font-size: 22px; font-weight: 700; color: #167F5B; display: block;">75 %</span>
          <span style="font-size: 11.5px; color: #565F52; font-weight: 600;">Rétention palier 1</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 14px; text-align: center;">
          <span class="font-serif" style="font-size: 22px; font-weight: 700; color: #167F5B; display: block;">100 %</span>
          <span style="font-size: 11.5px; color: #565F52; font-weight: 600;">Rétention paliers 2 &amp; 3</span>
        </td>
        <td width="2%"></td>
        <td class="stat-col" width="32%" style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 12px; padding: 14px; text-align: center;">
          <span class="font-serif" style="font-size: 22px; font-weight: 700; color: #167F5B; display: block;">×3,6</span>
          <span style="font-size: 11.5px; color: #565F52; font-weight: 600;">Gain de fréquence</span>
        </td>
      </tr>
    </table>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez les 6 études de cas réelles de Minerva Flow (Câlin Café, Poutine & Cie, Café Lucide, Burger Nomade, Bureau & Brew, Le Trèfle Doré) : 75% à 100% de rétention et fréquence multipliée par 3,6.\n\nConsulter mon tableau de bord : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "6 Études de Cas Réelles",
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

  const title = "Passez au niveau supérieur avec Minerva Flow Pro";
  const preheader = "Débloquez les analyses prédictives, les connexions POS multi-sites et le moteur de fidélité.";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Bonjour ${name},</p>
    <p style="margin: 0 0 18px;">
      Vous avez posé les bases solides de votre exploitation sur Minerva Flow. Pour automatiser l'intégralité de votre chaîne de valeur et maximiser vos marges, passez à la vitesse supérieure avec <strong>Minerva Flow Pro</strong> :
    </p>

    <!-- Grille des fonctionnalités Pro -->
    <div style="background-color: #FAF8F2; border: 1px solid #E6E0D0; border-radius: 14px; padding: 22px 20px; margin: 20px 0 24px;">
      <p class="font-serif" style="margin: 0 0 14px; font-size: 16px; font-weight: 700; color: #167F5B;">
        ✦ Tout ce qui est inclus dans le plan Pro :
      </p>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 1.6;">
        <tr>
          <td valign="top" width="24" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 10px;"><strong>Synchronisations POS &amp; Banques illimitées</strong> — Square, Lightspeed, Stripe sans limite de volume.</td>
        </tr>
        <tr>
          <td valign="top" width="24" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 10px;"><strong>Assistant Flow AI illimité</strong> — Recommandations de prix, détection d'anomalies et audits de rentabilité.</td>
        </tr>
        <tr>
          <td valign="top" width="24" style="color: #167F5B; font-weight: 700;">✓</td>
          <td style="padding-bottom: 10px;"><strong>Moteur de fidélisation &amp; CRM</strong> — Récompenses automatiques, invitations QR studio et relances anniversaire.</td>
        </tr>
        <tr>
          <td valign="top" width="24" style="color: #167F5B; font-weight: 700;">✓</td>
          <td><strong>Support VIP Prioritaire</strong> — Ligne directe dédiée pour votre établissement 7j/7.</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 6px;">
      Nos plans sont sans engagement à long terme et calibrés pour être rentabilisés dès la première semaine d'utilisation.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez Minerva Flow Pro : synchronisations illimitées, Flow AI avancé et moteur de fidélisation.\n\nExplorer les forfaits : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Offres & Évolution",
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

  const title = "Votre cockpit Minerva Flow est toujours prêt pour le service";
  const preheader = "Reprenez le pilotage de vos marges là où vous vous étiez arrêté.";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Bonjour ${name},</p>
    <p style="margin: 0 0 18px;">
      Le rythme en établissement ne laisse que peu de répit. Si vous souhaitez reprendre le contrôle de vos coûts et simplifier vos clôtures de service, votre espace est parfaitement sauvegardé et prêt à l'emploi.
    </p>

    <!-- Nouveautés ajoutées récemment -->
    <div style="background-color: #F8F6EF; border-left: 4px solid #167F5B; padding: 18px 20px; border-radius: 8px; margin: 20px 0 22px;">
      <p class="font-serif" style="margin: 0 0 8px; font-size: 15px; font-weight: 700; color: #1A1E16;">
        ✦ Nouveautés déployées récemment sur Minerva Flow :
      </p>
      <p style="margin: 0 0 6px; font-size: 13.5px; line-height: 1.55; color: #4A5245;">
        • <strong>Nouveaux rapports d'audit de marge</strong> avec alertes de dépassement de ratios.
      </p>
      <p style="margin: 0 0 6px; font-size: 13.5px; line-height: 1.55; color: #4A5245;">
        • <strong>Module Flow AI enrichi</strong> pour répondre avec une précision accrue sur vos coûts matières.
      </p>
      <p style="margin: 0; font-size: 13.5px; line-height: 1.55; color: #4A5245;">
        • <strong>Export simplifié pour votre comptable</strong> en un seul clic.
      </p>
    </div>

    <p style="margin: 0 0 6px;">
      Si un élément technique ou une question vous a freiné, répondez directement à ce message : nous prendrons le temps de vous aider personnellement.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nVotre espace Minerva Flow est toujours prêt. Reprenez le pilotage de vos opérations en un clic.\n\nAccéder à mon espace : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: luxuryShell({
      title,
      preheader,
      badgeText: "Reprise d'Activité",
      badgeTone: "green",
      contentHtml,
      ctaText: "Reprendre mon activité sur Flow",
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
