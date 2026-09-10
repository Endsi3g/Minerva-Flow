"use server";

import { revalidatePath } from "next/cache";
import {
  isSquareConfigured,
  isLightspeedConfigured,
  isCloverConfigured,
  isQuickBooksConfigured,
  isToastConfigured,
} from "@/lib/pos/config";
import {
  getPosConnections,
  getRestaurantTimezoneAdmin,
  savePosConnectionTokens,
  type PosConnection,
  type PosProvider,
} from "@/lib/data/pos-connections";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { syncPosSalesForDate, backfillPosHistory } from "@/lib/pos/sync";
import { todayInTimezone } from "@/lib/pos/shared";
import { isoDaysAgo } from "@/lib/utils";
import { loginToastMachineClient } from "@/lib/pos/toast";
import { validateAndFetchCloverMerchant } from "@/lib/pos/clover";

export type PosProviderConfigured = Record<PosProvider, boolean>;

export async function getPosStatusAction(
  restaurantId: string
): Promise<{ configured: PosProviderConfigured; connections: PosConnection[] }> {
  if (!restaurantId) {
    return {
      configured: { square: false, lightspeed: false, clover: false, quickbooks: false, toast: false },
      connections: [],
    };
  }
  const connections = await getPosConnections(restaurantId);
  return {
    configured: {
      square: isSquareConfigured(),
      lightspeed: isLightspeedConfigured(),
      clover: isCloverConfigured(),
      quickbooks: isQuickBooksConfigured(),
      toast: isToastConfigured(),
    },
    connections,
  };
}

/**
 * Connects a restaurant to Toast POS directly using their Toast Restaurant GUID.
 * Authenticates against Toast Partner APIs and triggers an initial historical backfill.
 */
export async function connectToastWithGuidAction(restaurantGuid: string): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return { success: false, error: "Non autorisé" };
  }

  const cleanGuid = restaurantGuid.trim();
  if (!cleanGuid) {
    return { success: false, error: "GUID Toast manquant ou invalide" };
  }

  const machineAuth = await loginToastMachineClient();
  if (!machineAuth) {
    return { success: false, error: "Identifiants Toast Partner invalides ou serveur Toast inaccessible" };
  }

  await savePosConnectionTokens(membership.restaurantId, "toast", {
    accessToken: machineAuth.accessToken,
    expiresAt: machineAuth.expiresAt,
    externalAccountId: cleanGuid,
  });

  // Background backfill
  backfillPosHistory("toast", membership.restaurantId).catch((err) => {
    console.error("Toast history backfill failed:", err);
  });

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Connects a restaurant to Clover POS directly using a Clover Merchant ID and API Token.
 * Useful when OAuth redirect flow is hindered or in sandbox testing environments.
 */
export async function connectCloverWithTokenAction(
  merchantId: string,
  apiToken: string
): Promise<{ success: boolean; error?: string; merchantName?: string }> {
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return { success: false, error: "Non autorisé" };
  }

  const cleanMid = merchantId.trim();
  const cleanToken = apiToken.trim();
  if (!cleanMid || !cleanToken) {
    return { success: false, error: "Merchant ID et Clé API Clover requis" };
  }

  const validation = await validateAndFetchCloverMerchant(cleanMid, cleanToken);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Validation Clover échouée" };
  }

  await savePosConnectionTokens(membership.restaurantId, "clover", {
    accessToken: cleanToken,
    externalAccountId: cleanMid,
  });

  // Background backfill
  backfillPosHistory("clover", membership.restaurantId).catch((err) => {
    console.error("Clover history backfill failed:", err);
  });

  revalidatePath("/settings");
  return { success: true, merchantName: validation.merchantName };
}


/**
 * Manually re-pulls today + yesterday's sales for one provider — useful
 * right after connecting, or if a restaurateur doesn't want to wait for the
 * daily cron. Ignores any client-supplied restaurant id and derives it from
 * the caller's own membership instead, same as the OAuth connect route.
 */
export async function syncPosNowAction(provider: PosProvider): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) return false;

  const timeZone = await getRestaurantTimezoneAdmin(membership.restaurantId);
  const dates = [todayInTimezone(timeZone), isoDaysAgo(1)];
  await Promise.all(dates.map((date) => syncPosSalesForDate(provider, membership.restaurantId, date)));

  revalidatePath("/settings");
  return true;
}

