import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { notifyRestaurant, notifyRestaurantManagement } from "@/lib/data/notifications";
import { createFinancialTransaction } from "@/lib/data/finance";
import type { Employee, EmployeeReview, EmployeeShift } from "@/lib/types";

type EmployeeRow = {
  id: string;
  restaurant_id: string;
  linked_user_id: string | null;
  full_name: string;
  role_title: string;
  hourly_wage: number | null;
  active: boolean;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
};

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    linkedUserId: row.linked_user_id,
    fullName: row.full_name,
    roleTitle: row.role_title,
    hourlyWage: row.hourly_wage,
    active: row.active,
    description: row.description,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    createdAt: row.created_at,
  };
}

export async function getEmployees(restaurantId: string): Promise<Employee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("full_name", { ascending: true });

  if (error || !data) return [];
  return (data as EmployeeRow[]).map(mapEmployee);
}

export type EmployeeInput = {
  fullName: string;
  roleTitle: string;
  hourlyWage?: number | null;
  description?: string | null;
  contactPhone?: string | null;
  /** Required — this is the address invited to log in and access /mon-espace. */
  contactEmail: string;
};

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapEmployee(data as EmployeeRow);
}

/** The employees row the current logged-in user is linked to, if any. */
export async function getEmployeeByLinkedUser(restaurantId: string, userId: string): Promise<Employee | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("linked_user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapEmployee(data as EmployeeRow);
}

export async function createEmployee(restaurantId: string, input: EmployeeInput): Promise<Employee | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("employees")
    .insert({
      restaurant_id: restaurantId,
      full_name: input.fullName,
      role_title: input.roleTitle,
      hourly_wage: input.hourlyWage ?? null,
      description: input.description ?? null,
      contact_phone: input.contactPhone ?? null,
      contact_email: input.contactEmail ?? null,
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "employee.create",
    entityType: "employee",
    entityId: data.id,
    description: `A ajouté ${input.fullName} comme employé`,
  });

  return mapEmployee(data as EmployeeRow);
}

export async function setEmployeeActive(restaurantId: string, id: string, active: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ active })
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export type EmployeeUpdateInput = Partial<
  Pick<EmployeeInput, "fullName" | "roleTitle" | "hourlyWage" | "description" | "contactPhone" | "contactEmail">
>;

export async function updateEmployee(
  restaurantId: string,
  id: string,
  patch: EmployeeUpdateInput
): Promise<Employee | null> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
  if (patch.roleTitle !== undefined) dbPatch.role_title = patch.roleTitle;
  if (patch.hourlyWage !== undefined) dbPatch.hourly_wage = patch.hourlyWage;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.contactPhone !== undefined) dbPatch.contact_phone = patch.contactPhone;
  if (patch.contactEmail !== undefined) dbPatch.contact_email = patch.contactEmail;

  const { data, error } = await supabase
    .from("employees")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapEmployee(data as EmployeeRow);
}

type ShiftRow = {
  id: string;
  employee_id: string;
  shift_date: string;
  hours_worked: number;
  was_late: boolean;
  notes: string | null;
  clock_in: string | null;
  clock_out: string | null;
  created_at: string;
};

function mapShift(row: ShiftRow): EmployeeShift {
  return {
    id: row.id,
    employeeId: row.employee_id,
    shiftDate: row.shift_date,
    hoursWorked: row.hours_worked,
    wasLate: row.was_late,
    notes: row.notes,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    createdAt: row.created_at,
  };
}

export async function getEmployeeShifts(employeeId: string): Promise<EmployeeShift[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_shifts")
    .select("*")
    .eq("employee_id", employeeId)
    .order("shift_date", { ascending: false });

  if (error || !data) return [];
  return (data as ShiftRow[]).map(mapShift);
}

export type EmployeeShiftInput = {
  employeeId: string;
  restaurantId: string;
  shiftDate: string;
  hoursWorked: number;
  wasLate: boolean;
  notes?: string | null;
};

/**
 * A logged shift automatically books its labor cost as a Finance expense
 * (category "Main d'œuvre") when the employee has an hourly wage set — so
 * payroll shows up in reports/expense totals without a separate manual
 * entry. Best-effort: a failure here never blocks the shift log itself.
 */
async function bookLaborExpense(
  restaurantId: string,
  employeeId: string,
  shiftDate: string,
  hoursWorked: number
): Promise<string | null> {
  const employee = await getEmployeeById(employeeId);
  if (!employee || employee.hourlyWage === null || hoursWorked <= 0) return null;

  const transaction = await createFinancialTransaction(restaurantId, {
    date: shiftDate,
    description: `Quart travaillé — ${employee.fullName}`,
    amount: Math.round(employee.hourlyWage * hoursWorked * 100) / 100,
    direction: "out",
    category: "Main d'œuvre",
    sourceAccount: "Paie",
    reviewed: true,
  });

  return transaction?.id ?? null;
}

export async function createEmployeeShift(input: EmployeeShiftInput): Promise<EmployeeShift | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const financialTransactionId = await bookLaborExpense(
    input.restaurantId,
    input.employeeId,
    input.shiftDate,
    input.hoursWorked
  );

  const { data, error } = await supabase
    .from("employee_shifts")
    .insert({
      employee_id: input.employeeId,
      restaurant_id: input.restaurantId,
      shift_date: input.shiftDate,
      hours_worked: input.hoursWorked,
      was_late: input.wasLate,
      notes: input.notes ?? null,
      created_by: user?.id,
      financial_transaction_id: financialTransactionId,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapShift(data as ShiftRow);
}

const LATE_GRACE_MINUTES = 10;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Self-service clock-in (also used by the manager-on-behalf-of-an-employee
 * path — the caller/RLS distinction is enforced by which Supabase client
 * gets used, not by this function). Refuses if the employee already has an
 * open shift (clock_out is null) — one active shift at a time. Lateness is
 * derived from today's shift_schedules row for this employee, if any;
 * employees with no scheduled shift today are never marked late.
 */
export async function clockIn(employeeId: string, restaurantId: string): Promise<EmployeeShift | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: openShift } = await supabase
    .from("employee_shifts")
    .select("id")
    .eq("employee_id", employeeId)
    .is("clock_out", null)
    .not("clock_in", "is", null)
    .maybeSingle();
  if (openShift) return null;

  const shiftDate = todayIso();
  const now = new Date();

  const { data: schedule } = await supabase
    .from("shift_schedules")
    .select("start_time")
    .eq("employee_id", employeeId)
    .eq("shift_date", shiftDate)
    .neq("status", "annule")
    .order("start_time")
    .limit(1)
    .maybeSingle();

  let wasLate = false;
  if (schedule?.start_time) {
    const [h, m] = (schedule.start_time as string).split(":").map(Number);
    const scheduledStart = new Date(now);
    scheduledStart.setHours(h, m, 0, 0);
    wasLate = now.getTime() - scheduledStart.getTime() > LATE_GRACE_MINUTES * 60 * 1000;
  }

  const { data, error } = await supabase
    .from("employee_shifts")
    .insert({
      employee_id: employeeId,
      restaurant_id: restaurantId,
      shift_date: shiftDate,
      hours_worked: 0,
      was_late: wasLate,
      clock_in: now.toISOString(),
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  const employee = await getEmployeeById(employeeId);
  if (employee) {
    await notifyRestaurantManagement({
      restaurantId,
      type: wasLate ? "employee.clocked_in_late" : "employee.clocked_in",
      title: wasLate ? "Employé en retard" : "Quart commencé",
      body: wasLate
        ? `${employee.fullName} vient de pointer, en retard.`
        : `${employee.fullName} vient de pointer pour son quart.`,
      link: "/employees",
    });
  }

  return mapShift(data as ShiftRow);
}

/**
 * Clock-out: computes hours_worked from clock_in→now and books the same
 * labor-expense Finance transaction createEmployeeShift already does for
 * manually-logged shifts, so a self-clocked shift shows up in expense
 * totals identically.
 */
export async function clockOut(shiftId: string, restaurantId: string): Promise<EmployeeShift | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("employee_shifts")
    .select("employee_id, shift_date, clock_in, clock_out")
    .eq("id", shiftId)
    .maybeSingle();
  if (!existing || !existing.clock_in || existing.clock_out) return null;

  const now = new Date();
  const clockInTime = new Date(existing.clock_in as string);
  const hoursWorked = Math.round(((now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)) * 100) / 100;

  const financialTransactionId = await bookLaborExpense(
    restaurantId,
    existing.employee_id as string,
    existing.shift_date as string,
    hoursWorked
  );

  const { data, error } = await supabase
    .from("employee_shifts")
    .update({
      clock_out: now.toISOString(),
      hours_worked: hoursWorked,
      financial_transaction_id: financialTransactionId,
    })
    .eq("id", shiftId)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapShift(data as ShiftRow);
}

export type { PayPeriod } from "@/lib/pay-period";
export { getPayPeriodRange } from "@/lib/pay-period";

export type EmployeePaySummary = {
  hours: number;
  grossPay: number | null;
  periodStart: string;
  periodEnd: string;
};

export async function getEmployeePaySummary(
  employeeId: string,
  periodStart: string,
  periodEnd: string
): Promise<EmployeePaySummary> {
  const supabase = await createClient();
  const [{ data: shiftRows }, employee] = await Promise.all([
    supabase
      .from("employee_shifts")
      .select("hours_worked")
      .eq("employee_id", employeeId)
      .gte("shift_date", periodStart)
      .lte("shift_date", periodEnd),
    getEmployeeById(employeeId),
  ]);

  const hours = ((shiftRows as { hours_worked: number }[] | null) ?? []).reduce(
    (sum, r) => sum + r.hours_worked,
    0
  );
  const grossPay = employee?.hourlyWage != null ? Math.round(hours * employee.hourlyWage * 100) / 100 : null;

  return { hours: Math.round(hours * 100) / 100, grossPay, periodStart, periodEnd };
}

type ReviewRow = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  rating: number;
  strengths: string | null;
  improvements: string | null;
  attributed_revenue: number | null;
  raise_recommended: boolean;
  reviewer_id: string;
  created_at: string;
};

async function reviewerNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reviewerIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(reviewerIds));
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", uniqueIds);
  for (const p of (data as { id: string; full_name: string | null }[]) ?? []) {
    map.set(p.id, p.full_name ?? "—");
  }
  return map;
}

function mapReview(row: ReviewRow, reviewerName: string): EmployeeReview {
  return {
    id: row.id,
    employeeId: row.employee_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    rating: row.rating,
    strengths: row.strengths,
    improvements: row.improvements,
    attributedRevenue: row.attributed_revenue,
    raiseRecommended: row.raise_recommended,
    reviewerName,
    createdAt: row.created_at,
  };
}

export async function getEmployeeReviews(employeeId: string): Promise<EmployeeReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_reviews")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as ReviewRow[];
  const names = await reviewerNames(supabase, rows.map((r) => r.reviewer_id));
  return rows.map((row) => mapReview(row, names.get(row.reviewer_id) ?? "—"));
}

export async function getEmployeeReview(reviewId: string): Promise<EmployeeReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_reviews")
    .select("*")
    .eq("id", reviewId)
    .maybeSingle();

  if (error || !data) return null;
  const names = await reviewerNames(supabase, [data.reviewer_id]);
  return mapReview(data as ReviewRow, names.get(data.reviewer_id) ?? "—");
}

export type EmployeeReviewInput = {
  employeeId: string;
  restaurantId: string;
  periodStart: string;
  periodEnd: string;
  rating: number;
  strengths?: string | null;
  improvements?: string | null;
  attributedRevenue?: number | null;
  raiseRecommended: boolean;
};

export async function createEmployeeReview(
  input: EmployeeReviewInput,
  employeeName: string
): Promise<EmployeeReview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("employee_reviews")
    .insert({
      employee_id: input.employeeId,
      restaurant_id: input.restaurantId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      rating: input.rating,
      strengths: input.strengths ?? null,
      improvements: input.improvements ?? null,
      attributed_revenue: input.attributedRevenue ?? null,
      raise_recommended: input.raiseRecommended,
      reviewer_id: user.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId: input.restaurantId,
    actionType: "employee.review",
    entityType: "employee",
    entityId: input.employeeId,
    description: `A publié une revue de performance pour ${employeeName}`,
  });

  await notifyRestaurant({
    restaurantId: input.restaurantId,
    type: "employee.review_published",
    title: "Nouvelle revue de performance",
    body: `${employeeName} a été évalué·e.`,
    link: "/employees",
    excludeUserId: user.id,
  });

  const names = await reviewerNames(supabase, [data.reviewer_id]);
  return mapReview(data as ReviewRow, names.get(data.reviewer_id) ?? "—");
}
