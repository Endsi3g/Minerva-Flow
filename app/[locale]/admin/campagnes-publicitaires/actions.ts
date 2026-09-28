"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PaidAdsRequestStatus } from "@/lib/data/paid-ads-requests";

export async function updatePaidAdsRequestStatusAction(
  id: string,
  status: Exclude<PaidAdsRequestStatus, "nouveau">,
  note = ""
): Promise<boolean> {
  if (
    !(await isPlatformAdmin())
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || !["contacte", "ferme"].includes(status)
    || typeof note !== "string"
  ) return false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { error } = await admin.from("paid_ads_requests").update({
    status,
    admin_note: note.trim().slice(0, 1000) || null,
    handled_by: user.id,
    handled_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) return false;
  revalidatePath("/admin/campagnes-publicitaires");
  return true;
}
