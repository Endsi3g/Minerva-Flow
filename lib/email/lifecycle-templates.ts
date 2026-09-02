
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
 * Shell email responsive & optimisé conforme à la LCAP (Loi canadienne antipourriel)
 * Charte visuelle : Minerva Flow (#167F5B vert sauge profond, #FBF9F3 fond crème doux, #1A1E16 texte sombre)
 */
function baseShell({
  title,
  preheader,
  badgeText,
  contentHtml,
  ctaText,
  ctaUrl,
  appUrl,
  isPromotional = false,
}: {
  title: string;
  preheader: string;
  badgeText: string;
  contentHtml: string;
  ctaText: string;
  ctaUrl: string;
  appUrl: string;
  isPromotional?: boolean;
}): string {
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  const safeCtaText = escapeHtml(ctaText);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
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
    @media screen and (max-width: 600px) {
      .email-wrap { width: 100% !important; max-width: 100% !important; }
      .card-pad { padding: 24px 18px !important; }
      .cta-btn { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1E6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1A1E16;">
  
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #F5F1E6;">
    ${safePreheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F1E6;">
    <tr>
      <td align="center" style="padding: 36px 14px 48px;">
        
        <table role="presentation" class="email-wrap" width="580" cellpadding="0" cellspacing="0" border="0" style="width: 580px; max-width: 580px; margin: 0 auto;">
          
          <!-- Header Logo -->
          <tr>
            <td style="padding: 0 6px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 800; color: #1A1E16; letter-spacing: -0.02em;">
                      Flow <span style="color: #167F5B;">par Minerva</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11.5px; font-weight: 600; color: #565F52; background-color: #EEE9DB; padding: 4px 10px; border-radius: 999px; display: inline-block;">
                      Québec, CA
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td class="card-pad" style="background-color: #FAFAF5; border: 1px solid #E6E0D0; border-radius: 16px; padding: 36px 32px 32px; box-shadow: 0 4px 12px rgba(26, 30, 22, 0.03);">
              
              <!-- Category Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 18px;">
                <tr>
                  <td style="background-color: #DCECE3; color: #0E5A40; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px;">
                    ✦ ${escapeHtml(badgeText)}
                  </td>
                </tr>
              </table>

              <!-- Main Title -->
              <h1 style="margin: 0 0 16px; font-size: 22px; line-height: 1.35; font-weight: 700; color: #1A1E16; letter-spacing: -0.01em;">
                ${safeTitle}
              </h1>

              <!-- Dynamic Body Content -->
              <div style="font-size: 14.5px; line-height: 1.65; color: #4A5245;">
                ${contentHtml}
              </div>

              <!-- Single Primary Call-to-Action -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 16px;">
                <tr>
                  <td align="left">
                    <a href="${ctaUrl}" class="cta-btn" style="display: inline-block; padding: 13px 26px; background-color: #167F5B; color: #FAFAF5; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 6px rgba(22, 127, 91, 0.25);">
                      ${safeCtaText} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #EEE9DB; font-size: 13.5px; line-height: 1.5; color: #6F786B;">
                <p style="margin: 0 0 4px;">À votre disposition,</p>
                <p style="margin: 0; font-weight: 600; color: #1A1E16;">L'équipe Minerva Flow</p>
              </div>

            </td>
          </tr>

          <!-- LCAP / CASL Compliant Footer -->
          <tr>
            <td style="padding: 24px 8px 0; text-align: center; font-size: 12px; line-height: 1.6; color: #8D9488;">
              <p style="margin: 0 0 6px;">
                <strong>Flow par Minerva</strong> · Minerva Technologies Inc.
              </p>
              <p style="margin: 0 0 10px;">
                Montréal (Québec), Canada · Conçu pour les restaurateurs et cafetiers d'ici
              </p>
              <p style="margin: 0;">
                ${
                  isPromotional
                    ? `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #8D9488; text-decoration: underline;">Se désabonner des communications</a> · `
                    : ""
                }
                <a href="${appUrl}" style="color: #8D9488; text-decoration: underline;">Accéder à l'application</a> · 
                <a href="mailto:support@minervaflow.app" style="color: #8D9488; text-decoration: underline;">Support & aide</a>
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
 * 1. BIENVENUE (Immédiat)
 * Objectif : Confirmer l'inscription + lancer la 1ère action (configurer le restaurant / première journée)
 */
export function renderWelcomeEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "bonjour";
  const restaurant = params.restaurantName ? ` pour <strong>${escapeHtml(params.restaurantName)}</strong>` : "";
  const ctaUrl = `${params.appUrl}/onboarding`;

  const title = "Bienvenue sur Flow par Minerva — commençons";
  const preheader = "Votre compte Flow est prêt. Lancez votre première action en moins de 3 minutes.";

  const contentHtml = `
    <p style="margin: 0 0 14px;">Bonjour ${name},</p>
    <p style="margin: 0 0 16px;">
      Bienvenue sur <strong>Flow par Minerva</strong> ! Votre espace de pilotage opérationnel${restaurant} est officiellement créé. Vous pouvez désormais centraliser vos ventes, vos ratios de rentabilité et votre équipe, sans tableurs complexes ni pertes de temps.
    </p>
    <p style="margin: 0 0 12px; font-weight: 600; color: #1A1E16;">Pour bien démarrer dès aujourd'hui :</p>
    <ol style="margin: 0 0 18px; padding-left: 20px; line-height: 1.7;">
      <li>Complétez les informations de votre établissement (adresse et horaires).</li>
      <li>Ajoutez vos premiers postes ou invitez vos collaborateurs.</li>
      <li>Enregistrez votre première journée ou synchronisez votre POS.</li>
    </ol>
    <p style="margin: 0 0 6px;">
      Si vous avez la moindre question, répondez directement à ce courriel : notre équipe est là pour vous accompagner.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBienvenue sur Flow par Minerva ! Votre compte est prêt.\n\nPour commencer :\n1. Complétez votre profil d'établissement\n2. Invitez votre équipe\n3. Saisissez votre première journée\n\nCommencez ici : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: baseShell({
      title,
      preheader,
      badgeText: "Bienvenue sur Flow",
      contentHtml,
      ctaText: "Configurer mon établissement",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 2. PREMIÈRE ACTIVATION (Jour 1 / 24h)
 * Objectif : Conduire l'utilisateur vers son premier résultat concret (moment "aha" : saisie de journée ou connexion POS)
 */
export function renderActivationEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/days`;

  const title = "Faites votre première saisie en 2 minutes";
  const preheader = "Le moyen le plus rapide de voir l'impact de Flow sur votre marge brute.";

  const contentHtml = `
    <p style="margin: 0 0 14px;">Bonjour ${name},</p>
    <p style="margin: 0 0 16px;">
      Le moyen le plus rapide de constater la valeur de Flow par Minerva est d'enregistrer une première journée de service. En moins de 2 minutes, vous visualisez votre marge brute, votre coût de main-d'œuvre et vos alertes du jour.
    </p>
    <div style="background-color: #F3EFE4; border-left: 3px solid #167F5B; padding: 14px 16px; border-radius: 6px; margin: 0 0 18px;">
      <p style="margin: 0 0 6px; font-weight: 600; color: #1A1E16;">Comment procéder en 3 étapes :</p>
      <p style="margin: 0; line-height: 1.6;">
        1. Rendez-vous dans l'onglet <strong>Journées</strong>.<br />
        2. Saisissez le chiffre d'affaires du jour et les heures travaillées.<br />
        3. Obtenez instantanément votre <strong>Prime Cost</strong> et vos ratios réels.
      </p>
    </div>
    <p style="margin: 0 0 6px;">
      Vous utilisez déjà Square, Lightspeed ou Stripe ? Vous pouvez aussi les connecter en un clic pour automatiser l'import.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nEnregistrez votre première journée en 2 minutes pour découvrir votre marge brute et votre prime cost en temps réel.\n\nAccédez à la saisie de journée : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: baseShell({
      title,
      preheader,
      badgeText: "Première action rapide",
      contentHtml,
      ctaText: "Saisir ma première journée",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 3. DÉMONSTRATION FONCTION CLÉ (Jour 3)
 * Objectif : Montrer comment résoudre le problème principal (Food Cost, Marge Réelle, Flow AI)
 */
export function renderFeatureHighlightEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/chat`;

  const title = "Comment Flow vous aide à maîtriser votre marge réelle";
  const preheader = "Fini les calculs manuels : analysez vos écarts de coûts en temps réel.";

  const contentHtml = `
    <p style="margin: 0 0 14px;">Bonjour ${name},</p>
    <p style="margin: 0 0 16px;">
      Saviez-vous que vous pouvez utiliser l'assistant <strong>Flow AI</strong> et le module <strong>Finance</strong> pour détecter instantanément les dérives de coûts sur vos matières premières et votre masse salariale ?
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 18px; font-size: 13.5px;">
      <tr>
        <td style="padding: 12px; background-color: #F8ECE8; border-radius: 8px 8px 0 0; border: 1px solid #ECD4CE;">
          <strong style="color: #9C331B;">Avant :</strong> Calculs manuels en fin de mois sur Excel, retards de détection sur les pertes et les hausses fournisseurs.
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #EBF5F0; border-radius: 0 0 8px 8px; border: 1px solid #CEE8DB; border-top: none;">
          <strong style="color: #0E5A40;">Avec Flow :</strong> Vos ratios (Food Cost %, Labor Cost %, Prime Cost) sont recalculés automatiquement à chaque service avec des alertes ciblées.
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 6px;">
      Posez simplement une question à Flow AI : <em>« Quel a été notre coût de main-d'œuvre cette semaine comparé aux ventes ? »</em>
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez comment Flow analyse vos ratios de rentabilité en direct et vous alerte en cas de dérive.\n\nTester l'assistant Flow AI : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: baseShell({
      title,
      preheader,
      badgeText: "Fonctionnalité clé",
      contentHtml,
      ctaText: "Interroger Flow AI",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 4. AIDE ET SUPPORT PERSONNALISÉ (Jour 5)
 * Objectif : Lever les blocages selon le statut de l'utilisateur
 */
export function renderSupportCheckinEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/support`;

  const title = "Besoin d'aide pour configurer votre espace Flow ?";
  const preheader = "Notre équipe est disponible pour vous guider selon les besoins de votre restaurant.";

  const contentHtml = `
    <p style="margin: 0 0 14px;">Bonjour ${name},</p>
    <p style="margin: 0 0 16px;">
      Vous avez créé votre compte il y a quelques jours, mais votre quotidien en restauration est souvent intense. Si vous avez rencontré le moindre obstacle, voici les solutions aux questions les plus fréquentes :
    </p>
    <ul style="margin: 0 0 18px; padding-left: 20px; line-height: 1.7;">
      <li><strong>Intégration POS / Caisse :</strong> Connectez votre système en 2 minutes dans les Paramètres > Intégrations.</li>
      <li><strong>Horaires & Équipe :</strong> Ajoutez vos employés et définissez leurs taux horaires pour le calcul automatique de la masse salariale.</li>
      <li><strong>Import de données :</strong> Nous pouvons vous aider à importer votre historique si nécessaire.</li>
    </ul>
    <p style="margin: 0 0 6px;">
      Préférez-vous un échange direct ? Répondez simplement à ce courriel avec votre objectif principal, et nous vous orienterons pas à pas.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nBesoin d'aide pour configurer votre établissement sur Flow ?\n\nAccéder au support : ${ctaUrl}\nOu répondez directement à ce courriel.\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: baseShell({
      title,
      preheader,
      badgeText: "Support & Accompagnement",
      contentHtml,
      ctaText: "Accéder au centre d'aide",
      ctaUrl,
      appUrl: params.appUrl,
    }),
    text,
  };
}

/**
 * 5. EXEMPLE ET CAS D'USAGE (Jour 7)
 * Objectif : Illustrer la valeur concrète et le temps gagné
 */
export function renderCaseStudyEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/overview`;

  const title = "Comment un restaurateur gagne 4h par semaine avec Flow";
  const preheader = "Découvrez comment optimiser la clôture de service et le suivi de rentabilité.";

  const contentHtml = `
    <p style="margin: 0 0 14px;">Bonjour ${name},</p>
    <p style="margin: 0 0 16px;">
      Gérer un restaurant au Québec exige de jongler entre service en salle, gestion des stocks, horaires d'équipe et marge nette. Voici comment les gérants utilisant Flow transforment leur routine :
    </p>
    <div style="background-color: #F8F6EF; border: 1px solid #E6E0D0; border-radius: 10px; padding: 18px 20px; margin: 0 0 18px;">
      <p style="margin: 0 0 8px; font-weight: 700; color: #167F5B;">✦ Les 3 gains majeurs constatés :</p>
      <p style="margin: 0 0 6px; font-size: 13.5px;">
        <strong>1. Clôture de service en 5 min</strong> — Les chiffres de ventes et d'heures sont centralisés sans ressaisie.
      </p>
      <p style="margin: 0 0 6px; font-size: 13.5px;">
        <strong>2. Contrôle du Prime Cost</strong> — Visibilité immédiate sur le ratio combiné (nourriture + main-d'œuvre).
      </p>
      <p style="margin: 0; font-size: 13.5px;">
        <strong>3. Anticipation des besoins</strong> — Alertes prédictives sur les prévisions d'achats et de staffing.
      </p>
    </div>
    <p style="margin: 0 0 6px;">
      Votre tableau de bord récapitule vos indicateurs en un coup d'œil.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nDécouvrez comment Flow permet d'économiser 4 heures par semaine sur la gestion quotidienne.\n\nVoir mon tableau de bord : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: baseShell({
      title,
      preheader,
      badgeText: "Cas d'usage & ROI",
      contentHtml,
      ctaText: "Voir mon tableau de bord",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 6. CONVERSION / PLAN PRO (Jour 10-14)
 * Objectif : Présenter le plan payant et les fonctionnalités avancées
 */
export function renderConversionEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/settings`;

  const title = "Passez à la vitesse supérieure avec Flow Pro";
  const preheader = "Bénéficiez de la puissance complète de Flow pour maximiser votre rentabilité.";

  const contentHtml = `
    <p style="margin: 0 0 14px;">Bonjour ${name},</p>
    <p style="margin: 0 0 16px;">
      Vous utilisez maintenant Flow par Minerva pour structurer vos opérations. Pour débloquer l'ensemble des capacités d'automatisation, découvrez les fonctionnalités du plan <strong>Flow Pro</strong> :
    </p>
    <ul style="margin: 0 0 18px; padding-left: 20px; line-height: 1.7;">
      <li><strong>Synchronisations illimitées :</strong> Connecteurs POS, passerelles Stripe et alertes en temps réel.</li>
      <li><strong>Intelligence Artificielle Flow AI :</strong> Analyses de rentabilité approfondies et recommandations sur mesure.</li>
      <li><strong>Moteur de fidélisation & campagnes :</strong> Relances automatiques pour fidéliser vos clients réguliers.</li>
      <li><strong>Support prioritaire dédié :</strong> Accompagnement personnalisé par nos experts en opérations de restauration.</li>
    </ul>
    <p style="margin: 0 0 6px;">
      Découvrez nos forfaits flexibles adaptés à la taille de votre établissement.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nPassez à la vitesse supérieure avec Flow Pro : synchronisations illimitées, IA avancée et support prioritaire.\n\nDécouvrir les forfaits : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: baseShell({
      title,
      preheader,
      badgeText: "Offres & Évolution",
      contentHtml,
      ctaText: "Découvrir le plan Flow Pro",
      ctaUrl,
      appUrl: params.appUrl,
      isPromotional: true,
    }),
    text,
  };
}

/**
 * 7. RÉACTIVATION (Inactivité 7+ jours)
 * Objectif : Réengager l'utilisateur avec bienveillance sans culpabilisation
 */
export function renderReactivationEmail(params: LifecycleTemplateParams): EmailRenderOutput {
  const name = params.firstName ? escapeHtml(params.firstName) : "Bonjour";
  const ctaUrl = `${params.appUrl}/overview`;

  const title = "Votre espace Flow par Minerva est toujours prêt";
  const preheader = "Reprenez le pilotage de votre restaurant là où vous vous étiez arrêté.";

  const contentHtml = `
    <p style="margin: 0 0 14px;">Bonjour ${name},</p>
    <p style="margin: 0 0 16px;">
      Nous savons que le quotidien en établissement ne laisse que peu de répit. Si vous souhaitez reprendre l'optimisation de vos marges et la gestion de vos opérations, votre espace est parfaitement sauvegardé et prêt à l'emploi.
    </p>
    <div style="background-color: #F8F6EF; border-left: 3px solid #167F5B; padding: 14px 16px; border-radius: 6px; margin: 0 0 18px;">
      <p style="margin: 0 0 6px; font-weight: 600; color: #1A1E16;">Récemment ajouté sur Flow :</p>
      <p style="margin: 0; line-height: 1.6;">
        ✦ Nouveaux rapports d'analyse financière hebdomadaires.<br />
        ✦ Amélioration des réponses et de la précision de Flow AI.<br />
        ✦ Synchronisation encore plus rapide de vos terminaux de paiement.
      </p>
    </div>
    <p style="margin: 0 0 6px;">
      Si quelque chose vous a bloqué lors de votre utilisation, répondez simplement à ce message : vos retours nous sont précieux pour continuer d'améliorer l'outil.
    </p>
  `;

  const text = `Bonjour ${params.firstName ?? ""},\n\nVotre espace Flow par Minerva est toujours prêt. Reprenez vos opérations en un clic.\n\nAccéder à mon espace : ${ctaUrl}\n\nL'équipe Minerva Flow`;

  return {
    subject: title,
    preheader,
    html: baseShell({
      title,
      preheader,
      badgeText: "Reprise d'activité",
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
