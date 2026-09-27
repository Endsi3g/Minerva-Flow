import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewQueue, type PaidAdsReviewItem } from "./ReviewQueue";

export default async function PaidAdsRequestsAdminPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("paid_ads_requests")
    .select("id, contact_name, contact_email, contact_phone, monthly_budget_range, goals, status, created_at, restaurants!inner(name)")
    .neq("status", "ferme")
    .order("created_at", { ascending: true })
    .limit(100);
  const raw = (data ?? []) as unknown as {
    id: string; contact_name: string; contact_email: string; contact_phone: string | null;
    monthly_budget_range: string; goals: string; status: string; created_at: string;
    restaurants: { name: string };
  }[];
  const items: PaidAdsReviewItem[] = raw.map((row) => ({
    id: row.id,
    restaurant: row.restaurants.name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    monthlyBudgetRange: row.monthly_budget_range,
    goals: row.goals,
    status: row.status as PaidAdsReviewItem["status"],
    createdAt: row.created_at,
  }));
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Croissance · Campagnes"
        title="Demandes de campagnes publicitaires"
        description="Restaurateurs qui veulent que l’équipe Minerva Flow gère leurs campagnes payantes (Meta, Google). Les frais sont à déterminer avec chacun."
      />
      <ReviewQueue items={items} />
    </div>
  );
}
