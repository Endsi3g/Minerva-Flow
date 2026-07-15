import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getEmployees } from "@/lib/data/employees";
import { EmployeesView } from "./EmployeesView";

export default async function EmployeesPage() {
  const restaurantId = await getCurrentRestaurantId();
  const employees = restaurantId ? await getEmployees(restaurantId) : [];

  return <EmployeesView restaurantId={restaurantId} employees={employees} />;
}
