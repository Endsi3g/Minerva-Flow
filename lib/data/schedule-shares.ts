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

/** Snapshots an employee's upcoming shifts at share time — uses admin client to guarantee reliable generation and avoid silent RLS blocks. */
export async function createScheduleShare(
  restaurantId: string,
  employeeId: string,
  snapshot: ScheduleShareSnapshot,
  userId?: string
): Promise<string | null> {
  let creatorId = userId;
  if (!creatorId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    creatorId = user?.id;
  }

  const token = randomUUID().replace(/-/g, "");
  const admin = createAdminClient();
  const insertPayload: Record<string, any> = {
    restaurant_id: restaurantId,
    employee_id: employeeId,
    token,
    snapshot,
  };
  if (creatorId) {
    insertPayload.created_by = creatorId;
  }

  const { error } = await admin.from("schedule_shares").insert(insertPayload);
  if (error) {
    console.error("createScheduleShare failed:", error);
    return null;
  }

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
