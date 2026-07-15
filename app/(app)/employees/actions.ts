"use server";

import { revalidatePath } from "next/cache";
import {
  createEmployee,
  setEmployeeActive,
  createEmployeeShift,
  getEmployeeShifts,
  createEmployeeReview,
  getEmployeeReviews,
  type EmployeeInput,
  type EmployeeShiftInput,
  type EmployeeReviewInput,
} from "@/lib/data/employees";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import type { Employee, EmployeeReview, EmployeeShift } from "@/lib/types";

async function requireManager(restaurantId: string): Promise<boolean> {
  const membership = await getCurrentMembership();
  return Boolean(
    membership && membership.restaurantId === restaurantId && ["owner", "manager"].includes(membership.role)
  );
}

export async function createEmployeeAction(
  restaurantId: string,
  input: EmployeeInput
): Promise<Employee | null> {
  if (!restaurantId || !input.fullName.trim()) return null;
  if (!(await requireManager(restaurantId))) return null;

  const employee = await createEmployee(restaurantId, input);
  if (employee) revalidatePath("/employees");
  return employee;
}

export async function setEmployeeActiveAction(
  restaurantId: string,
  id: string,
  active: boolean
): Promise<boolean> {
  if (!restaurantId || !id) return false;
  if (!(await requireManager(restaurantId))) return false;

  const ok = await setEmployeeActive(restaurantId, id, active);
  if (ok) revalidatePath("/employees");
  return ok;
}

export async function createEmployeeShiftAction(input: EmployeeShiftInput): Promise<EmployeeShift | null> {
  if (!input.employeeId || !input.shiftDate) return null;
  if (!(await requireManager(input.restaurantId))) return null;

  const shift = await createEmployeeShift(input);
  if (shift) revalidatePath("/employees");
  return shift;
}

export async function getEmployeeShiftsAction(employeeId: string): Promise<EmployeeShift[]> {
  if (!employeeId) return [];
  return getEmployeeShifts(employeeId);
}

export async function createEmployeeReviewAction(
  input: EmployeeReviewInput,
  employeeName: string
): Promise<EmployeeReview | null> {
  if (!input.employeeId || !input.periodStart || !input.periodEnd) return null;
  if (!(await requireManager(input.restaurantId))) return null;

  const review = await createEmployeeReview(input, employeeName);
  if (review) revalidatePath("/employees");
  return review;
}

export async function getEmployeeReviewsAction(employeeId: string): Promise<EmployeeReview[]> {
  if (!employeeId) return [];
  return getEmployeeReviews(employeeId);
}
