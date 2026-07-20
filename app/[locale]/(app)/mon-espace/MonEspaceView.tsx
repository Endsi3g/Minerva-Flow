"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StarRating } from "../employees/EmployeesView";
import { setEmployeeTaskStatusAction } from "../employees/actions";
import type { Employee, EmployeeReview, EmployeeShift, EmployeeTask } from "@/lib/types";
import { Clock, Award, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function MonEspaceView({
  employee,
  shifts,
  reviews,
  tasks: initialTasks,
  restaurantId,
}: {
  employee: Employee | null;
  shifts: EmployeeShift[];
  reviews: EmployeeReview[];
  tasks: EmployeeTask[];
  restaurantId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);

  async function handleToggleTask(task: EmployeeTask, done: boolean) {
    const nextStatus = done ? "fait" : "a_faire";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    const ok = await setEmployeeTaskStatusAction(restaurantId, task.id, nextStatus);
    if (!ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      toast.error("Impossible de mettre à jour la tâche.");
    }
  }

  if (!employee) {
    return (
      <div className="mx-auto max-w-3xl w-full">
        <PageHeader
          eyebrow="Mon espace"
          title="Mon espace"
          description="Vos quarts de travail et vos revues de performance."
        />
        <Card>
          <p className="text-[13px] text-mv-ink-soft">
            Aucune fiche employé n&apos;est associée à votre compte pour l&apos;instant. Demandez à votre
            gestionnaire de vous lier depuis la fiche employé correspondante.
          </p>
        </Card>
      </div>
    );
  }

  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0);
  const lateCount = shifts.filter((s) => s.wasLate).length;
  const punctuality = shifts.length > 0 ? Math.round(((shifts.length - lateCount) / shifts.length) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl w-full">
      <PageHeader
        eyebrow="Mon espace"
        title={`Bonjour, ${employee.fullName.split(" ")[0]}`}
        description={`${employee.roleTitle} · Vos quarts de travail et vos revues de performance`}
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="text-center">
          <Clock size={20} className="mx-auto mb-1 text-mv-ink-soft" />
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Heures (total)</p>
          <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">{totalHours.toFixed(1)}h</p>
        </Card>
        <Card className="text-center">
          <Award size={20} className="mx-auto mb-1 text-mv-green-dark" />
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Ponctualité</p>
          <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">
            {punctuality === null ? "—" : `${punctuality}%`}
          </p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader eyebrow="Suivi" title="Mes tâches" />
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-[13px] text-mv-ink-faint py-2">Aucune tâche assignée pour l&apos;instant.</p>
            ) : (
              tasks.map((tk) => (
                <label
                  key={tk.id}
                  className="flex items-start gap-2.5 rounded-lg border border-mv-border-soft px-3 py-2 text-[13px]"
                >
                  <Checkbox
                    checked={tk.status === "fait"}
                    onCheckedChange={(checked) => handleToggleTask(tk, Boolean(checked))}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p
                      className={
                        tk.status === "fait" ? "font-medium text-mv-ink-faint line-through" : "font-medium text-mv-ink"
                      }
                    >
                      {tk.title}
                    </p>
                    {tk.description && <p className="text-[12px] text-mv-ink-soft">{tk.description}</p>}
                  </div>
                </label>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Journal" title="Mes quarts de travail" />
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {shifts.length === 0 ? (
              <p className="text-[13px] text-mv-ink-faint py-2">Aucun quart enregistré pour l&apos;instant.</p>
            ) : (
              shifts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2 text-[13px]"
                >
                  <span className="font-medium text-mv-ink">{formatDate(s.shiftDate)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-mv-green-dark">{s.hoursWorked} heures</span>
                    {s.wasLate && <Badge tone="red">En retard</Badge>}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Revues" title="Mes revues de performance" />
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-[13px] text-mv-ink-faint py-2">Aucune revue de performance publiée.</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-mv-border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-mv-ink">
                      Période du {formatDate(r.periodStart)} au {formatDate(r.periodEnd)}
                    </p>
                    <StarRating value={r.rating} />
                  </div>
                  {r.raiseRecommended && (
                    <Badge tone="green" className="mt-1">
                      Augmentation recommandée
                    </Badge>
                  )}
                  {r.strengths && (
                    <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                      <strong className="text-mv-ink">Forces :</strong> {r.strengths}
                    </p>
                  )}
                  {r.improvements && (
                    <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                      <strong className="text-mv-ink">Axes d&apos;amélioration :</strong> {r.improvements}
                    </p>
                  )}
                  {r.attributedRevenue !== null && (
                    <p className="text-[12.5px] font-medium text-mv-green-dark">
                      Chiffre d&apos;affaires généré : {formatCurrency(r.attributedRevenue)}
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t border-mv-border-soft pt-2 mt-2">
                    <span className="text-[11px] text-mv-ink-faint">Par {r.reviewerName}</span>
                    <Link
                      href={`/employees/${employee.id}/reviews/${r.id}`}
                      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                    >
                      <Printer size={12} /> Voir / imprimer
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
