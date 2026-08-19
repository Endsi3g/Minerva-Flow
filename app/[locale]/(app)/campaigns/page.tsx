import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCampaigns } from "@/lib/data/campaigns";
import { CampaignsView } from "./CampaignsView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("campaigns") };
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; channel?: string }>;
}) {
  const restaurantId = await getCurrentRestaurantId();
  const campaigns = restaurantId ? await getCampaigns(restaurantId) : [];
  const { id, channel } = await searchParams;

  return (
    <CampaignsView
      restaurantId={restaurantId}
      campaigns={campaigns}
      initialSelectedId={id}
      initialChannel={channel}
    />
  );
}
