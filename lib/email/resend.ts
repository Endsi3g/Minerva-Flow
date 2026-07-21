import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared sandbox sender — works immediately with no domain
// verification, good enough to start sending. Swap RESEND_FROM_EMAIL once a
// verified sending domain is set up.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Flow par Minerva <onboarding@resend.dev>";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minerva-flow.vercel.app";

function emailShell(bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="font-size: 15px; font-weight: 600; color: #1a2e22; margin: 0 0 24px;">Flow <span style="color: #2f6f4f;">par Minerva</span></p>
      ${bodyHtml}
      <a href="${ctaUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #1a4d33; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">${ctaLabel}</a>
      <p style="margin-top: 24px; font-size: 12px; color: #8a8578;">Ce lien expire dans 7 jours. Si vous n'êtes pas à l'origine de cette invitation, ignorez ce courriel.</p>
    </div>
  `;
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
    subject: `Invitation à rejoindre ${workspaceName} sur Flow par Minerva`,
    html: emailShell(
      `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">Vous avez été invité·e à rejoindre <strong>${workspaceName}</strong> en tant que <strong>${role}</strong> sur Flow par Minerva.</p>`,
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
