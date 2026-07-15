import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { notifyRestaurant } from "@/lib/data/notifications";
import type { Employee, EmployeeReview, EmployeeShift } from "@/lib/types";

type EmployeeRow = {
  id: string;
  restaurant_id: string;
  linked_user_id: string | null;
  full_name: string;
  role_title: string;
  hourly_wage: number | null;
  active: boolean;
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
};

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
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

type ShiftRow = {
  id: string;
  employee_id: string;
  shift_date: string;
  hours_worked: number;
  was_late: boolean;
  notes: string | null;
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

export async function createEmployeeShift(input: EmployeeShiftInput): Promise<EmployeeShift | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapShift(data as ShiftRow);
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
