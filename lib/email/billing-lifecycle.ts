import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  renderBillingLifecycleEmail,
  type BillingLifecycleStep,
  type BillingLifecycleParams,
} from "@/lib/email/lifecycle-templates";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Minerva Flow <flow@minervaflow.app>";
const REPLY_TO = process.env.RESEND_REPLY_TO ?? "support@minervaflow.app";
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";

/**
 * Sends one billing lifecycle email, deduped per (workspace, step, dedupeKey)
 * via workspace_billing_emails (0065 migration) — unlike user_lifecycle_emails
 * this key includes an episode discriminator, so e.g. two distinct past_due
 * episodes for the same workspace each still get exactly one reminder.
 */
export async function sendBillingLifecycleEmail(input: {
  workspaceId: string;
  email: string;
  step: BillingLifecycleStep;
  dedupeKey: string;
  params?: Partial<BillingLifecycleParams>;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!resend) return { ok: false, error: "RESEND_API_KEY non configurée" };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("workspace_billing_emails")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("step", input.step)
    .eq("dedupe_key", input.dedupeKey)
    .maybeSingle();

  if (existing) return { ok: true, skipped: true };

  const templateParams: BillingLifecycleParams = {
    appUrl: APP_ORIGIN,
    firstName: input.params?.firstName ?? null,
    restaurantName: input.params?.restaurantName ?? null,
    planName: input.params?.planName,
    trialEndDate: input.params?.trialEndDate,
    amountDue: input.params?.amountDue,
  };

  const rendered = renderBillingLifecycleEmail(input.step, templateParams);

  const { data: sendResult, error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.email,
    replyTo: REPLY_TO,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (sendError) {
    console.error(`[BillingLifecycle] Erreur envoi étape '${input.step}' à ${input.email}:`, sendError);
    return { ok: false, error: sendError.message };
  }

  await admin.from("workspace_billing_emails").insert({
    workspace_id: input.workspaceId,
    step: input.step,
    dedupe_key: input.dedupeKey,
    metadata: { resend_id: sendResult?.id, sent_at: new Date().toISOString() },
  });

  return { ok: true };
}

export type WorkspaceOwnerContact = { userId: string; email: string; firstName: string | null } | null;

export async function getWorkspaceOwnerContact(workspaceId: string): Promise<WorkspaceOwnerContact> {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!member) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", member.user_id)
    .maybeSingle();
  if (!profile?.email) return null;

  return {
    userId: member.user_id,
    email: profile.email,
    firstName: profile.full_name?.split(" ")[0] ?? null,
  };
}

/**
 * Daily cron (see app/api/cron/billing-lifecycle-engine): evaluates every
 * subscription in a `past_due` or scheduled-cancellation state and fires the
 * time-based follow-ups event-driven webhook handlers can't own — the J+3
 * dunning reminder (past_due_since) and the J+21 win-back email
 * (canceled_at). Event-driven billing emails (trial ending, payment failed,
 * quota exceeded) are sent directly from the Stripe webhook / usage tracker
 * instead, since those fire the instant the triggering event happens.
 */
export async function processBillingLifecycleEngine(): Promise<{
  pastDueReminders: number;
  winbacks: number;
  errors: number;
}> {
  const admin = createAdminClient();
  const now = Date.now();
  let pastDueReminders = 0;
  let winbacks = 0;
  let errors = 0;

  const { data: pastDueSubs } = await admin
    .from("subscriptions")
    .select("workspace_id, past_due_since")
    .eq("status", "past_due")
    .not("past_due_since", "is", null);

  for (const sub of (pastDueSubs ?? []) as { workspace_id: string | null; past_due_since: string }[]) {
    if (!sub.workspace_id) continue;
    const daysSince = Math.floor((now - new Date(sub.past_due_since).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 3) continue;

    const owner = await getWorkspaceOwnerContact(sub.workspace_id);
    if (!owner) continue;

    const res = await sendBillingLifecycleEmail({
      workspaceId: sub.workspace_id,
      email: owner.email,
      step: "payment_reminder",
      dedupeKey: `past_due:${sub.past_due_since}`,
      params: { firstName: owner.firstName },
    });
    if (res.ok && !res.skipped) pastDueReminders++;
    if (!res.ok) errors++;
  }

  const { data: canceledSubs } = await admin
    .from("subscriptions")
    .select("workspace_id, canceled_at")
    .eq("status", "canceled")
    .not("canceled_at", "is", null);

  for (const sub of (canceledSubs ?? []) as { workspace_id: string | null; canceled_at: string }[]) {
    if (!sub.workspace_id) continue;
    const daysSince = Math.floor((now - new Date(sub.canceled_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 21) continue;

    const owner = await getWorkspaceOwnerContact(sub.workspace_id);
    if (!owner) continue;

    const res = await sendBillingLifecycleEmail({
      workspaceId: sub.workspace_id,
      email: owner.email,
      step: "winback",
      dedupeKey: `canceled:${sub.canceled_at}`,
      params: { firstName: owner.firstName },
    });
    if (res.ok && !res.skipped) winbacks++;
    if (!res.ok) errors++;
  }

  return { pastDueReminders, winbacks, errors };
}
