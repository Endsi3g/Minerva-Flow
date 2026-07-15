"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCampaign,
  updateCampaign,
  saveCampaignAsset,
  getCampaignAssets,
  type CampaignInput,
  type SaveCampaignAssetInput,
} from "@/lib/data/campaigns";
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
