import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShiftSchedule } from "@/lib/types";

export type ScheduleShareSnapshot = {
  employeeName: string;
  restaurantName: string;
  shifts: ShiftSchedule[];
};

export type ScheduleShare = {
  token: string;
  createdAt: string;
  snapshot: ScheduleShareSnapshot;
};

/** Snapshots an employee's upcoming shifts at share time — same rationale as report_shares (no RLS session for an anonymous visitor). */
export async function createScheduleShare(
  restaurantId: string,
  employeeId: string,
  snapshot: ScheduleShareSnapshot
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const token = randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("schedule_shares").insert({
    restaurant_id: restaurantId,
    employee_id: employeeId,
    token,
    snapshot,
    created_by: user.id,
  });
  if (error) return null;

  return token;
}

export async function getScheduleShareByToken(token: string): Promise<ScheduleShare | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("schedule_shares")
    .select("token, snapshot, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;

  return {
    token: data.token,
    createdAt: data.created_at,
    snapshot: data.snapshot as ScheduleShareSnapshot,
  };
}
