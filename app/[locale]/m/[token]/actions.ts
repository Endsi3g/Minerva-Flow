"use server";

import {
  getPublicOrderDeliveryQuote,
  resumePublicOrder,
  submitPublicOrder,
  type PublicOrderCartLine,
  type PublicOrderGuestInfo,
  type SubmitPublicOrderResult,
} from "@/lib/data/customer-referrals";
import type { DeliveryQuote } from "@/lib/orders/delivery-pricing";
import { createClient } from "@/lib/supabase/server";
import { submitPublicServiceQuote, type PublicServiceQuoteInput } from "@/lib/data/service-quotes";

export type PublicMealSuggestion = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  status: "open" | "under_review" | "draft_added";
  menu_item_id: string | null;
  created_at: string;
  vote_count: number;
  has_voted: boolean;
};

export async function getPublicMealSuggestionsAction(restaurantId: string): Promise<
  | { ok: true; suggestions: PublicMealSuggestion[] }
  | { ok: false; reason: "unavailable" }
> {
  if (!restaurantId) return { ok: true, suggestions: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_meal_suggestions", { p_restaurant_id: restaurantId });
  if (error || !data) {
    console.error("getPublicMealSuggestionsAction: suggestions unavailable", error?.code ?? "unknown");
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, suggestions: data as PublicMealSuggestion[] };
}

export async function submitPublicMealSuggestionAction(
  restaurantId: string,
  title: string,
  description: string
): Promise<boolean> {
  if (!restaurantId || title.trim().length < 3 || title.trim().length > 120 || description.length > 1000) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_meal_suggestion", {
    p_restaurant_id: restaurantId,
    p_title: title.trim(),
    p_description: description.trim() || null,
  });
  return !error;
}

export async function votePublicMealSuggestionAction(suggestionId: string): Promise<{ voteCount: number; hasVoted: boolean } | null> {
  if (!suggestionId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vote_meal_suggestion", { p_suggestion_id: suggestionId });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return { voteCount: Number(data[0].vote_count), hasVoted: Boolean(data[0].has_voted) };
}

export async function submitPublicServiceQuoteAction(
  menuToken: string,
  input: PublicServiceQuoteInput
): Promise<{ ok: boolean; reason?: string }> {
  try {
    return await submitPublicServiceQuote(menuToken, input);
  } catch (error) {
    console.error("submitPublicServiceQuoteAction failed:", error);
    return { ok: false, reason: "save_failed" };
  }
}

export async function submitPublicOrderAction(
  token: string,
  referralCode: string | null,
  cart: PublicOrderCartLine[],
  guestInfo: PublicOrderGuestInfo,
  idempotencyKey: string
): Promise<SubmitPublicOrderResult> {
  if (!Array.isArray(cart) || cart.length === 0 || !guestInfo || typeof guestInfo.guestName !== "string"
      || !guestInfo.guestName.trim() || typeof idempotencyKey !== "string") return { ok: false };
  return submitPublicOrder(token, referralCode, cart, guestInfo, idempotencyKey);
}

export async function resumePublicOrderAction(token: string, idempotencyKey: string): Promise<SubmitPublicOrderResult> {
  if (typeof token !== "string" || !token || typeof idempotencyKey !== "string") return { ok: false };
  return resumePublicOrder(token, idempotencyKey);
}

export async function getPublicOrderDeliveryQuoteAction(token: string, address: string): Promise<DeliveryQuote> {
  try {
    return await getPublicOrderDeliveryQuote(token, address);
  } catch (error) {
    console.error("getPublicOrderDeliveryQuoteAction failed:", error);
    return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "missing_location" };
  }
}
