"use server";

import { submitPublicReservationRequest, type PublicReservationRequestInput } from "@/lib/data/customer-referrals";

export async function submitReservationRequestAction(
  code: string,
  input: PublicReservationRequestInput
): Promise<boolean> {
  if (!input.guestName.trim() || !input.reservationTime || !Number.isFinite(input.partySize) || input.partySize < 1) {
    return false;
  }
  return submitPublicReservationRequest(code, input);
}
