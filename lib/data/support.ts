import { createClient } from "@/lib/supabase/server";

export type SupportCategory = "bug" | "amelioration" | "question";

export type CreateSupportRequestInput = {
  restaurantId: string | null;
  category: SupportCategory;
  subject: string;
  message: string;
};

export async function createSupportRequest(input: CreateSupportRequestInput): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("support_requests").insert({
    restaurant_id: input.restaurantId,
    user_id: user.id,
    category: input.category,
    subject: input.subject,
    message: input.message,
  });

  return !error;
}
