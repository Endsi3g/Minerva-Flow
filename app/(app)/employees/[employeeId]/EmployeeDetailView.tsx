"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { LogShiftForm, NewReviewForm, NewTaskForm, StarRating } from "../EmployeesView";
import { setEmployeeActiveAction, setEmployeeTaskStatusAction } from "../actions";
import type { Employee, EmployeeReview, EmployeeShift, EmployeeTask } from "@/lib/types";
import { ArrowLeft, Phone, Mail, DollarSign, Calendar, Award, Printer, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function EmployeeDetailView({
  employee: initialEmployee,
  initialShifts,
  initialReviews,
  initialTasks,
  restaurantId,
}: {
  employee: Employee;
  initialShifts: EmployeeShift[];
  initialReviews: EmployeeReview[];
  initialTasks: EmployeeTask[];
  restaurantId: string;
}) {
  const { role } = useApp();
  const tTasks = useTranslations("EmployeeTasks");
  const [employee, setEmployee] = useState(initialEmployee);
  const [shifts, setShifts] = useState(initialShifts);
  const [reviews, setReviews] = useState(initialReviews);
  const [tasks, setTasks] = useState(initialTasks);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = role === "owner" || role === "manager";
  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0);
  const lateCount = shifts.filter((s) => s.wasLate).length;
  const punctuality = shifts.length > 0 ? Math.round(((shifts.length - lateCount) / shifts.length) * 100) : null;

  async function handleToggleActive() {
    setIsSubmitting(true);
    try {
      const nextActive = !employee.active;
      const ok = await setEmployeeActiveAction(restaurantId, employee.id, nextActive);
      if (ok) {
        setEmployee((prev) => ({ ...prev, active: nextActive }));
        toast.success(`Employé marqué comme ${nextActive ? "actif" : "inactif"}.`);
      } else {
        toast.error("Impossible de modifier le statut.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTask(task: EmployeeTask, done: boolean) {
    const nextStatus = done ? "fait" : "a_faire";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    const ok = await setEmployeeTaskStatusAction(restaurantId, task.id, nextStatus);
    if (!ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      toast.error("Impossible de mettre à jour la tâche.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl w-full">
      <div className="mb-4">
        <Button href="/employees" variant="ghost" size="sm" className="gap-1.5 text-mv-ink-soft">
          <ArrowLeft size={14} /> Retour aux employés
        </Button>
      </div>

      <PageHeader
        eyebrow="Fiche employé"
        title={employee.fullName}
        description={`${employee.roleTitle} · Membre de l'équipe`}
        action={
          <Badge tone={employee.active ? "green" : "neutral"} className="text-sm px-2.5 py-0.5">
            {employee.active ? "Actif" : "Inactif"}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left Column: Profile Card & Stats */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader eyebrow="Profil" title="Informations générales" />
            <div className="space-y-4 text-[13px]">
              {employee.hourlyWage !== null && (
                <div className="flex items-center gap-2.5 text-mv-ink-soft">
                  <DollarSign size={16} className="text-mv-green-dark" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Taux horaire</p>
                    <p className="font-medium text-mv-ink">{formatCurrency(employee.hourlyWage)}/h</p>
                  </div>
                </div>
              )}

              {employee.contactPhone && (
                <div className="flex items-center gap-2.5 text-mv-ink-soft">
                  <Phone size={16} className="text-mv-ink-faint" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Téléphone</p>
                    <p className="font-medium text-mv-ink">{employee.contactPhone}</p>
                  </div>
                </div>
              )}

              {employee.contactEmail && (
                <div className="flex items-center gap-2.5 text-mv-ink-soft">
                  <Mail size={16} className="text-mv-ink-faint" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Courriel</p>
                    <p className="font-medium text-mv-ink">{employee.contactEmail}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-mv-ink-soft">
                <Calendar size={16} className="text-mv-ink-faint" />
                <div>
                  <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Membre depuis</p>
                  <p className="font-medium text-mv-ink">{formatDate(employee.createdAt.slice(0, 10))}</p>
                </div>
              </div>

              {employee.description && (
                <div className="border-t border-mv-border-soft pt-3">
                  <p className="text-[11px] font-semibold uppercase text-mv-ink-faint mb-1">Notes / Bio</p>
                  <p className="leading-relaxed text-mv-ink-soft">{employee.description}</p>
                </div>
              )}
            </div>

            {canManage && (
              <div className="mt-6 border-t border-mv-border-soft pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={handleToggleActive}
                  disabled={isSubmitting}
                >
                  {employee.active ? "Désactiver l'employé" : "Activer l'employé"}
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader eyebrow="Statistiques" title="Performance de présence" />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-xl bg-mv-cream-soft p-3.5 text-center">
                <Clock size={20} className="mx-auto mb-1 text-mv-ink-soft" />
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Heures (total)</p>
                <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">
                  {totalHours.toFixed(1)}h
                </p>
              </div>
              <div className="rounded-xl bg-mv-cream-soft p-3.5 text-center">
                <Award size={20} className="mx-auto mb-1 text-mv-green-dark" />
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Ponctualité</p>
                <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">
                  {punctuality === null ? "—" : `${punctuality}%`}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Shifts & Reviews */}
        <div className="md:col-span-8 space-y-6">
          {/* Shifts Section */}
          <Card>
            <CardHeader eyebrow="Journal" title="Historique des quarts" />
            <div className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {shifts.length === 0 ? (
                  <p className="text-[13px] text-mv-ink-faint py-2">Aucun quart enregistré pour l'instant.</p>
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

              {canManage && (
                <div className="border-t border-mv-border-soft pt-4">
                  <h3 className="mb-3 text-[13px] font-bold text-mv-ink">Enregistrer un nouveau quart</h3>
                  <LogShiftForm
                    employeeId={employee.id}
                    restaurantId={restaurantId}
                    onLogged={(s) => setShifts((prev) => [s, ...prev])}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Tasks Section */}
          <Card>
            <CardHeader eyebrow={tTasks("eyebrow")} title={tTasks("title")} />
            <div className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <p className="text-[13px] text-mv-ink-faint py-2">{tTasks("empty")}</p>
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
                        <p className={tk.status === "fait" ? "font-medium text-mv-ink-faint line-through" : "font-medium text-mv-ink"}>
                          {tk.title}
                        </p>
                        {tk.description && <p className="text-[12px] text-mv-ink-soft">{tk.description}</p>}
                      </div>
                    </label>
                  ))
                )}
              </div>

              {canManage && (
                <div className="border-t border-mv-border-soft pt-4">
                  <h3 className="mb-3 text-[13px] font-bold text-mv-ink">{tTasks("assignNew")}</h3>
                  <NewTaskForm
                    employeeId={employee.id}
                    restaurantId={restaurantId}
                    employeeName={employee.fullName}
                    onCreated={(newTask) => setTasks((prev) => [newTask, ...prev])}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Performance Reviews Section */}
          <Card>
            <CardHeader eyebrow="Revues" title="Revues de performance" />
            <div className="space-y-4">
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
                          <strong className="text-mv-ink">Axes d'amélioration :</strong> {r.improvements}
                        </p>
                      )}
                      {r.attributedRevenue !== null && (
                        <p className="text-[12.5px] font-medium text-mv-green-dark">
                          Chiffre d'affaires généré : {formatCurrency(r.attributedRevenue)}
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

              {canManage && (
                <div className="border-t border-mv-border-soft pt-4">
                  <h3 className="mb-3 text-[13px] font-bold text-mv-ink">Publier une nouvelle revue</h3>
                  <NewReviewForm
                    employee={employee}
                    restaurantId={restaurantId}
                    onCreated={(r) => setReviews((prev) => [r, ...prev])}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
