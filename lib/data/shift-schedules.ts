import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { ShiftSchedule, ShiftScheduleStatus } from "@/lib/types";

type ShiftScheduleRow = {
  id: string;
  restaurant_id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  position_label: string | null;
  status: ShiftScheduleStatus;
  created_at: string;
};

function mapShiftSchedule(row: ShiftScheduleRow): ShiftSchedule {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    employeeId: row.employee_id,
    shiftDate: row.shift_date,
    startTime: row.start_time,
    endTime: row.end_time,
    positionLabel: row.position_label,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getShiftSchedulesForWeek(
  restaurantId: string,
  weekStart: string,
  weekEnd: string
): Promise<ShiftSchedule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_schedules")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("shift_date", weekStart)
    .lte("shift_date", weekEnd)
    .order("shift_date")
    .order("start_time");

  if (error || !data) return [];
  return (data as ShiftScheduleRow[]).map(mapShiftSchedule);
}

export type ShiftScheduleInput = {
  employeeId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  positionLabel: string | null;
};

export async function createShiftSchedule(
  restaurantId: string,
  input: ShiftScheduleInput
): Promise<ShiftSchedule | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("shift_schedules")
    .insert({
      restaurant_id: restaurantId,
      employee_id: input.employeeId,
      shift_date: input.shiftDate,
      start_time: input.startTime,
      end_time: input.endTime,
      position_label: input.positionLabel,
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "shift_schedule.create",
    description: `A planifié un quart le ${input.shiftDate}`,
  });

  return mapShiftSchedule(data as ShiftScheduleRow);
}

export async function updateShiftScheduleStatus(
  restaurantId: string,
  id: string,
  status: ShiftScheduleStatus
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_schedules")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function deleteShiftSchedule(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shift_schedules")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

/** Every future shift for one employee, across all weeks — used for the "envoyer l'horaire" panel/email/link. */
export async function getUpcomingShiftsForEmployee(employeeId: string): Promise<ShiftSchedule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_schedules")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("shift_date", new Date().toISOString().slice(0, 10))
    .order("shift_date")
    .order("start_time");

  if (error || !data) return [];
  return (data as ShiftScheduleRow[]).map(mapShiftSchedule);
}
