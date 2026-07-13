"use server";

import { revalidatePath } from "next/cache";
import { createCampaign, type CampaignInput } from "@/lib/data/campaigns";
import type { Campaign } from "@/lib/types";

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
