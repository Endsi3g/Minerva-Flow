"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createCampaign,
  updateCampaign,
  saveCampaignAsset,
  getCampaignAssets,
  type CampaignInput,
  type SaveCampaignAssetInput,
} from "@/lib/data/campaigns";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { publishToInstagram, getInstagramConnectionStatus } from "@/lib/meta/instagram";
import type { Campaign, CampaignAsset } from "@/lib/types";

/**
 * Creates a campaign for the given restaurant. Authorization is enforced
 * by the campaigns RLS policies (owner/manager/consultant can write) —
 * this action only guards against obviously malformed input.
 */
export async function createCampaignAction(
  restaurantId: string,
  input: CampaignInput
): Promise<Campaign | null> {
  if (!restaurantId || !input.name.trim() || !input.startDate) {
    return null;
  }

  const campaign = await createCampaign(restaurantId, input);
  if (campaign) revalidatePath("/campaigns");
  return campaign;
}

/**
 * Attaches an already-uploaded storage object (image or file) to a
 * campaign. The upload itself happens client-side straight to Supabase
 * Storage (see CampaignAssets.tsx) — this only records the metadata row.
 */
export async function saveCampaignAssetAction(
  input: SaveCampaignAssetInput
): Promise<CampaignAsset | null> {
  if (!input.campaignId || !input.restaurantId || !input.storagePath) return null;
  const asset = await saveCampaignAsset(input);
  if (asset) revalidatePath("/campaigns");
  return asset;
}

/** Marks a campaign as started ("active") or ended ("terminee"), notifying the team. */
export async function updateCampaignStatusAction(
  restaurantId: string,
  campaignId: string,
  status: "active" | "terminee"
): Promise<Campaign | null> {
  if (!restaurantId || !campaignId) return null;
  const campaign = await updateCampaign(restaurantId, campaignId, { status });
  if (campaign) revalidatePath("/campaigns");
  return campaign;
}

export async function getInstagramConnectionStatusAction(
  restaurantId: string
): Promise<{ connected: boolean; instagramBusinessAccountId: string | null }> {
  if (!restaurantId) return { connected: false, instagramBusinessAccountId: null };
  return getInstagramConnectionStatus(restaurantId);
}

/**
 * Takes the Marketing Studio's client-rendered PNG (a data: URL from
 * html-to-image) and actually publishes it to the connected Instagram
 * professional account: uploads to the public marketing-exports bucket
 * (Instagram's API fetches image_url itself, it won't accept a direct
 * upload) then runs the real two-step Graph API publish flow.
 */
export async function publishToInstagramAction(
  restaurantId: string,
  imageDataUrl: string,
  caption: string
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return { ok: false, error: "Non autorisé." };
  }

  const match = imageDataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return { ok: false, error: "Format d'image invalide." };
  const bytes = Buffer.from(match[1], "base64");

  const admin = createAdminClient();
  const path = `${restaurantId}/${Date.now()}.png`;
  const { error: uploadError } = await admin.storage
    .from("marketing-exports")
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (uploadError) return { ok: false, error: "Échec du téléversement de l'image." };

  const { data: publicUrlData } = admin.storage.from("marketing-exports").getPublicUrl(path);

  const result = await publishToInstagram(restaurantId, publicUrlData.publicUrl, caption);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

/** Fetches a campaign's attached images/files with short-lived signed URLs for display. */
export async function getCampaignAssetsAction(
  campaignId: string
): Promise<(CampaignAsset & { url: string | null })[]> {
  if (!campaignId) return [];
  const assets = await getCampaignAssets(campaignId);
  const supabase = await createClient();
  return Promise.all(
    assets.map(async (a) => {
      const { data } = await supabase.storage.from("campaign-assets").createSignedUrl(a.storagePath, 3600);
      return { ...a, url: data?.signedUrl ?? null };
    })
  );
}

export type ReferralStoryContext = {
  hasProgram: boolean;
  programName: string;
  referralCode: string | null;
  referralUrl: string;
  rewardText: string;
  topAmbassadorName?: string;
};

export async function getReferralStoryContextAction(restaurantId: string): Promise<ReferralStoryContext> {
  const { getReferralPrograms } = await import("@/lib/data/referral-programs");
  const { getReferralLinksForRestaurant } = await import("@/lib/data/customer-referrals");
  const { activateOnboardingReferralProgramAction } = await import("@/app/[locale]/onboarding/actions");

  const programs = await getReferralPrograms(restaurantId);
  const activeProg = programs.find((p) => p.active) ?? programs[0];

  if (!activeProg) {
    const activated = await activateOnboardingReferralProgramAction(restaurantId);
    return {
      hasProgram: Boolean(activated.ok),
      programName: activated.programName ?? "Programme de Parrainage",
      referralCode: activated.code ?? "VIP10",
      referralUrl: activated.url ?? "/p/VIP10",
      rewardText: "10 $ offerts",
    };
  }

  const links = await getReferralLinksForRestaurant(restaurantId);
  const bestLink = links[0];

  if (!bestLink) {
    const activated = await activateOnboardingReferralProgramAction(restaurantId);
    return {
      hasProgram: true,
      programName: activeProg.name,
      referralCode: activated.code ?? "VIP10",
      referralUrl: activated.url ?? "/p/VIP10",
      rewardText: activeProg.rewardDescription ?? "10 $ de réduction",
    };
  }

  return {
    hasProgram: true,
    programName: activeProg.name,
    referralCode: bestLink.link.code,
    referralUrl: `/p/${bestLink.link.code}`,
    rewardText: activeProg.rewardDescription ?? "10 $ de réduction",
    topAmbassadorName: bestLink.customerName !== "—" ? bestLink.customerName : undefined,
  };
}

export type PrioritizedCampaignSettings = {
  campaignWelcomeEnabled: boolean;
  campaignSecondVisitEnabled: boolean;
  campaignReactivation21dEnabled: boolean;
  campaignRewardAvailableEnabled: boolean;
  campaignVipUpgradeEnabled: boolean;
  campaignReferralShareEnabled: boolean;
  campaignWinback60dEnabled: boolean;
  consentStats: {
    totalCustomers: number;
    marketingOptInCount: number;
    serviceOnlyCount: number;
  };
};

export async function getPrioritizedCampaignSettingsAction(
  restaurantId: string
): Promise<PrioritizedCampaignSettings> {
  const supabase = await createClient();
  const { data: rest } = await supabase
    .from("restaurants")
    .select(
      "campaign_welcome_enabled, campaign_second_visit_enabled, campaign_reactivation_21d_enabled, campaign_reward_available_enabled, campaign_vip_upgrade_enabled, campaign_referral_share_enabled, campaign_winback_60d_enabled"
    )
    .eq("id", restaurantId)
    .maybeSingle();

  const { getRestaurantConsentStats } = await import("@/lib/data/consent");
  const consentStats = await getRestaurantConsentStats(restaurantId);

  const r = (rest ?? {}) as Record<string, unknown>;

  return {
    campaignWelcomeEnabled: (r.campaign_welcome_enabled as boolean | undefined) ?? true,
    campaignSecondVisitEnabled: (r.campaign_second_visit_enabled as boolean | undefined) ?? true,
    campaignReactivation21dEnabled: (r.campaign_reactivation_21d_enabled as boolean | undefined) ?? true,
    campaignRewardAvailableEnabled: (r.campaign_reward_available_enabled as boolean | undefined) ?? true,
    campaignVipUpgradeEnabled: (r.campaign_vip_upgrade_enabled as boolean | undefined) ?? true,
    campaignReferralShareEnabled: (r.campaign_referral_share_enabled as boolean | undefined) ?? true,
    campaignWinback60dEnabled: (r.campaign_winback_60d_enabled as boolean | undefined) ?? true,
    consentStats,
  };
}

export type CampaignTriggerKey =
  | "welcome"
  | "second_visit"
  | "reactivation_21d"
  | "reward_available"
  | "vip_upgrade"
  | "referral_share"
  | "winback_60d";

export async function updateCampaignTriggerSettingAction(
  restaurantId: string,
  key: CampaignTriggerKey,
  enabled: boolean
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const colMap: Record<CampaignTriggerKey, string> = {
    welcome: "campaign_welcome_enabled",
    second_visit: "campaign_second_visit_enabled",
    reactivation_21d: "campaign_reactivation_21d_enabled",
    reward_available: "campaign_reward_available_enabled",
    vip_upgrade: "campaign_vip_upgrade_enabled",
    referral_share: "campaign_referral_share_enabled",
    winback_60d: "campaign_winback_60d_enabled",
  };
  const { error } = await supabase
    .from("restaurants")
    .update({ [colMap[key]]: enabled })
    .eq("id", restaurantId);

  if (!error) revalidatePath("/campaigns");
  return { ok: !error };
}

export async function dispatchOffPeakBroadcastAction(
  restaurantId: string,
  timeSlot: string,
  customOffer: string
): Promise<{ ok: boolean; sentCount: number; totalConsented: number; message?: string }> {
  return dispatchBroadcastCampaignAction(restaurantId, "off_peak", { timeSlot, offerText: customOffer });
}

export async function dispatchBroadcastCampaignAction(
  restaurantId: string,
  templateId: "off_peak" | "referral_share" | "winback_60d",
  customOptions?: { timeSlot?: string; offerText?: string }
): Promise<{ ok: boolean; sentCount: number; totalConsented: number; message?: string }> {
  const admin = createAdminClient();
  // CASL Strict Check: only customers with marketing_consent = true can be targeted
  const { data: customers } = await admin
    .from("customers")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .eq("marketing_consent", true);

  const list = (customers ?? []) as { id: string; name: string }[];
  if (list.length === 0) {
    return {
      ok: true,
      sentCount: 0,
      totalConsented: 0,
      message: "Aucun client n'a donné son consentement marketing (LCAP/CASL).",
    };
  }

  const { dispatchCampaignToCustomer } = await import("@/lib/campaigns/templates");

  let sent = 0;
  for (const c of list) {
    const res = await dispatchCampaignToCustomer({
      restaurantId,
      customerId: c.id,
      templateId,
      timeSlot: customOptions?.timeSlot,
      offerText: customOptions?.offerText,
    });
    if (res.success) sent++;
  }

  revalidatePath("/campaigns");
  return { ok: true, sentCount: sent, totalConsented: list.length };
}


