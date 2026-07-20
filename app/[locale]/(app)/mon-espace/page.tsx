import { getEmployeeByLinkedUser, getEmployeeShifts, getEmployeeReviews } from "@/lib/data/employees";
import { getEmployeeTasks } from "@/lib/data/employee-tasks";
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
    return <MonEspaceView employee={null} shifts={[]} reviews={[]} tasks={[]} restaurantId={membership.restaurantId} />;
  }

  const [shifts, reviews, tasks] = await Promise.all([
    getEmployeeShifts(employee.id),
    getEmployeeReviews(employee.id),
    getEmployeeTasks(employee.id),
  ]);

  return (
    <MonEspaceView
      employee={employee}
      shifts={shifts}
      reviews={reviews}
      tasks={tasks}
      restaurantId={membership.restaurantId}
    />
  );
}
