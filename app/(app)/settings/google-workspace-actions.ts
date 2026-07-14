"use server";

import { revalidatePath } from "next/cache";
import { isGoogleConfigured } from "@/lib/google/config";
import { getGoogleConnection, updateGoogleConnectionMeta } from "@/lib/data/google-connections";
import type { GoogleConnection } from "@/lib/data/google-connections";

export async function getGoogleWorkspaceStatusAction(restaurantId: string): Promise<{
  configured: boolean;
  connection: GoogleConnection | null;
}> {
  const connection = restaurantId ? await getGoogleConnection(restaurantId) : null;
  return { configured: isGoogleConfigured(), connection };
}

export async function saveGa4PropertyIdAction(restaurantId: string, propertyId: string): Promise<void> {
  if (!restaurantId || !propertyId.trim()) return;
  await updateGoogleConnectionMeta(restaurantId, { ga4PropertyId: propertyId.trim() });
  revalidatePath("/settings");
}
