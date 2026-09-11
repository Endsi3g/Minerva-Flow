import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, isSmsConfigured } from "@/lib/sms/send";
import { sendRetentionEmail } from "@/lib/email/resend";
import { logActivity } from "@/lib/data/activity";
import { recordLifecycleEvent } from "@/lib/data/lifecycle-events";

export type CampaignTemplateId =
  | "welcome"
  | "second_visit"
  | "reactivation_21d"
  | "off_peak"
  | "reward_available"
  | "vip_upgrade"
  | "referral_share"
  | "winback_60d";

export type PrioritizedCampaignMeta = {
  id: CampaignTemplateId;
  name: string;
  category: "automation" | "targeted_broadcast";
  timingDescription: string;
  triggerCondition: string;
  defaultMessagePreview: string;
  isPostMvp?: boolean;
};

export const PRIORITIZED_CAMPAIGN_TEMPLATES: Record<
  CampaignTemplateId,
  PrioritizedCampaignMeta
> = {
  welcome: {
    id: "welcome",
    name: "Bienvenue",
    category: "automation",
    timingDescription: "Envoyée immédiatement après l’inscription.",
    triggerCondition: "Dès l'inscription d'un nouveau membre au programme.",
    defaultMessagePreview:
      "Bienvenue chez {restaurant}. Votre première récompense vous attend à votre prochaine visite.",
  },
  second_visit: {
    id: "second_visit",
    name: "Deuxième visite",
    category: "automation",
    timingDescription:
      "Envoyée quelques jours après la première visite si le client n’est pas revenu.",
    triggerCondition: "3 à 5 jours après la première visite enregistrée sans retour.",
    defaultMessagePreview:
      "Il ne vous manque qu’une visite pour débloquer votre prochaine récompense.",
  },
  reactivation_21d: {
    id: "reactivation_21d",
    name: "Réactivation (21 jours)",
    category: "automation",
    timingDescription: "Déclenchée après 21 jours d’absence.",
    triggerCondition: "Client inactif depuis plus de 21 jours consécutifs.",
    defaultMessagePreview:
      "Cela fait un moment qu’on ne vous a pas vu. Revenez cette semaine et profitez de votre offre réservée aux habitués.",
  },
  off_peak: {
    id: "off_peak",
    name: "Période creuse",
    category: "targeted_broadcast",
    timingDescription: "Envoyée uniquement pour un segment et une plage horaire précise.",
    triggerCondition: "Déclenchable pour stimuler un service calme (ex : mardi midi).",
    defaultMessagePreview:
      "Mardi midi est plus calme que d’habitude. Invitez vos clients inactifs à revenir avec une offre limitée.",
  },
  reward_available: {
    id: "reward_available",
    name: "Récompense disponible",
    category: "automation",
    timingDescription: "Envoyée dès qu'une récompense est débloquée ou points suffisants atteints.",
    triggerCondition: "Points suffisants pour échanger une récompense au catalogue.",
    defaultMessagePreview:
      "Félicitations {firstName}, votre récompense vous attend chez {restaurant} ! Passez la récupérer.",
  },
  vip_upgrade: {
    id: "vip_upgrade",
    name: "Nouveau statut Privilégié",
    category: "automation",
    timingDescription: "Envoyée lors du franchissement d'un palier supérieur (Privilégié / Ambassadeur).",
    triggerCondition: "Seuil de dépenses ou de visites du palier atteint.",
    defaultMessagePreview:
      "Bravo {firstName} ! Vous accédez au statut Privilégié chez {restaurant}. Profitez de vos privilèges.",
  },
  referral_share: {
    id: "referral_share",
    name: "Partage & Parrainage",
    category: "targeted_broadcast",
    timingDescription: "Envoyée aux habitués confirmés pour les inciter à parrainer des proches.",
    triggerCondition: "Membres fidélisés réguliers (≥ 2 visites).",
    defaultMessagePreview:
      "Faites découvrir {restaurant} à vos proches ! Partagez votre lien et recevez tous les deux un cadeau.",
  },
  winback_60d: {
    id: "winback_60d",
    name: "Dernière chance (60 jours)",
    category: "automation",
    timingDescription: "Envoyée après 60 jours d'inactivité avant perte définitive du contact.",
    triggerCondition: "60 jours consécutifs sans aucune commande ou visite.",
    defaultMessagePreview:
      "Vous nous manquez chez {restaurant} ! Revenez ce mois-ci pour une attention spéciale du chef.",
  },
};

/**
 * Note post-MVP : La campagne « Anniversaire » est reportée après le MVP
 * car elle requiert la collecte d'une donnée personnelle supplémentaire (date de naissance)
 * et une gestion avancée des préférences selon les critères LCAP.
 */
export const POST_MVP_CAMPAIGNS = {
  birthday: {
    name: "Anniversaire",
    status: "post_mvp",
    reason:
      "Nécessite la collecte d'une donnée personnelle supplémentaire et une gestion plus fine des préférences.",
  },
};

export type RenderTemplateOptions = {
  restaurantName: string;
  customerName: string;
  timeSlot?: string;
  offerText?: string;
  unsubscribeUrl?: string;
};

export type RenderedCampaignMessage = {
  subject: string;
  smsBody: string;
  htmlBody: string;
};

/**
 * Builds the luxury editorial email HTML compliant with Minerva Flow design system and CASL / LCAP.
 */
function buildEditorialEmailHtml({
  restaurantName,
  customerName,
  title,
  messageParagraph,
  callToAction,
  unsubscribeUrl,
}: {
  restaurantName: string;
  customerName: string;
  title: string;
  messageParagraph: string;
  callToAction?: { label: string; url: string };
  unsubscribeUrl: string;
}): string {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1E6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1E16;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F5F1E6; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFEFA; border: 1px solid #E6E0D0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(26,30,22,0.04);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #EEE9DB; text-align: left;">
              <span style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #8D9488; font-weight: 600;">Minerva Flow · ${restaurantName}</span>
              <h1 style="margin: 8px 0 0 0; font-family: 'New York', Georgia, serif; font-size: 24px; font-weight: 600; color: #1A1E16; line-height: 1.3;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 32px; text-align: left;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1A1E16; line-height: 1.6;">
                Bonjour ${firstName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #565F52; line-height: 1.6;">
                ${messageParagraph}
              </p>
              ${
                callToAction
                  ? `<div style="margin: 28px 0 12px 0;">
                      <a href="${callToAction.url}" style="display: inline-block; background-color: #167F5B; color: #FFFFFF; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                        ${callToAction.label}
                      </a>
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- LCAP / CASL Mandatory Legal Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #FBF9F3; border-top: 1px solid #EEE9DB; font-size: 11px; color: #8D9488; line-height: 1.5; text-align: left;">
              <p style="margin: 0 0 6px 0;">
                Vous recevez ce courriel car vous avez consenti aux communications de <strong>${restaurantName}</strong> via la plateforme <strong>Minerva Flow</strong>.
              </p>
              <p style="margin: 0 0 8px 0;">
                Minerva Technologies Inc. · Montréal (Québec), Canada
              </p>
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #167F5B; text-decoration: underline;">Se désabonner des communications marketing</a>
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
 * Renders ready-to-use template contents for both SMS and Email channels.
 */
export function renderCampaignTemplate(
  templateId: CampaignTemplateId,
  options: RenderTemplateOptions
): RenderedCampaignMessage {
  const { restaurantName, customerName, timeSlot, offerText } = options;
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";
  const unsubscribeUrl =
    options.unsubscribeUrl || `${appUrl}/api/consent/unsubscribe?r=${encodeURIComponent(restaurantName)}`;

  switch (templateId) {
    case "welcome": {
      const title = `Bienvenue chez ${restaurantName}`;
      const message = `Bienvenue chez ${restaurantName} ! Votre première récompense vous attend lors de votre prochaine visite. Accumulez vos points à chaque passage au comptoir.`;
      const smsBody = `${restaurantName} : Bienvenue ${firstName} ! Votre première récompense vous attend à votre prochaine visite.`;
      return {
        subject: `Bienvenue chez ${restaurantName} — votre première récompense vous attend`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Voir mon passeport fidélité",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }

    case "second_visit": {
      const title = `Une visite de plus pour votre récompense`;
      const message = `Il ne vous manque qu’une seule visite chez ${restaurantName} pour débloquer votre prochaine récompense de fidélité ! Venez vous faire plaisir cette semaine.`;
      const smsBody = `${restaurantName} : ${firstName}, il ne vous manque qu’une visite pour débloquer votre prochaine récompense !`;
      return {
        subject: `${firstName}, il ne vous manque qu'une visite chez ${restaurantName}`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Découvrir mes récompenses",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }

    case "reactivation_21d": {
      const title = `Votre table vous attend chez ${restaurantName}`;
      const message = `Cela fait un moment qu’on ne vous a pas vu chez ${restaurantName}. Revenez cette semaine et profitez de votre offre réservée aux habitués !`;
      const smsBody = `${restaurantName} : ${firstName}, ça fait un moment qu'on ne vous a pas vu ! Revenez cette semaine et profitez de votre offre réservée aux habitués.`;
      return {
        subject: `${firstName}, votre offre réservée aux habitués vous attend chez ${restaurantName}`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Réserver ou commander",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }

    case "off_peak": {
      const slot = timeSlot || "Mardi midi";
      const customOffer = offerText || "une offre limitée sur place";
      const title = `${slot} chez ${restaurantName}`;
      const message = `${slot} est plus calme que d’habitude chez ${restaurantName}. Venez savourer un moment paisible et profitez de notre sélection exclusive : ${customOffer}.`;
      const smsBody = `${restaurantName} : ${slot} est plus calme que d'habitude. Profitez de votre offre exclusive en salle !`;
      return {
        subject: `${slot} calme chez ${restaurantName} — offre exclusive`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Consulter le menu",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }

    case "reward_available": {
      const title = `Votre récompense est prête chez ${restaurantName}`;
      const message = `Félicitations ${firstName} ! Vous avez accumulé suffisamment de points ou validé un palier pour débloquer votre récompense chez ${restaurantName}. Elle vous attend au comptoir lors de votre prochaine visite.`;
      const smsBody = `${restaurantName} : Félicitations ${firstName}, votre récompense vous attend au comptoir ! Venez en profiter lors de votre prochaine visite.`;
      return {
        subject: `Votre récompense vous attend chez ${restaurantName} 🎁`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Voir ma récompense",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }

    case "vip_upgrade": {
      const title = `Vous passez au statut Privilégié chez ${restaurantName}`;
      const message = `Bravo ${firstName} ! Votre fidélité exemplaire vous fait accéder au statut Privilégié chez ${restaurantName}. Vous bénéficiez désormais d'avantages exclusifs et d'un accueil sur mesure.`;
      const smsBody = `${restaurantName} : Bravo ${firstName} ! Vous accédez au statut Privilégié. Des privilèges exclusifs vous attendent en restaurant.`;
      return {
        subject: `Félicitations ${firstName}, vous accédez au statut Privilégié chez ${restaurantName} ⭐`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Découvrir mes privilèges",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }

    case "referral_share": {
      const title = `Partagez votre table préférée avec un proche`;
      const message = `Vous aimez passer du temps chez ${restaurantName} ? Faites-en profiter vos collègues et proches. Grâce à votre lien de parrainage exclusif, offrez une surprise à votre invité et débloquez tous les deux une récompense.`;
      const smsBody = `${restaurantName} : Invitez un proche à découvrir notre cuisine ! Partagez votre lien et recevez tous les deux un cadeau.`;
      return {
        subject: `Invitez un ami chez ${restaurantName} et gagnez tous les deux ✨`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Partager mon lien de parrainage",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }

    case "winback_60d": {
      const title = `Vous nous manquez chez ${restaurantName}`;
      const message = `Cela fait 60 jours que nous n'avons pas eu le plaisir de vous accueillir chez ${restaurantName}. Pour fêter nos retrouvailles, venez nous rendre visite ce mois-ci : une surprise gourmande vous sera réservée à votre table.`;
      const smsBody = `${restaurantName} : ${firstName}, vous nous manquez ! Venez nous voir ce mois-ci pour une surprise spéciale retrouvailles.`;
      return {
        subject: `${firstName}, vous nous manquez chez ${restaurantName} — une attention spéciale vous attend`,
        smsBody,
        htmlBody: buildEditorialEmailHtml({
          restaurantName,
          customerName,
          title,
          messageParagraph: message,
          callToAction: {
            label: "Réserver ma table",
            url: `${appUrl}/portal`,
          },
          unsubscribeUrl,
        }),
      };
    }
  }
}

export type DispatchCampaignResult = {
  success: boolean;
  channelUsed?: "email" | "sms";
  error?: string;
  caslBlocked?: boolean;
};

/**
 * Dispatches an automated or targeted campaign to a customer with strict CASL / LCAP enforcement.
 * If customer has NOT consented to marketing (marketing_consent === false), the send is BLOCKED.
 */
export async function dispatchCampaignToCustomer({
  restaurantId,
  customerId,
  templateId,
  preferredChannel,
  timeSlot,
  offerText,
}: {
  restaurantId: string;
  customerId: string;
  templateId: CampaignTemplateId;
  preferredChannel?: "email" | "sms";
  timeSlot?: string;
  offerText?: string;
}): Promise<DispatchCampaignResult> {
  const admin = createAdminClient();

  // 1. Fetch restaurant and check automation setting if it's an automated template
  const { data: restaurant } = await admin
    .from("restaurants")
    .select(
      "id, name, campaign_welcome_enabled, campaign_second_visit_enabled, campaign_reactivation_21d_enabled, campaign_reward_available_enabled, campaign_vip_upgrade_enabled, campaign_referral_share_enabled, campaign_winback_60d_enabled"
    )
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    return { success: false, error: "Restaurant introuvable" };
  }

  // Check if automation trigger is active
  const r = restaurant as Record<string, unknown>;
  if (templateId === "welcome" && r.campaign_welcome_enabled === false) {
    return { success: false, error: "Campagne de bienvenue désactivée pour cet établissement" };
  }
  if (templateId === "second_visit" && r.campaign_second_visit_enabled === false) {
    return { success: false, error: "Campagne deuxième visite désactivée pour cet établissement" };
  }
  if (templateId === "reactivation_21d" && r.campaign_reactivation_21d_enabled === false) {
    return { success: false, error: "Campagne réactivation 21 jours désactivée pour cet établissement" };
  }
  if (templateId === "reward_available" && r.campaign_reward_available_enabled === false) {
    return { success: false, error: "Campagne récompense disponible désactivée pour cet établissement" };
  }
  if (templateId === "vip_upgrade" && r.campaign_vip_upgrade_enabled === false) {
    return { success: false, error: "Campagne statut privilégié désactivée pour cet établissement" };
  }
  if (templateId === "referral_share" && r.campaign_referral_share_enabled === false) {
    return { success: false, error: "Campagne partage et parrainage désactivée pour cet établissement" };
  }
  if (templateId === "winback_60d" && r.campaign_winback_60d_enabled === false) {
    return { success: false, error: "Campagne dernière chance 60 jours désactivée pour cet établissement" };
  }

  // 2. Fetch customer and STRICTLY check CASL marketing consent
  const { data: customer } = await admin
    .from("customers")
    .select("id, name, email, phone, marketing_consent")
    .eq("id", customerId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!customer) {
    return { success: false, error: "Client introuvable" };
  }

  if (!customer.marketing_consent) {
    // Under CASL / LCAP, marketing communication is strictly prohibited without consent.
    return {
      success: false,
      caslBlocked: true,
      error: "Envoi bloqué : le client n'a pas donné son consentement marketing explicite (LCAP / CASL).",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";
  const unsubscribeUrl = `${appUrl}/api/consent/unsubscribe?cid=${customer.id}&rid=${restaurantId}`;

  const rendered = renderCampaignTemplate(templateId, {
    restaurantName: restaurant.name,
    customerName: customer.name,
    timeSlot,
    offerText,
    unsubscribeUrl,
  });

  // Record campaign_sent lifecycle event
  await recordLifecycleEvent(
    {
      restaurantId,
      customerId,
      eventType: "campaign_sent",
      metadata: { templateId, preferredChannel: preferredChannel || "auto" },
    },
    admin
  );

  // 3. Determine channel: prefer customer channel or email first, SMS fallback
  let channelUsed: "email" | "sms" | undefined;

  if (preferredChannel === "sms" && customer.phone && isSmsConfigured()) {
    const ok = await sendSms(customer.phone, rendered.smsBody);
    if (ok) channelUsed = "sms";
  }

  if (!channelUsed && customer.email) {
    try {
      await sendRetentionEmail({
        to: customer.email,
        subject: rendered.subject,
        bodyHtml: rendered.htmlBody,
      });
      channelUsed = "email";
    } catch (e) {
      console.error("Email send failed in dispatchCampaignToCustomer:", e);
    }
  }

  // If email failed and phone is present, try SMS as fallback
  if (!channelUsed && customer.phone && isSmsConfigured()) {
    const ok = await sendSms(customer.phone, rendered.smsBody);
    if (ok) channelUsed = "sms";
  }

  if (!channelUsed) {
    return {
      success: false,
      error: "Aucun canal disponible (ni courriel valide, ni SMS opérationnel)",
    };
  }

  // Record message_delivered lifecycle event
  await recordLifecycleEvent(
    {
      restaurantId,
      customerId,
      eventType: "message_delivered",
      metadata: { templateId, channel: channelUsed },
    },
    admin
  );

  // 4. Log send in retention sends / activity
  try {
    const triggerMap: Record<CampaignTemplateId, string> = {
      welcome: "welcome",
      second_visit: "second_visit",
      reactivation_21d: "inactivity",
      off_peak: "off_peak",
      reward_available: "reward_available",
      vip_upgrade: "vip_upgrade",
      referral_share: "referral_share",
      winback_60d: "winback_60d",
    };

    await admin.from("customer_retention_sends").insert({
      restaurant_id: restaurantId,
      customer_id: customerId,
      trigger_type: triggerMap[templateId],
      channel: channelUsed,
    });

    await logActivity({
      restaurantId,
      actionType: "campaign.send",
      entityType: "customer",
      entityId: customerId,
      description: `Campagne « ${PRIORITIZED_CAMPAIGN_TEMPLATES[templateId].name} » envoyée à ${customer.name} via ${channelUsed.toUpperCase()}`,
    });
  } catch (err) {
    console.error("Failed to log retention send:", err);
  }

  return { success: true, channelUsed };
}
