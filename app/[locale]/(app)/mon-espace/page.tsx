import {
  getEmployeeByLinkedUser,
  getEmployeeShifts,
  getEmployeeReviews,
  getPayPeriodRange,
  getEmployeePaySummary,
} from "@/lib/data/employees";
import { getEmployeeTasks } from "@/lib/data/employee-tasks";
import { getUpcomingShiftsForEmployee } from "@/lib/data/shift-schedules";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";
import { MonEspaceView } from "./MonEspaceView";

export default async function MonEspacePage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div className="p-6 text-mv-ink-soft">Aucun restaurant sélectionné.</div>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-6 text-mv-ink-soft">Vous devez être connecté·e.</div>;
  }

  const employee = await getEmployeeByLinkedUser(membership.restaurantId, user.id);
  if (!employee) {
    return (
      <MonEspaceView
        employee={null}
        shifts={[]}
        reviews={[]}
        tasks={[]}
        upcomingShifts={[]}
        paySummary={null}
        restaurantId={membership.restaurantId}
      />
    );
  }

  const { start, end } = getPayPeriodRange("week");
  const [shifts, reviews, tasks, upcomingShifts, paySummary] = await Promise.all([
    getEmployeeShifts(employee.id),
    getEmployeeReviews(employee.id),
    getEmployeeTasks(employee.id),
    getUpcomingShiftsForEmployee(employee.id),
    getEmployeePaySummary(employee.id, start, end),
  ]);

  return (
    <MonEspaceView
      employee={employee}
      shifts={shifts}
      reviews={reviews}
      tasks={tasks}
      upcomingShifts={upcomingShifts}
      paySummary={paySummary}
      restaurantId={membership.restaurantId}
    />
  );
}
