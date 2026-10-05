import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRetentionEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { sendSms, isSmsConfigured } from "@/lib/sms/send";
import type { Customer } from "@/lib/types";
import { pickVariant } from "@/lib/retention/frequent";
import { getCustomerLanguage, type CustomerLanguage } from "@/lib/i18n/customer-language";

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
/**
 * Alternative push wording per trigger, used for customers on the opt-in
 * "Fréquent" level so the same reminder never reads the same twice in a row.
 */
export function frequentPushCopy(
  trigger: RetentionTrigger,
  restaurantName: string,
  firstName: string,
  seed: string,
  now: Date,
  extra?: { points: number; rewardName: string },
  language: CustomerLanguage = "fr"
): { title: string; body: string } | null {
  const points = extra?.points ?? 0;
  if (language === "en") {
    const rewardEn = extra?.rewardName ?? "a reward";
    switch (trigger) {
      case "reward_available":
        return pickVariant(
          [
            { title: `${points} points to redeem`, body: `${firstName}, “${rewardEn}” is waiting for you at ${restaurantName}.` },
            { title: `Your reward is ready`, body: `With ${points} pts, you can get “${rewardEn}”.` },
            { title: `${restaurantName} thought of you`, body: `“${rewardEn}” is within reach: ${points} points available.` },
          ],
          seed,
          now
        );
      case "inactivity":
      case "value_drift":
        return pickVariant(
          [
            { title: `${restaurantName} is waiting for you`, body: `${firstName}, come by: your loyalty card is ready.` },
            { title: `We saved your spot`, body: `A visit to ${restaurantName} moves your points forward, ${firstName}.` },
            { title: `In the mood for a good time?`, body: `${restaurantName} would love to see you again.` },
          ],
          seed,
          now
        );
      default:
        return null;
    }
  }
  const reward = extra?.rewardName ?? "une récompense";
  switch (trigger) {
    case "reward_available":
      return pickVariant(
        [
          { title: `${points} points à échanger`, body: `${firstName}, « ${reward} » vous attend chez ${restaurantName}.` },
          { title: `Votre récompense est prête`, body: `Avec ${points} pts, vous pouvez obtenir « ${reward} ».` },
          { title: `${restaurantName} a pensé à vous`, body: `« ${reward} » est à portée de main : ${points} points disponibles.` },
        ],
        seed,
        now
      );
    case "inactivity":
    case "value_drift":
      return pickVariant(
        [
          { title: `${restaurantName} vous attend`, body: `${firstName}, passez nous voir : votre carte fidélité est prête.` },
          { title: `On garde votre place`, body: `Une visite chez ${restaurantName} fait avancer vos points, ${firstName}.` },
          { title: `Envie d'un bon moment ?`, body: `${restaurantName} serait ravi de vous revoir.` },
        ],
        seed,
        now
      );
    default:
      return null;
  }
}

export function buildRetentionMessage(
  trigger: RetentionTrigger,
  restaurantName: string,
  customerName: string,
  extra?: { points: number; rewardName: string },
  language: CustomerLanguage = "fr"
) {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  const p = (text: string) => `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${text}</p>`;
  if (language === "en") return buildRetentionMessageEn(trigger, restaurantName, firstName, p, extra);

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

function buildRetentionMessageEn(
  trigger: RetentionTrigger,
  restaurantName: string,
  firstName: string,
  p: (text: string) => string,
  extra?: { points: number; rewardName: string }
) {
  const points = extra?.points ?? 0;
  const rewardName = extra?.rewardName ?? "a reward";
  switch (trigger) {
    case "inactivity":
      return {
        subject: `${firstName}, your table is waiting at ${restaurantName}`,
        bodyHtml: p(`Hello ${firstName},`) + p(`It has been a while since we saw you at ${restaurantName}. Your favorite dish is waiting. Come see us soon!`),
        smsBody: `${restaurantName}: ${firstName}, it has been a while! Come see us soon.`,
        pushTitle: `${restaurantName} is waiting for you`,
        pushBody: `It has been a while, ${firstName}. Come see us!`,
      };
    case "birthday":
      return {
        subject: `Happy birthday ${firstName}: a gift is waiting at ${restaurantName}`,
        bodyHtml: p(`Happy birthday, ${firstName}!`) + p(`The whole ${restaurantName} team wishes you a lovely day. Come by, we have a surprise for you.`),
        smsBody: `${restaurantName}: Happy birthday ${firstName}! A surprise is waiting for you in the dining room.`,
        pushTitle: `Happy birthday ${firstName}`,
        pushBody: `${restaurantName} has a surprise for you.`,
      };
    case "value_drift":
      return {
        subject: `${firstName}, we miss you at ${restaurantName}`,
        bodyHtml: p(`Hello ${firstName},`) + p(`You are one of our most loyal customers and we noticed your visits have become less frequent. We would love to see you again soon.`),
        smsBody: `${restaurantName}: ${firstName}, we miss you! Come see us soon.`,
        pushTitle: `We miss you, ${firstName}`,
        pushBody: `${restaurantName} would love to see you again soon.`,
      };
    case "reward_available":
      return {
        subject: `${firstName}, you have ${points} points to redeem at ${restaurantName}`,
        bodyHtml: p(`Hello ${firstName},`) + p(`You have ${points} loyalty points at ${restaurantName}, enough to redeem “${rewardName}”. Come and claim it!`),
        smsBody: `${restaurantName}: ${firstName}, you have ${points} pts, enough for “${rewardName}”. Come redeem them!`,
        pushTitle: `${points} points to redeem!`,
        pushBody: `You have enough for “${rewardName}” at ${restaurantName}.`,
      };
    case "onboarding_j1":
      return {
        subject: `Thank you for your first order at ${restaurantName}!`,
        bodyHtml: p(`Hello ${firstName},`) + p(`Thank you for ordering at ${restaurantName}. We hope you enjoyed it! See you at your next visit.`),
        smsBody: `${restaurantName}: Thank you for your first order, ${firstName}! See you soon.`,
        pushTitle: `Thank you, ${firstName}!`,
        pushBody: `${restaurantName} hopes to see you again soon.`,
      };
    case "onboarding_j3":
      return {
        subject: `${firstName}, we hope to see you again soon at ${restaurantName}`,
        bodyHtml: p(`Hello ${firstName},`) + p(`It has been a few days since your first order at ${restaurantName}. We would love to see you again!`),
        smsBody: `${restaurantName}: ${firstName}, we hope to see you again soon!`,
        pushTitle: `${restaurantName} is thinking of you`,
        pushBody: `Tempted by a second visit, ${firstName}?`,
      };
    case "onboarding_final":
      return {
        subject: `${firstName}, one last offer from ${restaurantName} before we say goodbye`,
        bodyHtml:
          p(`Hello ${firstName},`) +
          p(`We have not seen you since your first order at ${restaurantName}. No worries! Know that from ${points} loyalty points, you could get “${rewardName}”. We hope to see you again someday.`),
        smsBody: `${restaurantName}: ${firstName}, from ${points} pts you could get “${rewardName}”. We hope to see you again!`,
        pushTitle: `One last offer from ${restaurantName}`,
        pushBody: `From ${points} pts, get “${rewardName}”.`,
      };
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
  extra?: { points: number; rewardName: string },
  options?: { frequent?: boolean; now?: Date }
): Promise<RetentionChannel | null> {
  const language = await getCustomerLanguage(admin, customer.id);
  const msg = buildRetentionMessage(trigger, restaurantName, customer.name, extra, language);
  let channel: RetentionChannel | null = null;

  // "Fréquent" is a push-only level: never email or text someone daily.
  if (options?.frequent) {
    if (!customer.userId) return null;
    const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
    const copy = frequentPushCopy(trigger, restaurantName, firstName, customer.id, options.now ?? new Date(), extra, language);
    await sendPushToUsers(
      [customer.userId],
      { title: copy?.title ?? msg.pushTitle, body: copy?.body ?? msg.pushBody, link: "/portal" },
      restaurantId
    );
    await admin
      .from("customer_retention_sends")
      .insert({ restaurant_id: restaurantId, customer_id: customer.id, trigger_type: trigger, channel: "push" });
    return "push";
  }

  if (customer.email) {
    const result = await sendRetentionEmail({ to: customer.email, subject: msg.subject, bodyHtml: msg.bodyHtml, language });
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
