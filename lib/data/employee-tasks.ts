import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { broadcastNotification } from "@/lib/data/notifications";
import { getEmployeeById } from "@/lib/data/employees";
import type { EmployeeTask, EmployeeTaskStatus } from "@/lib/types";

type TaskRow = {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  status: EmployeeTaskStatus;
  completed_at: string | null;
  created_at: string;
};

function mapTask(row: TaskRow): EmployeeTask {
  return {
    id: row.id,
    employeeId: row.employee_id,
    title: row.title,
    description: row.description,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function getEmployeeTasks(employeeId: string): Promise<EmployeeTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_tasks")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as TaskRow[]).map(mapTask);
}

export type EmployeeTaskInput = {
  employeeId: string;
  restaurantId: string;
  title: string;
  description?: string | null;
};

export async function createEmployeeTask(
  input: EmployeeTaskInput,
  employeeName: string
): Promise<EmployeeTask | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("employee_tasks")
    .insert({
      employee_id: input.employeeId,
      restaurant_id: input.restaurantId,
      title: input.title,
      description: input.description ?? null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId: input.restaurantId,
    actionType: "employee.task_assign",
    entityType: "employee",
    entityId: input.employeeId,
    description: `A assigné une tâche à ${employeeName} : "${input.title}"`,
  });

  const employee = await getEmployeeById(input.employeeId);
  if (employee?.linkedUserId) {
    await broadcastNotification({
      restaurantId: input.restaurantId,
      userIds: [employee.linkedUserId],
      type: "task.assigned",
      title: "Nouvelle tâche",
      body: input.title,
      link: "/mon-espace",
    });
  }

  return mapTask(data as TaskRow);
}

/**
 * Toggles a task's status. RLS lets both owner/manager and the assigned
 * employee (via employees.linked_user_id) update the row, so this same
 * function serves the employer-side checklist and /mon-espace.
 */
export async function setEmployeeTaskStatus(
  restaurantId: string,
  taskId: string,
  status: EmployeeTaskStatus
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_tasks")
    .update({ status, completed_at: status === "fait" ? new Date().toISOString() : null })
    .eq("restaurant_id", restaurantId)
    .eq("id", taskId);

  return !error;
}
