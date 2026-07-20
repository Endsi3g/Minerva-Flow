import { getEmployeeById, getEmployeeShifts, getEmployeeReviews } from "@/lib/data/employees";
import { getEmployeeTasks } from "@/lib/data/employee-tasks";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { EmployeeDetailView } from "./EmployeeDetailView";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    const t = await getTranslations("common");
    return <div className="p-6 text-mv-ink-soft">{t("noRestaurantSelected")}</div>;
  }

  const [employee, shifts, reviews, tasks] = await Promise.all([
    getEmployeeById(employeeId),
    getEmployeeShifts(employeeId),
    getEmployeeReviews(employeeId),
    getEmployeeTasks(employeeId),
  ]);

  if (!employee || employee.restaurantId !== restaurantId) {
    notFound();
  }

  return (
    <EmployeeDetailView
      employee={employee}
      initialShifts={shifts}
      initialReviews={reviews}
      initialTasks={tasks}
      restaurantId={restaurantId}
    />
  );
}
