"use server";

import { revalidatePath } from "next/cache";
import {
  createEmployee,
  setEmployeeActive,
  updateEmployee,
  createEmployeeShift,
  getEmployeeShifts,
  createEmployeeReview,
  getEmployeeReviews,
  type EmployeeInput,
  type EmployeeUpdateInput,
  type EmployeeShiftInput,
  type EmployeeReviewInput,
} from "@/lib/data/employees";
import {
  createEmployeeTask,
  setEmployeeTaskStatus,
  type EmployeeTaskInput,
} from "@/lib/data/employee-tasks";
import { createEmployeeInviteLink, type WorkspaceInvite } from "@/lib/data/workspace-invites";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getCurrentWorkspaceMembership } from "@/lib/data/current-workspace";
import type { Employee, EmployeeReview, EmployeeShift, EmployeeTask, EmployeeTaskStatus, Role } from "@/lib/types";

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
  if (!restaurantId || !input.fullName.trim() || !input.contactEmail.trim()) return null;
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

export async function updateEmployeeAction(
  restaurantId: string,
  id: string,
  patch: EmployeeUpdateInput
): Promise<Employee | null> {
  if (!restaurantId || !id) return null;
  if (!(await requireManager(restaurantId))) return null;

  const employee = await updateEmployee(restaurantId, id, patch);
  if (employee) revalidatePath("/employees");
  return employee;
}

export async function createEmployeeShiftAction(input: EmployeeShiftInput): Promise<EmployeeShift | null> {
  if (!input.employeeId || !input.shiftDate) return null;
  if (!(await requireManager(input.restaurantId))) return null;

  const shift = await createEmployeeShift(input);
  if (shift) {
    revalidatePath("/employees");
    revalidatePath("/finance");
  }
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

export async function createEmployeeTaskAction(
  input: EmployeeTaskInput,
  employeeName: string
): Promise<EmployeeTask | null> {
  if (!input.employeeId || !input.title.trim()) return null;
  if (!(await requireManager(input.restaurantId))) return null;

  const task = await createEmployeeTask(input, employeeName);
  if (task) revalidatePath("/employees");
  return task;
}

/**
 * No manager check here: RLS on employee_tasks already allows both
 * owner/manager (any task) and the assigned employee via
 * employees.linked_user_id (their own task only) — this action serves
 * both the employer checklist and /mon-espace.
 */
export async function setEmployeeTaskStatusAction(
  restaurantId: string,
  taskId: string,
  status: EmployeeTaskStatus
): Promise<boolean> {
  if (!restaurantId || !taskId) return false;
  const ok = await setEmployeeTaskStatus(restaurantId, taskId, status);
  if (ok) {
    revalidatePath("/employees");
    revalidatePath("/mon-espace");
  }
  return ok;
}

export async function createEmployeeInviteLinkAction(
  restaurantId: string,
  employeeId: string,
  role: Role
): Promise<WorkspaceInvite | null> {
  if (!restaurantId || !employeeId) return null;
  if (!(await requireManager(restaurantId))) return null;

  const membership = await getCurrentWorkspaceMembership();
  if (!membership) return null;

  return createEmployeeInviteLink(membership.workspaceId, restaurantId, employeeId, role);
}
