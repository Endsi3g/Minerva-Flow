import { getEmployeeById, getEmployeeShifts, getEmployeeReviews } from "@/lib/data/employees";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { EmployeeDetailView } from "./EmployeeDetailView";
import { notFound } from "next/navigation";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return <div className="p-6 text-mv-ink-soft">Aucun restaurant sélectionné.</div>;
  }

  const [employee, shifts, reviews] = await Promise.all([
    getEmployeeById(employeeId),
    getEmployeeShifts(employeeId),
    getEmployeeReviews(employeeId),
  ]);

  if (!employee || employee.restaurantId !== restaurantId) {
    notFound();
  }

  return (
    <EmployeeDetailView
      employee={employee}
      initialShifts={shifts}
      initialReviews={reviews}
      restaurantId={restaurantId}
    />
  );
}
