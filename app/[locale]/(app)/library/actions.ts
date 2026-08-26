"use server";

import { revalidatePath } from "next/cache";
import {
  createLibraryAsset,
  deleteLibraryAsset,
  getLibraryAssetDownloadUrl,
  type LibraryAsset,
  type LibraryAssetInput,
} from "@/lib/data/library";

export async function createLibraryAssetAction(
  restaurantId: string,
  input: LibraryAssetInput
): Promise<LibraryAsset | null> {
  if (!restaurantId || !input.storagePath) return null;
  const asset = await createLibraryAsset(restaurantId, input);
  if (asset) revalidatePath("/library");
  return asset;
}

export async function deleteLibraryAssetAction(restaurantId: string, assetId: string): Promise<boolean> {
  if (!restaurantId || !assetId) return false;
  const ok = await deleteLibraryAsset(restaurantId, assetId);
  if (ok) revalidatePath("/library");
  return ok;
}

export async function getLibraryAssetDownloadUrlAction(restaurantId: string, assetId: string): Promise<string | null> {
  if (!restaurantId || !assetId) return null;
  return getLibraryAssetDownloadUrl(restaurantId, assetId);
}
