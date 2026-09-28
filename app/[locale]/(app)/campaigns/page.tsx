import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId, getCurrentMembership } from "@/lib/data/current-restaurant";
import { getCampaigns } from "@/lib/data/campaigns";
import { getOpenPaidAdsRequest } from "@/lib/data/paid-ads-requests";
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
  const [restaurantId, membership] = await Promise.all([getCurrentRestaurantId(), getCurrentMembership()]);
  const [campaigns, openPaidAdsRequest] = await Promise.all([
    restaurantId ? getCampaigns(restaurantId) : Promise.resolve([]),
    restaurantId ? getOpenPaidAdsRequest(restaurantId) : Promise.resolve(null),
  ]);
  const { id, channel } = await searchParams;
  const canManage = membership?.restaurantId === restaurantId && ["owner", "manager"].includes(membership.role);

  return (
    <CampaignsView
      restaurantId={restaurantId}
      campaigns={campaigns}
      initialSelectedId={id}
      initialChannel={channel}
      canManagePaidAds={canManage}
      openPaidAdsRequest={openPaidAdsRequest}
    />
  );
}
