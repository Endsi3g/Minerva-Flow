import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaidAdsBudgetRange, PaidAdsVolumeEstimate, PaidAdsTimeframe } from "@/lib/data/paid-ads-requests";
import { ReviewQueue, type PaidAdsReviewItem } from "./ReviewQueue";

export default async function PaidAdsRequestsAdminPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("paid_ads_requests")
    .select("id, contact_name, contact_email, contact_phone, monthly_budget_range, weekly_volume_estimate, has_run_paid_ads_before, desired_start_timeframe, priority_score, goals, status, created_at, restaurants!inner(name)")
    .neq("status", "ferme")
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100);
  const raw = (data ?? []) as unknown as {
    id: string; contact_name: string; contact_email: string; contact_phone: string | null;
    monthly_budget_range: PaidAdsBudgetRange; weekly_volume_estimate: PaidAdsVolumeEstimate;
    has_run_paid_ads_before: boolean; desired_start_timeframe: PaidAdsTimeframe;
    priority_score: number; goals: string; status: string; created_at: string;
    restaurants: { name: string };
  }[];
  const items: PaidAdsReviewItem[] = raw
    .map((row) => ({
      id: row.id,
      restaurant: row.restaurants.name,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      monthlyBudgetRange: row.monthly_budget_range,
      weeklyVolumeEstimate: row.weekly_volume_estimate,
      hasRunPaidAdsBefore: row.has_run_paid_ads_before,
      desiredStartTimeframe: row.desired_start_timeframe,
      goals: row.goals,
      status: row.status as PaidAdsReviewItem["status"],
      createdAt: row.created_at,
      priorityScore: row.priority_score,
    }))
    // The database sorts before the 100-row limit, keeping high-priority
    // requests visible even when the queue grows beyond the first page.
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Croissance · Campagnes"
        title="Demandes de campagnes publicitaires"
        description="Triées par priorité (budget, volume hebdomadaire, urgence de démarrage) — les demandes les plus prometteuses ou les plus pressées en premier. Les frais de gestion sont à déterminer avec chaque restaurant."
      />
      <ReviewQueue items={items} />
    </div>
  );
}
