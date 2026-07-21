"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import {
  getEmployeeByLinkedUser,
  clockIn,
  clockOut,
  getPayPeriodRange,
  getEmployeePaySummary,
  type PayPeriod,
  type EmployeePaySummary,
} from "@/lib/data/employees";
import { getUpcomingShiftsForEmployee } from "@/lib/data/shift-schedules";
import type { EmployeeShift, ShiftSchedule } from "@/lib/types";

/** Resolves the current signed-in user's own employee record for this restaurant, if any. */
async function getMyEmployee() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const employee = await getEmployeeByLinkedUser(membership.restaurantId, user.id);
  if (!employee) return null;

  return { employee, restaurantId: membership.restaurantId };
}

export async function clockInAction(): Promise<EmployeeShift | null> {
  const ctx = await getMyEmployee();
  if (!ctx) return null;

  const shift = await clockIn(ctx.employee.id, ctx.restaurantId);
  if (shift) revalidatePath("/mon-espace");
  return shift;
}

export async function clockOutAction(shiftId: string): Promise<EmployeeShift | null> {
  if (!shiftId) return null;
  const ctx = await getMyEmployee();
  if (!ctx) return null;

  const shift = await clockOut(shiftId, ctx.restaurantId);
  if (shift) revalidatePath("/mon-espace");
  return shift;
}

export async function getMyPaySummaryAction(period: PayPeriod): Promise<EmployeePaySummary | null> {
  const ctx = await getMyEmployee();
  if (!ctx) return null;

  const { start, end } = getPayPeriodRange(period);
  return getEmployeePaySummary(ctx.employee.id, start, end);
}

export async function getMyUpcomingShiftsAction(): Promise<ShiftSchedule[]> {
  const ctx = await getMyEmployee();
  if (!ctx) return [];
  return getUpcomingShiftsForEmployee(ctx.employee.id);
}
