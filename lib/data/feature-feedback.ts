import { createClient } from "@/lib/supabase/server";

export async function createFeatureFeedback(input: {
  restaurantId: string | null;
  pollOption: string | null;
  suggestion: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("feature_feedback").insert({
    restaurant_id: input.restaurantId,
    user_id: user.id,
    poll_option: input.pollOption,
    suggestion: input.suggestion,
  });
  return !error;
}
