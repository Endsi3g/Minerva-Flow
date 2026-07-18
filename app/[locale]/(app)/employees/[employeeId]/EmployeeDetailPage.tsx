"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmployeeDetail } from "../EmployeesView";
import { setEmployeeActiveAction } from "../actions";
import type { Employee } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function EmployeeDetailPage({
  employee: initialEmployee,
  restaurantId,
}: {
  employee: Employee;
  restaurantId: string;
}) {
  const [employee, setEmployee] = useState(initialEmployee);

  async function handleToggleActive(id: string, active: boolean) {
    const ok = await setEmployeeActiveAction(restaurantId, id, active);
    if (ok) setEmployee((prev) => ({ ...prev, active }));
  }

  return (
    <div>
      <Link
        href="/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> Retour aux employés
      </Link>
      <PageHeader eyebrow="Équipe" title={employee.fullName} description={employee.roleTitle} />
      <div className="max-w-xl">
        <EmployeeDetail employee={employee} restaurantId={restaurantId} onToggleActive={handleToggleActive} />
      </div>
    </div>
  );
}
