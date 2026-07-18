"use server";

import { revalidatePath } from "next/cache";
import {
  getShiftSchedulesForWeek,
  getUpcomingShiftsForEmployee,
  createShiftSchedule,
  updateShiftScheduleStatus,
  deleteShiftSchedule,
  type ShiftScheduleInput,
} from "@/lib/data/shift-schedules";
import { notifyRestaurant, broadcastNotification } from "@/lib/data/notifications";
import { getEmployees, getEmployeeById } from "@/lib/data/employees";
import { getRestaurant } from "@/lib/data/restaurants";
import { getGoogleConnection } from "@/lib/data/google-connections";
import { createScheduleShare } from "@/lib/data/schedule-shares";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendReportEmail } from "@/lib/google/gmail";
import { GOOGLE_SCOPES } from "@/lib/google/config";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { formatDate } from "@/lib/utils";
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
    
    // Find employee linked user ID
    const employee = await getEmployeeById(input.employeeId);
    
    // Find all active members who are not owners
    const admin = createAdminClient();
    const { data } = await admin
      .from("restaurant_members")
      .select("user_id")
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .neq("role", "owner");

    const recipientIds = new Set<string>();
    if (data) {
      for (const m of data as { user_id: string }[]) {
        recipientIds.add(m.user_id);
      }
    }
    
    // Also notify the scheduled employee specifically, if they are linked
    if (employee?.linkedUserId) {
      recipientIds.add(employee.linkedUserId);
    }

    // Exclude the user who created the shift schedule (the active user)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      recipientIds.delete(user.id);
    }

    await broadcastNotification({
      restaurantId,
      userIds: Array.from(recipientIds),
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

export async function getEmployeeUpcomingShiftsAction(employeeId: string): Promise<ShiftSchedule[]> {
  if (!employeeId) return [];
  return getUpcomingShiftsForEmployee(employeeId);
}

function scheduleEmailHtml(employeeName: string, restaurantName: string, shifts: ShiftSchedule[]): string {
  const rows = shifts
    .map(
      (s) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${formatDate(s.shiftDate)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${s.startTime.slice(0, 5)} – ${s.endTime.slice(0, 5)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${s.positionLabel ?? ""}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;color:#1a1e16">
      <h2 style="color:#167f5b">Votre horaire — ${restaurantName}</h2>
      <p>Bonjour ${employeeName}, voici vos prochains quarts :</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px">
        <thead><tr><th style="text-align:left;padding:6px 12px">Date</th><th style="text-align:left;padding:6px 12px">Heures</th><th style="text-align:left;padding:6px 12px">Poste</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" style="padding:12px">Aucun quart planifié pour l\'instant.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

/**
 * Sends the employee's upcoming shifts by email via the restaurant's
 * connected Gmail (gmail.send scope) — requires both an hourlyWage-style
 * contact email on the employee record and Gmail configured in Paramètres.
 */
export async function sendScheduleEmailAction(
  restaurantId: string,
  employeeId: string
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return { ok: false, error: "Non autorisé." };
  }

  const [employee, restaurant, connection, shifts] = await Promise.all([
    getEmployeeById(employeeId),
    getRestaurant(restaurantId),
    getGoogleConnection(restaurantId),
    getUpcomingShiftsForEmployee(employeeId),
  ]);

  if (!employee?.contactEmail) return { ok: false, error: "Aucun courriel enregistré pour cet employé." };
  if (!connection?.grantedScopes.includes(GOOGLE_SCOPES.gmail)) {
    return { ok: false, error: "Gmail n'est pas connecté (Paramètres → Intégrations)." };
  }

  const sent = await sendReportEmail(restaurantId, {
    to: employee.contactEmail,
    subject: `Votre horaire — ${restaurant?.name ?? "Minerva Flow"}`,
    html: scheduleEmailHtml(employee.fullName, restaurant?.name ?? "", shifts),
  });

  return sent ? { ok: true } : { ok: false, error: "L'envoi a échoué. Réessayez." };
}

export async function createScheduleShareLinkAction(
  restaurantId: string,
  employeeId: string
): Promise<string | null> {
  const [employee, restaurant, shifts] = await Promise.all([
    getEmployeeById(employeeId),
    getRestaurant(restaurantId),
    getUpcomingShiftsForEmployee(employeeId),
  ]);
  if (!employee) return null;

  return createScheduleShare(restaurantId, employeeId, {
    employeeName: employee.fullName,
    restaurantName: restaurant?.name ?? "",
    shifts,
  });
}
