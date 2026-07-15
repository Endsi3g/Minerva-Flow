"use server";

import { revalidatePath } from "next/cache";
import {
  getShiftSchedulesForWeek,
  createShiftSchedule,
  updateShiftScheduleStatus,
  deleteShiftSchedule,
  type ShiftScheduleInput,
} from "@/lib/data/shift-schedules";
import { notifyRestaurant } from "@/lib/data/notifications";
import { getEmployees } from "@/lib/data/employees";
import type { Employee, ShiftSchedule, ShiftScheduleStatus } from "@/lib/types";

export async function getWeekScheduleAction(
  restaurantId: string,
  weekStart: string,
  weekEnd: string
): Promise<{ employees: Employee[]; shifts: ShiftSchedule[] }> {
  if (!restaurantId) return { employees: [], shifts: [] };
  const [employees, shifts] = await Promise.all([
    getEmployees(restaurantId),
    getShiftSchedulesForWeek(restaurantId, weekStart, weekEnd),
  ]);
  return { employees: employees.filter((e) => e.active), shifts };
}

export async function createShiftScheduleAction(
  restaurantId: string,
  input: ShiftScheduleInput
): Promise<ShiftSchedule | null> {
  const shift = await createShiftSchedule(restaurantId, input);
  if (shift) {
    revalidatePath("/horaire");
    await notifyRestaurant({
      restaurantId,
      type: "shift.scheduled",
      title: "Nouveau quart planifié",
      body: `${input.shiftDate} — ${input.startTime} à ${input.endTime}`,
      link: "/horaire",
    });
  }
  return shift;
}

export async function updateShiftScheduleStatusAction(
  restaurantId: string,
  id: string,
  status: ShiftScheduleStatus
): Promise<boolean> {
  const ok = await updateShiftScheduleStatus(restaurantId, id, status);
  if (ok) revalidatePath("/horaire");
  return ok;
}

export async function deleteShiftScheduleAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteShiftSchedule(restaurantId, id);
  if (ok) revalidatePath("/horaire");
  return ok;
}
