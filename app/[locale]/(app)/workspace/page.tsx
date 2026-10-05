import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getWorkspaceHubDataAction } from "./actions";
import { WorkspaceView } from "./WorkspaceView";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers } from "@/lib/data/customers";
import { getAdConversions } from "@/lib/data/ad-platforms";
import { getReferralInvitationActivity } from "@/lib/data/customer-referrals";
import { getCustomerOriginByCity } from "@/lib/customer-origin";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("workspace") };
}

export default async function WorkspacePage() {
  const [data, restaurantId] = await Promise.all([
    getWorkspaceHubDataAction(),
    getCurrentRestaurantId(),
  ]);
  const [customers, adConversions, referralActivity] = data?.canManage && restaurantId
    ? await Promise.all([
        getCustomers(restaurantId),
        getAdConversions(restaurantId),
        getReferralInvitationActivity(restaurantId),
      ])
    : [[], [], []];

  const sourceCounts = new Map<string, number>();
  for (const conversion of adConversions) {
    const key = `ad:${conversion.channel}`;
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  for (const referral of referralActivity) {
    const key = `referral:${referral.channel}`;
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  if (data?.canManage && restaurantId) {
    const supabase = await createClient();
    const { data: registrations } = await supabase.rpc("get_registration_source_counts", {
      p_restaurant_id: restaurantId,
    });
    for (const registration of registrations ?? []) {
      const key = `signup:${registration.source}`;
      sourceCounts.set(key, Number(registration.registration_count) || 0);
    }
  }

  const originCities = getCustomerOriginByCity(customers);
  const originProfileCount = customers.filter((customer) => customer.city?.trim()).length;

  return (
    <WorkspaceView
      data={data}
      originCities={originCities}
      originProfileCount={originProfileCount}
      acquisitionSources={[...sourceCounts].map(([channel, count]) => ({ channel, count }))}
    />
  );
}
