import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRetentionEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { sendSms, isSmsConfigured } from "@/lib/sms/send";
import type { Customer } from "@/lib/types";

export type RetentionTrigger = "inactivity" | "birthday" | "value_drift" | "reward_available";
export type RetentionChannel = "email" | "push" | "sms";

/**
 * Shared between the daily cron (app/api/cron/retention-engine) and the
 * manual "Relancer maintenant" action on /impact — same message, whether
 * the automated engine picked the customer or the owner did. `extra` only
 * applies to "reward_available" — the other triggers ignore it.
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
