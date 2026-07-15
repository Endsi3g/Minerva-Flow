"use server";

import { createPilotRequest, type CreatePilotRequestInput } from "@/lib/data/pilot-requests";

export async function requestPilotAccessAction(input: CreatePilotRequestInput): Promise<boolean> {
  if (!input.fullName.trim() || !input.email.trim() || !input.restaurantName.trim()) return false;
  return createPilotRequest(input);
}
