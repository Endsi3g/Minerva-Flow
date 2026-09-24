import "server-only";
import { Resend } from "resend";
import { getActiveUserContacts } from "@/lib/data/users";
import { renderMinervaEmail } from "@/lib/email/brand-shell";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Minerva Flow <flow@minervaflow.app>";
const REPLY_TO = process.env.RESEND_REPLY_TO ?? "support@minervaflow.app";

export { sendLifecycleEmail, processLifecycleEngine } from "./lifecycle";
export {
  renderLifecycleEmail,
  renderLoyaltyRetentionEmail,
  renderWeeklyReportEmail,
  renderSpecialOfferEmail,
} from "./lifecycle-templates";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";

function emailShell(bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return renderMinervaEmail({ bodyHtml, ctaLabel, ctaUrl });
}

const AUTH_ACTION_COPY: Record<string, { subject: string; body: string; cta: string }> = {
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
    ? emailShell(body, copy.cta, verifyUrl)
    : emailShell(body, copy.cta, APP_ORIGIN);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: copy.subject,
    html,
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
      `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">Vous avez été invité·e à rejoindre <strong>${workspaceName}</strong> en tant que <strong>${role}</strong> sur Minerva Flow.</p>`,
      "Accepter l'invitation",
      inviteUrl
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
      `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${restaurantName} vous invite à créer votre compte pour accéder à votre espace personnel — vos tâches et votre horaire.</p>`,
      "Créer mon compte",
      inviteUrl
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
    html: emailShell(bodyHtml, "Voir et répondre", `${APP_ORIGIN}/reputation`),
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
}: {
  to: string;
  subject: string;
  bodyHtml: string;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: emailShell(bodyHtml, "Voir mes points", `${APP_ORIGIN}/portal`),
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
}: {
  to: string;
  subject: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: emailShell(bodyHtml, ctaLabel, ctaUrl),
  });
  return { ok: !error };
}

type CampaignCategory = "fonctionnalite" | "amelioration" | "correctif";

const CAMPAIGN_CATEGORY_LABEL: Record<CampaignCategory, string> = {
  fonctionnalite: "Nouvelle fonctionnalité",
  amelioration: "Amélioration",
  correctif: "Correctif",
};

// Mirrors the badge tones ChangelogAdminView uses on-screen (categoryTone),
// resolved to the underlying --mv-* hex values since email clients can't
// read CSS custom properties.
const CAMPAIGN_CATEGORY_COLOR: Record<CampaignCategory, { bg: string; fg: string }> = {
  fonctionnalite: { bg: "#dcece3", fg: "#0e5a40" },
  amelioration: { bg: "#f6efd9", fg: "#ab7d1f" },
  correctif: { bg: "#eee9db", fg: "#565f52" },
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
        body: `Votre recommandation a généré une commission de <strong>${escapeHtml(commission)}</strong> (10 % de la première facture payée). Elle devient payable après le délai de 30 jours, à partir du <strong>${escapeHtml(payableDate)}</strong>.`,
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
    footer: "Minerva Flow · Minerva Technologies Inc.<br />Vous recevez ce courriel au sujet de votre compte ambassadeur.",
  });
  const { error } = await resend.emails.send({ from: FROM_EMAIL, to: input.to, subject: copy.subject, html });
  return !error;
}

/**
 * Table-based layout (not flex/grid) and every style inlined — Outlook and
 * most webmail clients strip <style> blocks and ignore modern CSS, so this
 * is the only layout approach that renders consistently across clients.
 * Distinct from the narrower emailShell() used by transactional invite
 * emails: this is the wider marketing-style template for the changelog
 * broadcast specifically, matching what recipients expect from a product
 * update email rather than a one-line transactional notice.
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
  const badge = CAMPAIGN_CATEGORY_COLOR[category];
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f5f1e6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${safeDescription.slice(0, 150)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1e6;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
            <tr>
              <td style="padding:0 8px 24px;">
                <img src="https://minervaflow.app/icon-192.png" width="36" height="36" alt="Minerva Flow" border="0" style="display:inline-block;width:36px;height:36px;margin-right:10px;vertical-align:middle;border:0;border-radius:11px;" />
                <span style="font-family:'New York', Georgia, serif; font-size:20px; font-weight:700; color:#1a1e16; letter-spacing:-0.02em;">Minerva <span style="color:#167f5b;">Flow</span></span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#fbf9f3; border:1px solid #e6e0d0; border-radius:16px; padding:40px 40px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color:${badge.bg}; color:${badge.fg}; font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:5px 12px; border-radius:999px;">
                      ${CAMPAIGN_CATEGORY_LABEL[category]}
                    </td>
                  </tr>
                </table>
                <h1 style="margin:20px 0 12px; font-size:24px; line-height:1.3; font-weight:700; color:#1a1e16;">${safeTitle}</h1>
                <p style="margin:0 0 28px; font-size:15px; line-height:1.65; color:#565f52; white-space:pre-line;">${safeDescription}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color:#167f5b; border-radius:10px;">
                      <a href="${ctaUrl}" style="display:inline-block; padding:13px 26px; font-size:14px; font-weight:600; color:#fbf9f3; text-decoration:none;">Voir le journal des mises à jour →</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 8px 0;">
                <p style="margin:0 0 6px; font-size:12px; line-height:1.6; color:#8d9488;">
                  Vous recevez ce courriel parce que vous avez un compte actif sur Minerva Flow.
                </p>
                <p style="margin:0; font-size:12px; line-height:1.6; color:#8d9488;">
                  <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#8d9488; text-decoration:underline;">Se désabonner des annonces</a> · Minerva Flow
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

const UPDATES_SEGMENT_NAME = "Mises à jour — Minerva Flow";

/**
 * Resend Segments (formerly "Audiences") hold the contact list a Broadcast
 * sends to. Looked up by name rather than cached by id since this only runs
 * on a changelog publish (a few times a month at most) — the extra list
 * call is negligible and avoids a stale-id env var to maintain.
 */
async function getOrCreateUpdatesSegment(): Promise<string | null> {
  if (!resend) return null;

  const { data: existing } = await resend.segments.list();
  const found = existing?.data.find((s) => s.name === UPDATES_SEGMENT_NAME);
  if (found) return found.id;

  const { data: created, error } = await resend.segments.create({ name: UPDATES_SEGMENT_NAME });
  if (error || !created) return null;
  return created.id;
}

/**
 * Best-effort upsert: Resend's create-contact call errors on an email
 * already in the segment, which we don't distinguish from a real failure
 * here — the segment membership is what matters and it's already correct
 * either way. Run in parallel since this can be a few dozen contacts.
 */
async function syncUpdatesSegmentContacts(
  segmentId: string,
  contacts: { email: string; fullName: string | null }[]
): Promise<void> {
  if (!resend) return;
  await Promise.all(
    contacts.map((c) =>
      resend!.contacts.create({
        email: c.email,
        firstName: c.fullName ?? undefined,
        segments: [{ id: segmentId }],
      })
    )
  );
}

/**
 * Sends the changelog announcement as an email campaign (Resend Broadcast)
 * to every active platform user, in addition to the in-app/push
 * notification `notifyAllUsers` already fires. Complements, doesn't
 * replace: push is the "come back now" nudge, this is the durable copy
 * that lands in an inbox even for someone who never opened the app since
 * the last update.
 *
 * Resend rejects Broadcasts entirely — even as a draft — when `from` is on
 * the shared `resend.dev` sandbox domain ("Broadcasts cannot be sent from
 * resend.dev. Please use a verified domain owned by your team."). Until
 * RESEND_FROM_EMAIL points at a verified domain, this stays a no-op that
 * still keeps the Resend contact segment in sync so the campaign is ready
 * to fire the moment a domain is verified — no code change needed then.
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

  const contacts = await getActiveUserContacts();
  if (contacts.length === 0) return { ok: false, reason: "no_recipients" };

  const segmentId = await getOrCreateUpdatesSegment();
  if (!segmentId) return { ok: false, reason: "segment_unavailable" };

  await syncUpdatesSegmentContacts(segmentId, contacts);

  const ctaUrl = `${APP_ORIGIN}${link}`;
  const { error } = await resend.broadcasts.create({
    segmentId,
    from: FROM_EMAIL,
    subject: `Nouveauté sur Minerva Flow : ${title}`,
    previewText: description.slice(0, 120),
    html: campaignEmailHtml({ title, description, category, ctaUrl }),
    text: `${CAMPAIGN_CATEGORY_LABEL[category]}\n${title}\n\n${description}\n\n${ctaUrl}`,
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
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">${bodyHtml}</div>`,
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
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">${bodyHtml}</div>`,
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
    <h2 style="margin:0 0 8px; font-family:'New York', Georgia, serif; font-size:22px; font-weight:600; color:#1a1e16;">Votre horaire — ${safeRestaurantName}</h2>
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
    html: emailShell(bodyHtml, "Consulter mon horaire en ligne", scheduleUrl),
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
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:28px;background:#f5f1e6;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1e16">
      <main style="max-width:540px;margin:0 auto;padding:36px 30px;background:#fffefa;border:1px solid #e6e0d0;border-radius:22px">
        <p style="margin:0 0 18px"><img src="https://minervaflow.app/icon-192.png" width="44" height="44" alt="Minerva Flow" border="0" style="display:block;width:44px;height:44px;border:0;border-radius:13px" /></p>
        <p style="margin:0 0 18px;color:#167f5b;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Minerva Flow · Devis</p>
        <h1 style="font-family:'New York',Georgia,serif;font-size:26px;line-height:1.2;margin:0 0 16px">Votre devis est prêt</h1>
        <p style="font-size:14px;line-height:1.7;color:#565f52">Bonjour ${escapeHtml(input.guestName)}, <strong>${escapeHtml(input.restaurantName)}</strong> a préparé votre proposition pour le ${escapeHtml(event)}.</p>
        <section style="margin:22px 0;padding:18px;border:1px solid #e6e0d0;border-radius:14px;background:#fbf9f3">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${lineRows}</tbody></table>
          <p style="margin:14px 0 7px;font-size:12px;color:#565f52">Sous-total <strong style="float:right;color:#1a1e16">${subtotal}</strong></p>
          <p style="margin:0 0 7px;font-size:12px;color:#565f52">Taxes <strong style="float:right;color:#1a1e16">${taxAmount}</strong></p>
          <p style="margin:0 0 12px;font-size:13px;color:#565f52">Total du devis <strong style="float:right;color:#1a1e16">${total}</strong></p>
          <p style="margin:0;font-size:13px;color:#565f52">Acompte à régler <strong style="float:right;color:#0e5a40">${amount}</strong></p>
        </section>
        <p style="font-size:12px;color:#8d9488">Le lien de paiement expire le ${escapeHtml(expiry)}. Le solde, s’il y a lieu, sera à régler selon les modalités convenues avec le restaurant.</p>
        <p style="margin:28px 0;text-align:center"><a href="${escapeHtml(checkoutUrl.toString())}" style="display:inline-block;padding:14px 28px;background:#167f5b;color:#fffefa;text-decoration:none;border-radius:999px;font-weight:700">Consulter et régler le devis</a></p>
        <p style="border-top:1px solid #eee9db;padding-top:18px;color:#8d9488;font-size:11px;text-align:center">Minerva Flow · Minerva Technologies Inc.</p>
      </main>
    </body></html>`;
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
