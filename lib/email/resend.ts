import "server-only";
import { Resend } from "resend";
import { ACTIVE_PRODUCT_UPDATES_SEGMENT_ID } from "@/lib/email/product-updates";
import {
  MINERVA_EMAIL_FROM,
  MINERVA_EMAIL_PHONE,
  MINERVA_EMAIL_POSTAL_ADDRESS,
  MINERVA_EMAIL_REPLY_TO,
  MINERVA_EMAIL_SITE_URL,
} from "@/lib/email/identity";
import { renderMinervaEmail } from "@/lib/email/brand-shell";
import { renderCampaignAnnouncementEmail } from "@/lib/email/campaign-template";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = MINERVA_EMAIL_FROM;
const REPLY_TO = MINERVA_EMAIL_REPLY_TO;

export { sendLifecycleEmail, processLifecycleEngine } from "./lifecycle";
export {
  renderLifecycleEmail,
  renderLoyaltyRetentionEmail,
  renderWeeklyReportEmail,
  renderSpecialOfferEmail,
} from "./lifecycle-templates";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";

function emailShell(
  bodyHtml: string,
  ctaLabel: string,
  ctaUrl: string,
  language: "fr" | "en" = "fr",
  title?: string,
  eyebrow?: string
): string {
  return renderMinervaEmail({ bodyHtml, ctaLabel, ctaUrl, language, title, eyebrow, preheader: title });
}

const AUTH_ACTION_COPY: Record<string, { subject: string; body: string; cta: string }> = {
  magiclink: {
    subject: "Votre connexion Minerva Flow",
    body: "Utilisez ce lien pour vous connecter à votre compte. Si vous ne l’avez pas demandé, ignorez ce courriel.",
    cta: "Me connecter",
  },
  signup: {
    subject: "Confirmez votre compte Minerva Flow",
    body: "Bienvenue — confirmez votre adresse pour activer votre compte.",
    cta: "Confirmer mon compte",
  },
  recovery: {
    subject: "Réinitialisez votre mot de passe Minerva Flow",
    body: "Une réinitialisation de mot de passe a été demandée pour ce compte. Si ce n'était pas vous, ignorez ce courriel.",
    cta: "Choisir un nouveau mot de passe",
  },
  email_change: {
    subject: "Confirmez votre nouvelle adresse — Minerva Flow",
    body: "Confirmez le changement d'adresse courriel sur votre compte Minerva Flow.",
    cta: "Confirmer la nouvelle adresse",
  },
  invite: {
    subject: "Vous êtes invité·e sur Minerva Flow",
    body: "Vous avez été invité·e à rejoindre un établissement sur Minerva Flow.",
    cta: "Accepter l'invitation",
  },
  reauthentication: {
    subject: "Confirmez votre identité — Minerva Flow",
    body: "Une confirmation supplémentaire est nécessaire pour continuer.",
    cta: "Confirmer",
  },
  password_changed: {
    subject: "Votre mot de passe a été modifié — Minerva Flow",
    body: "Le mot de passe de votre compte vient d’être modifié. Si vous n’êtes pas à l’origine de cette action, contactez immédiatement notre équipe de soutien.",
    cta: "Ouvrir Minerva Flow",
  },
  email_changed: {
    subject: "Votre adresse courriel a été modifiée — Minerva Flow",
    body: "L’adresse courriel de votre compte vient d’être modifiée. Si vous n’êtes pas à l’origine de cette action, contactez immédiatement notre équipe de soutien.",
    cta: "Ouvrir Minerva Flow",
  },
  phone_changed: {
    subject: "Votre numéro a été modifié — Minerva Flow",
    body: "Le numéro de téléphone de votre compte vient d’être modifié. Si vous n’êtes pas à l’origine de cette action, contactez immédiatement notre équipe de soutien.",
    cta: "Ouvrir Minerva Flow",
  },
  identity_linked: {
    subject: "Une méthode de connexion a été ajoutée — Minerva Flow",
    body: "Une nouvelle méthode de connexion vient d’être liée à votre compte.",
    cta: "Ouvrir Minerva Flow",
  },
  identity_unlinked: {
    subject: "Une méthode de connexion a été retirée — Minerva Flow",
    body: "Une méthode de connexion vient d’être retirée de votre compte.",
    cta: "Ouvrir Minerva Flow",
  },
  factor_added: {
    subject: "Une protection supplémentaire a été ajoutée — Minerva Flow",
    body: "Une méthode d’authentification multifacteur vient d’être ajoutée à votre compte.",
    cta: "Ouvrir Minerva Flow",
  },
  factor_removed: {
    subject: "Une protection supplémentaire a été retirée — Minerva Flow",
    body: "Une méthode d’authentification multifacteur vient d’être retirée de votre compte.",
    cta: "Ouvrir Minerva Flow",
  },
};

/**
 * Fallback for every staff-side auth email (signup confirmation, password
 * recovery, email change, invite) once the Send Email Auth Hook is enabled
 * project-wide (see app/api/auth/send-email-hook) — Supabase no longer
 * sends anything on its own for ANY auth email type once that hook exists,
 * so this covers everything the hook doesn't route to
 * sendCustomerOtpEmail. Builds the same verification URL Supabase's own
 * default template would have used.
 */
export async function sendAuthActionEmail({
  to,
  actionType,
  verifyUrl,
}: {
  to: string;
  actionType: string;
  verifyUrl: string;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };
  const copy = AUTH_ACTION_COPY[actionType] ?? {
    subject: "Notification de sécurité — Minerva Flow",
    body: "Une action liée à votre compte vient d’être effectuée. Ouvrez Minerva Flow pour la consulter.",
    cta: "Ouvrir Minerva Flow",
  };

  const body = `<p>${copy.body}</p>`;
  const html = verifyUrl
    ? emailShell(body, copy.cta, verifyUrl, "fr", copy.subject, "Compte Minerva Flow")
    : emailShell(body, copy.cta, APP_ORIGIN, "fr", copy.subject, "Compte Minerva Flow");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: copy.subject,
    html,
  });
  return { ok: !error };
}

export async function sendOrderStatusEmail(input: {
  to: string;
  restaurantName: string;
  orderId: string;
  status: "soumise" | "confirmee" | "en_preparation" | "prete" | "servie" | "annulee";
  total: number;
  cancellationReason?: string | null;
  language?: "fr" | "en";
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };
  const en = input.language === "en";
  const statusCopyEn: Record<typeof input.status, { label: string; explanation: string }> = {
    soumise: { label: "Received", explanation: "Thank you! The restaurant is looking at your order and will confirm the next step shortly. If an item is unavailable, the team will write to you or cancel the order at no charge." },
    confirmee: { label: "Confirmed!", explanation: "Your meal will be ready soon. Come at the planned time; payment is made on site. If something comes up, the restaurant will contact you or cancel the order at no charge." },
    en_preparation: { label: "Being prepared", explanation: "The team is preparing your meal with care. We will let you know as soon as it is ready." },
    prete: { label: "Ready for you", explanation: "Your order is waiting for you at the restaurant. You can pick it up at the planned time and pay on site." },
    servie: { label: "Enjoy your meal!", explanation: "Your order is complete. Thank you for choosing this restaurant!" },
    annulee: { label: "Order cancelled at no charge", explanation: `A small hiccup: the restaurant will not be able to prepare this order. You will not be asked to pay.${input.cancellationReason ? ` Reason: ${input.cancellationReason}` : ""} You can contact the team if you would like to discuss it.` },
  };
  const statusCopy: Record<typeof input.status, { label: string; explanation: string }> = {
    soumise: { label: "Bien reçue", explanation: "Merci ! Le restaurant regarde votre commande et vous confirme la suite bientôt. Si un article n’est pas disponible, l’équipe vous écrira ou annulera la commande sans frais." },
    confirmee: { label: "C’est confirmé !", explanation: "Votre repas sera bientôt prêt. Venez à l’heure prévue; le paiement se fera sur place. En cas d’imprévu, le restaurant vous contactera ou annulera la commande sans frais." },
    en_preparation: { label: "En préparation", explanation: "L’équipe prépare votre repas avec soin. Nous vous préviendrons dès qu’il sera prêt." },
    prete: { label: "Prête à vous accueillir", explanation: "Votre commande vous attend au restaurant. Vous pouvez venir la récupérer à l’heure prévue et payer sur place." },
    servie: { label: "Bon appétit !", explanation: "Votre commande est terminée. Merci d’avoir choisi ce restaurant !" },
    annulee: { label: "Commande annulée sans frais", explanation: `Petit imprévu : le restaurant ne pourra pas préparer cette commande. Aucun paiement ne vous sera demandé.${input.cancellationReason ? ` Motif : ${input.cancellationReason}` : ""} Vous pouvez contacter l’équipe si vous souhaitez en discuter.` },
  };
  const content = (en ? statusCopyEn : statusCopy)[input.status];
  const orderReference = input.orderId.slice(0, 8).toUpperCase();
  const money = new Intl.NumberFormat(en ? "en-CA" : "fr-CA", { style: "currency", currency: "CAD" }).format(input.total);
  const body = en
    ? `<p>Hey! Here is a quick update about your order at <strong>${escapeHtml(input.restaurantName)}</strong>.</p><div style="padding:18px;border-radius:16px;background:#f5f1e6;margin:18px 0"><p style="margin:0;color:#167f5b;font-weight:700">${content.label}</p><p style="margin:8px 0 0">${escapeHtml(content.explanation)}</p><p style="margin:10px 0 0;color:#667">Order #${orderReference} · ${money}</p></div><p>You can follow your order in Flow Direct. See you soon!</p>`
    : `<p>Hey ! Voici une petite nouvelle au sujet de votre commande chez <strong>${escapeHtml(input.restaurantName)}</strong>.</p><div style="padding:18px;border-radius:16px;background:#f5f1e6;margin:18px 0"><p style="margin:0;color:#167f5b;font-weight:700">${content.label}</p><p style="margin:8px 0 0">${escapeHtml(content.explanation)}</p><p style="margin:10px 0 0;color:#667">Commande #${orderReference} · ${money}</p></div><p>Vous pouvez retrouver les nouvelles de votre commande dans Flow Direct. À bientôt !</p>`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.to,
    replyTo: REPLY_TO,
    subject: `${en ? "Order" : "Commande"} ${orderReference} — ${content.label} · Minerva Flow`,
    html: emailShell(body, en ? "Open Flow Direct" : "Consulter Flow Direct", APP_ORIGIN, en ? "en" : "fr", en ? "Order update" : "Suivi de votre commande", `Commande ${orderReference} · ${content.label}`),
  });
  return { ok: !error };
}


/**
 * Best-effort: caller keeps the copyable link in the UI as the source of
 * truth regardless of what this returns — email delivery is a nicety, never
 * a blocker for invite creation. Returns ok:false (silently) if RESEND_API_KEY
 * isn't configured, same degrade-gracefully pattern as lib/stripe/config.ts.
 */
export async function sendInviteEmail({
  to,
  token,
  workspaceName,
  role,
}: {
  to: string;
  token: string;
  workspaceName: string;
  role: string;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const inviteUrl = `${APP_ORIGIN}/invite/w/${token}`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Invitation à rejoindre ${workspaceName} sur Minerva Flow`,
    html: emailShell(
      `<p style="font-size:14px;line-height:1.6">Vous avez été invité·e à rejoindre <strong>${escapeHtml(workspaceName)}</strong> en tant que <strong>${escapeHtml(role)}</strong> sur Minerva Flow.</p>`,
      "Accepter l'invitation",
      inviteUrl,
      "fr",
      "Votre invitation Minerva Flow",
      workspaceName
    ),
  });
  return { ok: !error };
}

/**
 * Same best-effort contract as sendInviteEmail — see its doc comment.
 * Distinct copy: mentions /mon-espace specifically since an employee login
 * invite grants access to a different, narrower surface (their own tasks
 * and shifts) than a full collaborator invite.
 */
export async function sendEmployeeInviteEmail({
  to,
  token,
  employeeName,
  restaurantName,
}: {
  to: string;
  token: string;
  employeeName: string;
  restaurantName: string;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const inviteUrl = `${APP_ORIGIN}/invite/w/${token}`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${employeeName}, connectez-vous à votre espace chez ${restaurantName}`,
    html: emailShell(
      `<p style="font-size:14px;line-height:1.6">${escapeHtml(restaurantName)} vous invite à créer votre compte pour accéder à votre espace personnel — vos tâches et votre horaire.</p>`,
      "Créer mon compte",
      inviteUrl,
      "fr",
      "Votre espace employé vous attend",
      restaurantName
    ),
  });
  return { ok: !error };
}

/**
 * Best-effort reminder to the owner when the daily poll-google-reviews
 * cron detects a new Google Maps review at or below the reputation
 * threshold (see app/api/cron/poll-google-reviews) — same fire-and-forget
 * contract as every other sender here. Author name and review text come
 * from Google (external, untrusted), so they're escaped here rather than
 * left to the caller.
 */
export async function sendReputationAlertEmail({
  to,
  restaurantName,
  authorName,
  rating,
  reviewText,
}: {
  to: string;
  restaurantName: string;
  authorName: string;
  rating: number;
  reviewText: string | null;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const safeRestaurantName = escapeHtml(restaurantName);
  const bodyHtml = `
    <p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">
      ${safeRestaurantName} a reçu un nouvel avis Google Maps de <strong>${escapeHtml(authorName)}</strong> :
    </p>
    <p style="font-size: 20px; color: #167f5b; margin: 4px 0;">${stars}</p>
    ${reviewText ? `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6; font-style: italic;">« ${escapeHtml(reviewText)} »</p>` : ""}
    <p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">
      Répondez-y directement depuis votre page Réputation.
    </p>
  `;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${restaurantName} — nouvel avis Google Maps (${rating}★)`,
    html: emailShell(bodyHtml, "Voir et répondre", `${APP_ORIGIN}/reputation`, "fr", "Nouvel avis Google Maps", restaurantName),
  });
  return { ok: !error };
}

/**
 * Automated retention win-back/birthday email (app/api/cron/retention-engine)
 * — same best-effort contract as sendInviteEmail. bodyHtml is caller-composed
 * (rule-based templates, not AI-generated per send — see the cron route),
 * escaped by the caller before interpolating any customer-provided text.
 */
export async function sendRetentionEmail({
  to,
  subject,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  title,
  emailKind = "transactional",
  unsubscribeUrl,
  consentReason,
  language = "fr",
}: {
  to: string;
  subject: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Set to null when bodyHtml already includes its own heading. */
  title?: string | null;
  emailKind?: "transactional" | "marketing";
  unsubscribeUrl?: string;
  consentReason?: string;
  language?: "fr" | "en";
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: renderMinervaEmail({
      documentTitle: subject,
      preheader: subject,
      title: title === null ? undefined : title ?? subject,
      bodyHtml,
      ctaLabel: ctaLabel ?? (language === "en" ? "View my points" : "Voir mes points"),
      ctaUrl: ctaUrl ?? `${APP_ORIGIN}${language === "en" ? "/en" : ""}/portal`,
      emailKind,
      unsubscribeUrl,
      consentReason,
      language,
    }),
  });
  return { ok: !error };
}

/**
 * Same shell/branding as sendRetentionEmail but with a caller-chosen CTA —
 * for one-off transactional sends (e.g. "commande prête") that don't fit
 * the retention module's fixed "Voir mes points" → /portal link.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  language = "fr",
}: {
  to: string;
  subject: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  language?: "fr" | "en";
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: emailShell(bodyHtml, ctaLabel, ctaUrl, language, subject),
  });
  return { ok: !error };
}

type CampaignCategory = "fonctionnalite" | "amelioration" | "correctif";

const CAMPAIGN_CATEGORY_LABEL: Record<CampaignCategory, string> = {
  fonctionnalite: "Nouvelle fonctionnalité",
  amelioration: "Amélioration",
  correctif: "Correctif",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Branded transactional notices for the Minerva Flow ambassador program. */
export async function sendFlowAmbassadorEmail(input: {
  to: string;
  kind: "welcome" | "commission" | "payout" | "ugc-approved" | "ugc-revision";
  commissionAmount?: number;
  currency?: string;
  payableAt?: string;
  payoutReference?: string;
  restaurantName?: string;
  reviewNote?: string;
}): Promise<boolean> {
  if (!resend) return false;
  const commission = input.commissionAmount !== undefined
    ? new Intl.NumberFormat("fr-CA", { style: "currency", currency: (input.currency ?? "CAD").toUpperCase() }).format(input.commissionAmount)
    : "";
  const payableDate = input.payableAt
    ? new Date(input.payableAt).toLocaleDateString("fr-CA", { dateStyle: "long" })
    : "";
  const copy = input.kind === "welcome"
    ? {
        subject: "Bienvenue dans le programme Ambassadeur Minerva Flow",
        heading: "Votre lien ambassadeur est prêt",
        body: "Partagez votre expérience avec d’autres restaurateurs. Les nouvelles inscriptions via votre lien seront attribuées à votre compte.",
      }
    : input.kind === "commission"
    ? {
        subject: `Une commission Minerva Flow est en attente · ${commission}`,
        heading: "Une commission vient d’être enregistrée",
        body: `Votre recommandation a généré une commission de <strong>${escapeHtml(commission)}</strong> (selon les conditions de votre contrat). Elle devient payable à partir du <strong>${escapeHtml(payableDate)}</strong>.`,
      }
    : input.kind === "payout"
    ? {
        subject: `Votre versement ambassadeur a été envoyé à Stripe · ${commission}`,
        heading: "Votre versement est parti",
        body: `Un montant de <strong>${escapeHtml(commission)}</strong> a été envoyé à votre compte Stripe connecté. Stripe dépose ensuite les fonds selon son calendrier bancaire.<br /><br />Référence : <span style="font-family:monospace">${escapeHtml(input.payoutReference ?? "consultable dans votre espace")}</span>`,
      }
    : input.kind === "ugc-approved"
    ? {
        subject: "Votre publication restaurant est approuvée",
        heading: "Votre contenu est approuvé",
        body: `Votre publication pour <strong>${escapeHtml(input.restaurantName ?? "le restaurant partenaire")}</strong> est approuvée par l’équipe Minerva Flow. Merci de respecter la divulgation publicitaire et l’accord du restaurant lors de sa diffusion.`,
      }
    : {
        subject: "Une modification est requise pour votre contenu ambassadeur",
        heading: "Votre publication demande une modification",
        body: `Consultez la note de révision dans votre espace ambassadeur et soumettez une nouvelle version lorsque les ajustements sont faits.${input.reviewNote ? `<br /><br /><strong>Note :</strong> ${escapeHtml(input.reviewNote)}` : ""}`,
      };
  const html = renderMinervaEmail({
    eyebrow: "Ambassadeur Minerva Flow",
    title: copy.heading,
    bodyHtml: `<p style="margin:0">${copy.body}</p>`,
    ctaLabel: input.kind.startsWith("ugc-") ? "Voir mon contenu" : "Ouvrir mon espace ambassadeur",
    ctaUrl: `${APP_ORIGIN}/workspace/ambassadeurs`,
    footer: "Notification au sujet de votre compte ambassadeur.",
  });
  const { error } = await resend.emails.send({ from: FROM_EMAIL, to: input.to, subject: copy.subject, html });
  return !error;
}

/**
 * Reuses the editorial campaign shell used by the recent release emails.
 * Product updates keep the same centered logo, typography, spacing, CTA,
 * warm surfaces, and footer across future releases.
 *
 * Includes the {{{RESEND_UNSUBSCRIBE_URL}}} merge tag Resend requires on
 * Broadcasts sent to a contacts segment.
 */
function campaignEmailHtml({
  title,
  description,
  category,
  ctaUrl,
}: {
  title: string;
  description: string;
  category: CampaignCategory;
  ctaUrl: string;
}): string {
  const safeDescription = escapeHtml(description);
  return renderCampaignAnnouncementEmail({
    title,
    eyebrow: CAMPAIGN_CATEGORY_LABEL[category],
    preheader: description.slice(0, 150),
    bodyHtml: `<p style="margin:0;white-space:pre-line;">${safeDescription}</p>`,
    ctaLabel: "Voir le journal des nouveautés",
    ctaUrl,
  });
}

/**
 * Sends the changelog announcement as an email campaign (Resend Broadcast)
 * only to the curated, active opt-in segment. In-app/push announcements
 * remain separate and may still reach all eligible application users.
 */
export async function sendChangelogCampaignEmail({
  title,
  description,
  category,
  link,
}: {
  title: string;
  description: string;
  category: CampaignCategory;
  link: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!resend) return { ok: false, reason: "resend_not_configured" };

  const ctaUrl = `${APP_ORIGIN}${link}`;
  const { error } = await resend.broadcasts.create({
    segmentId: ACTIVE_PRODUCT_UPDATES_SEGMENT_ID,
    from: FROM_EMAIL,
    subject: `Nouveauté sur Minerva Flow : ${title}`,
    previewText: description.slice(0, 120),
    html: campaignEmailHtml({ title, description, category, ctaUrl }),
    text: `${CAMPAIGN_CATEGORY_LABEL[category]}\n${title}\n\n${description}\n\n${ctaUrl}\n\nVous recevez ce courriel parce que vous avez choisi de recevoir les annonces produit de Minerva Flow.\nSe désabonner : {{{RESEND_UNSUBSCRIBE_URL}}}\nMinerva Flow · Minerva Technologies Inc. · ${MINERVA_EMAIL_POSTAL_ADDRESS}\n${MINERVA_EMAIL_SITE_URL} · ${MINERVA_EMAIL_REPLY_TO} · ${MINERVA_EMAIL_PHONE}`,
    send: true,
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

const FEEDBACK_RECIPIENT = "kbelceus776@gmail.com";

/**
 * A one-to-one transactional send, not a Broadcast — unlike
 * sendChangelogCampaignEmail, this works fine from the shared sandbox
 * domain (Resend only blocks Broadcasts from resend.dev, not regular
 * emails.send calls), so it's not affected by the unverified-domain issue.
 */
export async function sendFeatureFeedbackEmail({
  submitterName,
  submitterEmail,
  restaurantName,
  pollOption,
  suggestion,
}: {
  submitterName: string;
  submitterEmail: string;
  restaurantName: string | null;
  pollOption: string | null;
  suggestion: string | null;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const p = (text: string) => `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6; margin: 0 0 10px;">${text}</p>`;
  const bodyHtml =
    p(`<strong>${escapeHtml(submitterName)}</strong> (${escapeHtml(submitterEmail)})${restaurantName ? ` — ${escapeHtml(restaurantName)}` : ""}`) +
    (pollOption ? p(`<strong>Vote :</strong> ${escapeHtml(pollOption)}`) : "") +
    (suggestion ? p(`<strong>Suggestion :</strong> ${escapeHtml(suggestion)}`) : "");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: FEEDBACK_RECIPIENT,
    replyTo: submitterEmail,
    subject: `Feedback Minerva Flow — ${submitterName}`,
    html: renderMinervaEmail({
      eyebrow: "Retour produit",
      title: "Nouveau commentaire",
      bodyHtml,
      footer: "Notification interne destinée à l’équipe Minerva Flow.",
    }),
  });
  return { ok: !error };
}

/**
 * Native customer-app survey (SurveyView.swift) — same fire-and-forget,
 * no-op-on-missing-key contract as sendFeatureFeedbackEmail, reusing the
 * same recipient since both are "someone left feedback" mail with no
 * dashboard to read it from otherwise. All fields come from a customer's
 * device over the /api/portal/survey bridge, so every interpolated value
 * is escaped.
 */
export async function sendSurveyResponseEmail({
  customerName,
  customerEmail,
  restaurantName,
  rating,
  comment,
}: {
  customerName: string;
  customerEmail: string | null;
  restaurantName: string;
  rating: number;
  comment: string | null;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const p = (text: string) => `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6; margin: 0 0 10px;">${text}</p>`;
  const stars = "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
  const bodyHtml =
    p(`<strong>${escapeHtml(customerName)}</strong>${customerEmail ? ` (${escapeHtml(customerEmail)})` : ""} — ${escapeHtml(restaurantName)}`) +
    p(`<strong>Note :</strong> ${stars} (${rating}/5)`) +
    (comment ? p(`<strong>Commentaire :</strong> ${escapeHtml(comment)}`) : "");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: FEEDBACK_RECIPIENT,
    replyTo: customerEmail ?? REPLY_TO,
    subject: `Sondage app — ${restaurantName} (${rating}/5)`,
    html: renderMinervaEmail({
      eyebrow: "Retour produit",
      title: "Nouvelle réponse au sondage",
      bodyHtml,
      footer: "Notification interne destinée à l’équipe Minerva Flow.",
    }),
  });
  return { ok: !error };
}

/**
 * Sends an employee's upcoming schedule via Resend with luxury editorial branding.
 * Includes a clean, responsive table of shifts and a CTA button to view the live online schedule.
 */
export async function sendEmployeeScheduleEmail({
  to,
  employeeName,
  restaurantName,
  shifts,
  scheduleUrl,
}: {
  to: string;
  employeeName: string;
  restaurantName: string;
  shifts: { shiftDate: string; startTime: string; endTime: string; positionLabel?: string | null }[];
  scheduleUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: "Service de messagerie non configuré." };

  const safeEmployeeName = escapeHtml(employeeName);
  const safeRestaurantName = escapeHtml(restaurantName);

  const rows = shifts
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 14px; border-bottom:1px solid #eee9db; font-size:13px; font-weight:600; color:#1a1e16;">${escapeHtml(s.shiftDate)}</td>
        <td style="padding:10px 14px; border-bottom:1px solid #eee9db; font-size:13px; color:#565f52;">${escapeHtml(s.startTime.slice(0, 5))} – ${escapeHtml(s.endTime.slice(0, 5))}</td>
        <td style="padding:10px 14px; border-bottom:1px solid #eee9db; font-size:13px; color:#8d9488;">${escapeHtml(s.positionLabel ?? "Quart standard")}</td>
      </tr>`
    )
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 18px; font-size:14px; color:#565f52; line-height:1.5;">
      Bonjour <strong>${safeEmployeeName}</strong>, voici vos prochains quarts de travail planifiés chez <strong>${safeRestaurantName}</strong> :
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px; border:1px solid #e6e0d0; border-radius:12px; background:#fbf9f3; overflow:hidden;">
      <thead>
        <tr style="background:#f5f1e6;">
          <th align="left" style="padding:10px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#8d9488; border-bottom:1px solid #e6e0d0;">Date</th>
          <th align="left" style="padding:10px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#8d9488; border-bottom:1px solid #e6e0d0;">Heures</th>
          <th align="left" style="padding:10px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#8d9488; border-bottom:1px solid #e6e0d0;">Poste</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="3" style="padding:16px; text-align:center; font-size:13px; color:#8d9488;">Aucun quart planifié pour l\'instant.</td></tr>'}
      </tbody>
    </table>
    <p style="margin:0 0 8px; font-size:13px; color:#565f52;">
      Vous pouvez également consulter votre horaire à tout moment en ligne :
    </p>
  `;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Votre horaire de travail — ${restaurantName}`,
    html: emailShell(bodyHtml, "Consulter mon horaire en ligne", scheduleUrl, "fr", "Votre horaire de travail", restaurantName),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendServiceQuotePaymentEmail(input: {
  to: string;
  guestName: string;
  restaurantName: string;
  checkoutUrl: string;
  amount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines: { name: string; quantity: number; unitPrice: number }[];
  eventAt: string | null;
  timeZone: string;
  expiresAt: string;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };
  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(input.checkoutUrl);
    if (checkoutUrl.protocol !== "https:") return { ok: false };
  } catch { return { ok: false }; }
  const event = input.eventAt
    ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "long", timeStyle: "short", timeZone: input.timeZone }).format(new Date(input.eventAt))
    : "à confirmer avec le restaurant";
  const expiry = new Intl.DateTimeFormat("fr-CA", { dateStyle: "long", timeStyle: "short", timeZone: input.timeZone }).format(new Date(input.expiresAt));
  const amount = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(input.amount);
  const total = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(input.total);
  const subtotal = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(input.subtotal);
  const taxAmount = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(input.taxAmount);
  const lineRows = input.lines.map((line) => `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #eee9db;font-size:13px;color:#1a1e16">${escapeHtml(line.name)} <span style="color:#8d9488">× ${line.quantity}</span></td>
    <td align="right" style="padding:9px 0;border-bottom:1px solid #eee9db;font-size:13px;color:#1a1e16">${new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(line.quantity * line.unitPrice)}</td>
  </tr>`).join("");
  const html = renderMinervaEmail({
    eyebrow: `Devis · ${input.restaurantName}`,
    title: "Votre devis est prêt",
    bodyHtml: `
      <p style="margin:0 0 18px">Bonjour ${escapeHtml(input.guestName)}, <strong>${escapeHtml(input.restaurantName)}</strong> a préparé votre proposition pour le ${escapeHtml(event)}.</p>
      <div style="margin:22px 0;padding:18px;border:1px solid #e6e0d0;border-radius:14px;background:#fbf9f3">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${lineRows}</tbody></table>
        <p style="margin:14px 0 7px;font-size:12px">Sous-total <strong style="float:right;color:#1a1e16">${subtotal}</strong></p>
        <p style="margin:0 0 7px;font-size:12px">Taxes <strong style="float:right;color:#1a1e16">${taxAmount}</strong></p>
        <p style="margin:0 0 12px;font-size:13px">Total du devis <strong style="float:right;color:#1a1e16">${total}</strong></p>
        <p style="margin:0;font-size:13px">Acompte à régler <strong style="float:right;color:#0e5a40">${amount}</strong></p>
      </div>
      <p style="font-size:12px;color:#8d9488">Le lien de paiement expire le ${escapeHtml(expiry)}. Le solde, s’il y a lieu, sera à régler selon les modalités convenues avec le restaurant.</p>`,
    ctaLabel: "Consulter et régler le devis",
    ctaUrl: checkoutUrl.toString(),
    footer: "Ce message concerne un devis préparé par le restaurant.",
  });
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.to,
    replyTo: REPLY_TO,
    subject: `Votre devis est prêt — ${input.restaurantName}`,
    html,
  });
  if (error) console.error("sendServiceQuotePaymentEmail failed:", error.message);
  return { ok: !error };
}
