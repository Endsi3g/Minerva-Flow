"use server";

import { revalidatePath } from "next/cache";
import { createConversation, renameConversation } from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";
import type { ChatConversation } from "@/lib/types";

export async function createConversationAction(
  restaurantId: string
): Promise<ChatConversation | null> {
  if (!restaurantId) return null;
  const conversation = await createConversation(restaurantId);
  if (conversation) {
    revalidatePath("/assistant");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const posthog = getPostHogClient();
      posthog.capture({ distinctId: user.id, event: "ai_conversation_started" });
      await posthog.flush();
    }
  }
  return conversation;
}

export async function renameConversationAction(id: string, title: string): Promise<void> {
  if (!id || !title.trim()) return;
  await renameConversation(id, title.trim());
  revalidatePath("/assistant");
}

export async function updateConversationTitleAction(id: string, title: string): Promise<void> {
  return renameConversationAction(id, title);
}
