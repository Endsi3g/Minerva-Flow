"use server";

import { createSupportRequest, getMySupportRequests, type SupportCategory, type SupportRequest } from "@/lib/data/support";

export async function createSupportRequestAction(input: {
  restaurantId: string | null;
  category: SupportCategory;
  subject: string;
  message: string;
}): Promise<boolean> {
  if (!input.subject.trim() || !input.message.trim()) return false;
  return createSupportRequest(input);
}

export async function getMySupportRequestsAction(): Promise<SupportRequest[]> {
  return getMySupportRequests();
}
