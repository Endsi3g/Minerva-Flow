import { notFound } from "next/navigation";
import { getEmployeeById } from "@/lib/data/employees";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { EmployeeDetailPage } from "./EmployeeDetailPage";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const [employee, restaurantId] = await Promise.all([
    getEmployeeById(employeeId),
    getCurrentRestaurantId(),
  ]);

  if (!employee || !restaurantId) notFound();

  return <EmployeeDetailPage employee={employee} restaurantId={restaurantId} />;
}
