"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyFlowAmbassador } from "@/lib/data/flow-ambassadors";

export async function reviewAmbassadorUgcAction(id: string, status: "approved" | "rejected", note = ""): Promise<boolean> {
  if (!(await isPlatformAdmin()) || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data: submission } = await admin.from("flow_ugc_submissions")
    .select("id, flow_ambassadors!inner(user_id), flow_ugc_restaurant_profiles!inner(display_name)")
    .eq("id", id).eq("status", "pending").maybeSingle();
  if (!submission) return false;
  const ambassadorUserId = (submission.flow_ambassadors as unknown as { user_id: string }).user_id;
  const restaurantName = (submission.flow_ugc_restaurant_profiles as unknown as { display_name: string }).display_name;
  const { error } = await admin.from("flow_ugc_submissions").update({
    status,
    review_note: note.trim().slice(0, 500) || null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending");
  revalidatePath("/admin/ambassadeurs-ugc");
  if (!error) await notifyFlowAmbassador(ambassadorUserId, {
    kind: status === "approved" ? "ugc-approved" : "ugc-revision",
    restaurantName,
    reviewNote: note.trim().slice(0, 500),
  });
  return !error;
}
