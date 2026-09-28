import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewQueue, type UgcReviewItem } from "./ReviewQueue";

export default async function AmbassadorUgcAdminPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("flow_ugc_submissions")
    .select("id, platform, post_url, caption, created_at, ambassador_id, flow_ugc_restaurant_profiles!inner(display_name), flow_ambassadors!inner(user_id)")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(100);
  const raw = (data ?? []) as unknown as { id: string; platform: string; post_url: string; caption: string; created_at: string; flow_ugc_restaurant_profiles: { display_name: string }; flow_ambassadors: { user_id: string } }[];
  const ambassadorIds = [...new Set(raw.map((row) => row.flow_ambassadors.user_id))];
  const users = await Promise.all(ambassadorIds.map(async (userId) => {
    const { data } = await admin.auth.admin.getUserById(userId);
    return [userId, data.user?.email ?? null] as const;
  }));
  const emailById = new Map(users);
  const items: UgcReviewItem[] = raw.map((row) => ({
    id: row.id, platform: row.platform, postUrl: row.post_url, caption: row.caption, createdAt: row.created_at,
    restaurant: row.flow_ugc_restaurant_profiles.display_name,
    ambassadorEmail: emailById.get(row.flow_ambassadors.user_id) ?? null,
  }));
  return <div className="space-y-5"><PageHeader eyebrow="Modération · Communauté" title="Contenus ambassadeurs" description="Vérifiez l’authenticité, la divulgation de la commission, le consentement du restaurant et le lien public avant toute réutilisation." /><ReviewQueue items={items} /></div>;
}
