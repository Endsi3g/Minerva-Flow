"use server";

import {
  submitPublicOrder,
  type PublicOrderCartLine,
  type PublicOrderGuestInfo,
  type SubmitPublicOrderResult,
} from "@/lib/data/customer-referrals";

export async function submitPublicOrderAction(
  token: string,
  referralCode: string | null,
  cart: PublicOrderCartLine[],
  guestInfo: PublicOrderGuestInfo
): Promise<SubmitPublicOrderResult> {
  if (cart.length === 0 || !guestInfo.guestName.trim()) return { ok: false };
  return submitPublicOrder(token, referralCode, cart, guestInfo);
}
