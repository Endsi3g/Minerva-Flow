"use server";

import { revalidatePath } from "next/cache";
import { respondToReview, respondToGoogleReview } from "@/lib/data/reputation";
import { updateRestaurantAction } from "@/app/[locale]/(app)/settings/actions";

export async function respondToReviewAction(reviewId: string, response: string): Promise<boolean> {
  const ok = await respondToReview(reviewId, response);
  if (ok) revalidatePath("/reputation");
  return ok;
}

export async function respondToGoogleReviewAction(reviewId: string, response: string): Promise<boolean> {
  const ok = await respondToGoogleReview(reviewId, response);
  if (ok) revalidatePath("/reputation");
  return ok;
}

/**
 * Only ever persists googlePlaceId — GooglePlacesSearch's onSelect patch
 * also carries address/city/phone/etc. (see etablissement/page.tsx's own
 * use of it), which this page has no business silently overwriting on the
 * restaurant's real record just because an owner was connecting their
 * Google Maps listing for review monitoring.
 */
export async function connectGooglePlaceAction(restaurantId: string, googlePlaceId: string): Promise<boolean> {
  if (!googlePlaceId.trim()) return false;
  const restaurant = await updateRestaurantAction(restaurantId, { googlePlaceId: googlePlaceId.trim() });
  if (restaurant) revalidatePath("/reputation");
  return Boolean(restaurant);
}
