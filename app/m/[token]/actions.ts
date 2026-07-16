"use server";

import {
  submitPublicOrder,
  type PublicOrderCartLine,
  type PublicOrderGuestInfo,
} from "@/lib/data/customer-referrals";

export async function submitPublicOrderAction(
  token: string,
  referralCode: string | null,
  cart: PublicOrderCartLine[],
  guestInfo: PublicOrderGuestInfo
): Promise<boolean> {
  if (cart.length === 0 || !guestInfo.guestName.trim()) return false;
  return submitPublicOrder(token, referralCode, cart, guestInfo);
}
