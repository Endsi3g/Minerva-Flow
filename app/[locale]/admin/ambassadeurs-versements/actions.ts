"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function approveAmbassadorPayoutAction(id: string): Promise<boolean> {
  if (!(await isPlatformAdmin()) || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin.from("flow_ambassador_commissions")
    .update({ status: "payable", payout_approved_at: now, payout_approved_by: user.id })
    .eq("id", id)
    .in("status", ["pending", "payable"])
    .lte("payable_at", now)
    .is("stripe_transfer_id", null)
    .is("payout_approved_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) return false;
  revalidatePath("/admin/ambassadeurs-versements");
  revalidatePath("/workspace/ambassadeurs");
  return true;
}
