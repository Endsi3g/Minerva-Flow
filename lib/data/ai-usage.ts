import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_AI_QUOTAS, PLAN_NAMES, type PlanTier, calculateQuotaUsage } from "@/lib/ai/quotas";
import { sendBillingLifecycleEmail, getWorkspaceOwnerContact } from "@/lib/email/billing-lifecycle";

export { PLAN_AI_QUOTAS, PLAN_NAMES, type PlanTier, calculateQuotaUsage };

export type WorkspaceAiUsage = {
  workspaceId: string;
  planTier: PlanTier;
  monthlyQuota: number;
  tokensUsed: number;
  periodStart: string;
  periodEnd: string;
  percentUsed: number;
  isExceeded: boolean;
};

export async function getWorkspaceAiUsage(workspaceId: string): Promise<WorkspaceAiUsage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_ai_usage")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const defaultTier: PlanTier = "starter";
  const defaultQuota = PLAN_AI_QUOTAS[defaultTier];

  if (error || !data) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    return {
      workspaceId,
      planTier: defaultTier,
      monthlyQuota: defaultQuota,
      tokensUsed: 0,
      periodStart: start,
      periodEnd: end,
      percentUsed: 0,
      isExceeded: false,
    };
  }

  const tokensUsed = data.tokens_used_current_period ?? 0;
  const monthlyQuota = data.monthly_token_quota ?? defaultQuota;
  const percentUsed = Math.min(100, Math.round((tokensUsed / Math.max(1, monthlyQuota)) * 100));

  return {
    workspaceId: data.workspace_id,
    planTier: (data.plan_tier as PlanTier) ?? defaultTier,
    monthlyQuota,
    tokensUsed,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    percentUsed,
    isExceeded: tokensUsed >= monthlyQuota,
  };
}

/**
 * Enregistre les tokens consommés après un appel IA (via admin client pour fiabilité)
 */
export async function trackAiTokenUsage(
  workspaceId: string,
  tokensUsed: number,
  planTier: PlanTier = "starter"
): Promise<{ tokensUsed: number; monthlyQuota: number; isQuotaExceeded: boolean } | null> {
  if (tokensUsed <= 0) return null;

  try {
    const admin = createAdminClient();
    const quota = PLAN_AI_QUOTAS[planTier] || PLAN_AI_QUOTAS.starter;

    const { data, error } = await admin.rpc("record_workspace_ai_tokens", {
      p_workspace_id: workspaceId,
      p_tokens: tokensUsed,
      p_default_quota: quota,
      p_plan_tier: planTier,
    });

    if (error || !data || data.length === 0) {
      // Fallback direct upsert si la fonction RPC n'est pas encore appliquée
      const { data: existing } = await admin
        .from("workspace_ai_usage")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      const currentUsed = (existing?.tokens_used_current_period ?? 0) + tokensUsed;
      const currentQuota = existing?.monthly_token_quota ?? quota;

      await admin.from("workspace_ai_usage").upsert(
        {
          workspace_id: workspaceId,
          plan_tier: planTier,
          monthly_token_quota: currentQuota,
          tokens_used_current_period: currentUsed,
          total_lifetime_tokens: (existing?.total_lifetime_tokens ?? 0) + tokensUsed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );

      return {
        tokensUsed: currentUsed,
        monthlyQuota: currentQuota,
        isQuotaExceeded: currentUsed >= currentQuota,
      };
    }

    const row = data[0];
    if (row.is_quota_exceeded) {
      await notifyQuotaExceededOnce(workspaceId, planTier);
    }
    return {
      tokensUsed: row.tokens_used,
      monthlyQuota: row.monthly_quota,
      isQuotaExceeded: row.is_quota_exceeded,
    };
  } catch (err) {
    console.error("[trackAiTokenUsage Exception]", err);
    return null;
  }
}

/**
 * Fires the "quota Flow AI atteint" email the first time a workspace crosses
 * 100% in a given billing period — deduped by period_start via
 * workspace_billing_emails, so it can't re-fire on every subsequent AI call
 * within the same still-exceeded period.
 */
async function notifyQuotaExceededOnce(workspaceId: string, planTier: PlanTier): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: usageRow } = await admin
      .from("workspace_ai_usage")
      .select("period_start")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!usageRow?.period_start) return;

    const owner = await getWorkspaceOwnerContact(workspaceId);
    if (!owner) return;

    await sendBillingLifecycleEmail({
      workspaceId,
      email: owner.email,
      step: "quota_exceeded",
      dedupeKey: `period:${usageRow.period_start}`,
      params: { firstName: owner.firstName, planName: PLAN_NAMES[planTier] },
    });
  } catch (err) {
    console.error("[notifyQuotaExceededOnce]", err);
  }
}

/**
 * Updates a workspace's plan tier + monthly token quota to match its Stripe
 * subscription — called from the checkout/webhook flow, never from the
 * token-tracking path above. PostgREST upsert only writes the columns
 * given here, so tokens_used_current_period/period bounds are left alone.
 */
export async function setWorkspacePlanTier(workspaceId: string, planTier: PlanTier): Promise<void> {
  const admin = createAdminClient();
  await admin.from("workspace_ai_usage").upsert(
    {
      workspace_id: workspaceId,
      plan_tier: planTier,
      monthly_token_quota: PLAN_AI_QUOTAS[planTier],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );
}
