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
