"use server";

import { createSupportRequest, type SupportCategory } from "@/lib/data/support";

export async function createSupportRequestAction(input: {
  restaurantId: string | null;
  category: SupportCategory;
  subject: string;
  message: string;
}): Promise<boolean> {
  if (!input.subject.trim() || !input.message.trim()) return false;
  return createSupportRequest(input);
}
