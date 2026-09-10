import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRetentionEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { sendSms, isSmsConfigured } from "@/lib/sms/send";
import type { Customer } from "@/lib/types";

export type RetentionTrigger =
  | "inactivity"
  | "birthday"
  | "value_drift"
  | "reward_available"
  | "onboarding_j1"
  | "onboarding_j3"
  | "onboarding_final";
export type RetentionChannel = "email" | "push" | "sms";

/**
 * Shared between the daily cron (app/api/cron/retention-engine), the
 * onboarding drip (app/api/cron/onboarding-engine), and the manual
 * "Relancer maintenant" action on /impact — same message, whichever
 * picked the customer. `extra` applies to "reward_available" (the
 * customer's real points balance) and "onboarding_final" (the cheapest
 * reward's cost, as a teaser — not a claim they already have enough).
 */
export function buildRetentionMessage(
  trigger: RetentionTrigger,
  restaurantName: string,
  customerName: string,
  extra?: { points: number; rewardName: string }
) {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  const p = (text: string) => `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${text}</p>`;

  switch (trigger) {
    case "inactivity":
      return {
        subject: `${firstName}, votre table vous attend chez ${restaurantName}`,
        bodyHtml:
          p(`Bonjour ${firstName},`) +
          p(`Ça fait un moment qu'on ne vous a pas vu chez ${restaurantName} — votre plat préféré vous attend. Passez nous voir bientôt !`),
        smsBody: `${restaurantName} : ${firstName}, ça fait un moment ! Revenez nous voir bientôt.`,
        pushTitle: `${restaurantName} vous attend`,
        pushBody: `Ça fait un moment, ${firstName} — revenez nous voir !`,
      };
    case "birthday":
      return {
        subject: `Joyeux anniversaire ${firstName} — un cadeau vous attend chez ${restaurantName}`,
        bodyHtml:
          p(`Joyeux anniversaire, ${firstName} !`) +
          p(`Toute l'équipe de ${restaurantName} vous souhaite une belle journée — passez nous voir, on a une surprise pour vous.`),
        smsBody: `${restaurantName} : Joyeux anniversaire ${firstName} ! Une surprise vous attend en salle.`,
        pushTitle: `Joyeux anniversaire ${firstName}`,
        pushBody: `${restaurantName} a une surprise pour vous.`,
      };
    case "value_drift":
      return {
        subject: `${firstName}, on s'ennuie de vous chez ${restaurantName}`,
        bodyHtml:
          p(`Bonjour ${firstName},`) +
          p(`Vous êtes l'un de nos clients les plus fidèles et on remarque que vos visites se sont espacées. On serait ravis de vous revoir bientôt.`),
        smsBody: `${restaurantName} : ${firstName}, on s'ennuie de vous ! Revenez nous voir bientôt.`,
        pushTitle: `On s'ennuie de vous, ${firstName}`,
        pushBody: `${restaurantName} aimerait vous revoir bientôt.`,
      };
    case "reward_available": {
      const points = extra?.points ?? 0;
      const rewardName = extra?.rewardName ?? "une récompense";
      return {
        subject: `${firstName}, vous avez ${points} points à échanger chez ${restaurantName}`,
        bodyHtml:
          p(`Bonjour ${firstName},`) +
          p(`Vous avez ${points} points de fidélité chez ${restaurantName} — assez pour échanger « ${rewardName} ». Passez les réclamer !`),
        smsBody: `${restaurantName} : ${firstName}, vous avez ${points} pts — assez pour « ${rewardName} ». Venez les échanger !`,
        pushTitle: `${points} points à échanger !`,
        pushBody: `Vous avez assez pour « ${rewardName} » chez ${restaurantName}.`,
      };
    }
    case "onboarding_j1":
      return {
        subject: `Merci pour votre première commande chez ${restaurantName} !`,
        bodyHtml:
          p(`Bonjour ${firstName},`) +
          p(`Merci d'avoir commandé chez ${restaurantName} — on espère que ça vous a plu ! À bientôt pour une prochaine visite.`),
        smsBody: `${restaurantName} : Merci pour votre première commande, ${firstName} ! À bientôt.`,
        pushTitle: `Merci, ${firstName} !`,
        pushBody: `${restaurantName} espère vous revoir bientôt.`,
      };
    case "onboarding_j3":
      return {
        subject: `${firstName}, on espère vous revoir bientôt chez ${restaurantName}`,
        bodyHtml:
          p(`Bonjour ${firstName},`) +
          p(`Ça fait quelques jours depuis votre première commande chez ${restaurantName} — on serait ravis de vous revoir !`),
        smsBody: `${restaurantName} : ${firstName}, on espère vous revoir bientôt !`,
        pushTitle: `${restaurantName} pense à vous`,
        pushBody: `Une deuxième visite vous tente, ${firstName} ?`,
      };
    case "onboarding_final": {
      const points = extra?.points ?? 0;
      const rewardName = extra?.rewardName ?? "une récompense";
      return {
        subject: `${firstName}, une dernière offre de ${restaurantName} avant qu'on se dise au revoir`,
        bodyHtml:
          p(`Bonjour ${firstName},`) +
          p(
            `On ne vous a pas revu depuis votre première commande chez ${restaurantName} — pas de souci ! Sachez qu'à partir de ${points} points de fidélité, vous pourriez obtenir « ${rewardName} ». On espère vous revoir un jour.`
          ),
        smsBody: `${restaurantName} : ${firstName}, dès ${points} pts vous pourriez avoir « ${rewardName} ». On espère vous revoir !`,
        pushTitle: `Une dernière offre de ${restaurantName}`,
        pushBody: `Dès ${points} pts, obtenez « ${rewardName} ».`,
      };
    }
  }
}

/**
 * Tries email, then push, then SMS — first one that succeeds wins, same
 * one-channel-per-nudge rule the cron uses. Logs the send to
 * customer_retention_sends on success so the daily cron's frequency cap
 * also respects a manual nudge (no double-touch same week).
 */
export async function sendRetentionNudge(
  admin: SupabaseClient,
  restaurantId: string,
  restaurantName: string,
  customer: Pick<Customer, "id" | "name" | "email" | "userId" | "phone">,
  trigger: RetentionTrigger,
  extra?: { points: number; rewardName: string }
): Promise<RetentionChannel | null> {
  const msg = buildRetentionMessage(trigger, restaurantName, customer.name, extra);
  let channel: RetentionChannel | null = null;

  if (customer.email) {
    const result = await sendRetentionEmail({ to: customer.email, subject: msg.subject, bodyHtml: msg.bodyHtml });
    if (result.ok) channel = "email";
  }
  if (!channel && customer.userId) {
    await sendPushToUsers([customer.userId], { title: msg.pushTitle, body: msg.pushBody, link: "/portal" }, restaurantId);
    channel = "push";
  }
  if (!channel && isSmsConfigured() && customer.phone) {
    const ok = await sendSms(customer.phone, msg.smsBody);
    if (ok) channel = "sms";
  }

  if (channel) {
    await admin
      .from("customer_retention_sends")
      .insert({ restaurant_id: restaurantId, customer_id: customer.id, trigger_type: trigger, channel });
  }

  return channel;
}
