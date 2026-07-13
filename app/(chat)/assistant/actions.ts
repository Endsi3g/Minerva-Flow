"use server";

import { revalidatePath } from "next/cache";
import { createConversation, renameConversation } from "@/lib/data/chat";
import type { ChatConversation } from "@/lib/types";

export async function createConversationAction(
  restaurantId: string
): Promise<ChatConversation | null> {
  if (!restaurantId) return null;
  const conversation = await createConversation(restaurantId);
  if (conversation) revalidatePath("/assistant");
  return conversation;
}

export async function renameConversationAction(id: string, title: string): Promise<void> {
  if (!id || !title.trim()) return;
  await renameConversation(id, title.trim());
  revalidatePath("/assistant");
}
