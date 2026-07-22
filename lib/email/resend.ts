import "server-only";
import { Resend } from "resend";
import { getActiveUserContacts } from "@/lib/data/users";

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

const UPDATES_SEGMENT_NAME = "Mises à jour — Flow par Minerva";

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
  link,
}: {
  title: string;
  description: string;
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
    subject: `Nouveauté sur Flow par Minerva : ${title}`,
    previewText: description.slice(0, 120),
    html: emailShell(
      `<p style="font-size: 15px; font-weight: 600; color: #1a2e22; margin: 0 0 8px;">${title}</p>
       <p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${description.replace(/\n/g, "<br/>")}</p>`,
      "Voir le journal des mises à jour",
      ctaUrl
    ),
    text: `${title}\n\n${description}\n\n${ctaUrl}`,
    send: true,
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
