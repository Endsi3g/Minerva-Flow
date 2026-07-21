"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { InviteEmployeeModal, LogShiftForm, NewReviewForm, NewTaskForm, StarRating, PaySummaryInline } from "../EmployeesView";
import { setEmployeeActiveAction, setEmployeeTaskStatusAction, clockInEmployeeAction, clockOutEmployeeAction } from "../actions";
import type { Employee, EmployeeReview, EmployeeShift, EmployeeTask } from "@/lib/types";
import { ArrowLeft, Phone, Mail, DollarSign, Calendar, Award, Printer, Clock, KeyRound, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
  const t = useTranslations("employeeDetail");
  const te = useTranslations("employees");
  const td = useTranslations("employees.detail");
  const tr = useTranslations("employees.reviewForm");
  const { role } = useApp();
  const [employee, setEmployee] = useState(initialEmployee);
  const [shifts, setShifts] = useState(initialShifts);
  const [reviews, setReviews] = useState(initialReviews);
  const [tasks, setTasks] = useState(initialTasks);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [clockPending, setClockPending] = useState(false);

  const canManage = role === "owner" || role === "manager";
  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0);
  const lateCount = shifts.filter((s) => s.wasLate).length;
  const punctuality = shifts.length > 0 ? Math.round(((shifts.length - lateCount) / shifts.length) * 100) : null;
  const openShift = shifts.find((s) => s.clockIn && !s.clockOut) ?? null;

  async function handleManagerClockIn() {
    setClockPending(true);
    const shift = await clockInEmployeeAction(restaurantId, employee.id);
    setClockPending(false);
    if (shift) {
      setShifts((prev) => [shift, ...prev]);
      toast.success(`${employee.fullName} a été pointé·e.`);
    } else {
      toast.error("Impossible de pointer.");
    }
  }

  async function handleManagerClockOut() {
    if (!openShift) return;
    setClockPending(true);
    const updated = await clockOutEmployeeAction(restaurantId, openShift.id);
    setClockPending(false);
    if (updated) {
      setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(`Quart de ${employee.fullName} terminé — ${updated.hoursWorked.toFixed(2)} heures.`);
    } else {
      toast.error("Impossible de dépointer.");
    }
  }

  async function handleToggleActive() {
    setIsSubmitting(true);
    try {
      const nextActive = !employee.active;
      const ok = await setEmployeeActiveAction(restaurantId, employee.id, nextActive);
      if (ok) {
        setEmployee((prev) => ({ ...prev, active: nextActive }));
        toast.success(nextActive ? t("toggleSuccessActive") : t("toggleSuccessInactive"));
      } else {
        toast.error(t("toggleFailed"));
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
          <ArrowLeft size={14} /> {t("backToEmployees")}
        </Button>
      </div>

      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={employee.fullName}
        description={t("teamMember", { role: employee.roleTitle })}
        action={
          <Badge tone={employee.active ? "green" : "neutral"} className="text-sm px-2.5 py-0.5">
            {employee.active ? te("active") : te("inactive")}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left Column: Profile Card & Stats */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader eyebrow={t("profileEyebrow")} title={t("profileTitle")} />
            <div className="space-y-4 text-[13px]">
              {employee.hourlyWage !== null && (
                <div className="flex items-center gap-2.5 text-mv-ink-soft">
                  <DollarSign size={16} className="text-mv-green-dark" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{t("hourlyRate")}</p>
                    <p className="font-medium text-mv-ink">{formatCurrency(employee.hourlyWage)}/h</p>
                    <PaySummaryInline restaurantId={restaurantId} employeeId={employee.id} />
                  </div>
                </div>
              )}

              {employee.contactPhone && (
                <div className="flex items-center gap-2.5 text-mv-ink-soft">
                  <Phone size={16} className="text-mv-ink-faint" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{t("phone")}</p>
                    <p className="font-medium text-mv-ink">{employee.contactPhone}</p>
                  </div>
                </div>
              )}

              {employee.contactEmail && (
                <div className="flex items-center gap-2.5 text-mv-ink-soft">
                  <Mail size={16} className="text-mv-ink-faint" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{t("email")}</p>
                    <p className="font-medium text-mv-ink">{employee.contactEmail}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-mv-ink-soft">
                <Calendar size={16} className="text-mv-ink-faint" />
                <div>
                  <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{t("memberSince")}</p>
                  <p className="font-medium text-mv-ink">{formatDate(employee.createdAt.slice(0, 10))}</p>
                </div>
              </div>

              {employee.description && (
                <div className="border-t border-mv-border-soft pt-3">
                  <p className="text-[11px] font-semibold uppercase text-mv-ink-faint mb-1">{t("notesBio")}</p>
                  <p className="leading-relaxed text-mv-ink-soft">{employee.description}</p>
                </div>
              )}
            </div>

            {canManage && (
              <div className="mt-6 space-y-2 border-t border-mv-border-soft pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={handleToggleActive}
                  disabled={isSubmitting}
                >
                  {employee.active ? t("deactivate") : t("activate")}
                </Button>

                {employee.linkedUserId ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-mv-green/10 py-2 text-[12.5px] font-medium text-mv-green-dark">
                    <CheckCircle2 size={14} /> Compte connecté
                  </div>
                ) : (
                  <>
                    {employee.contactEmail ? (
                      <Button size="sm" variant="secondary" className="w-full gap-1.5" onClick={() => setInviteOpen(true)}>
                        <KeyRound size={14} /> Inviter à se connecter
                      </Button>
                    ) : (
                      <p className="text-center text-[11.5px] text-mv-ink-faint">
                        Ajoutez un courriel à cette fiche pour permettre la connexion.
                      </p>
                    )}
                    {/* Pas de compte de connexion — le gérant pointe pour l'employé. */}
                    {openShift ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full gap-1.5"
                        onClick={handleManagerClockOut}
                        disabled={clockPending}
                      >
                        <LogOut size={14} /> Dépointer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full gap-1.5"
                        onClick={handleManagerClockIn}
                        disabled={clockPending}
                      >
                        <LogIn size={14} /> Pointer
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>

          {canManage && (
            <InviteEmployeeModal
              employee={employee}
              restaurantId={restaurantId}
              open={inviteOpen}
              onClose={() => setInviteOpen(false)}
            />
          )}

          <Card>
            <CardHeader eyebrow={t("statsEyebrow")} title={t("statsTitle")} />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-xl bg-mv-cream-soft p-3.5 text-center">
                <Clock size={20} className="mx-auto mb-1 text-mv-ink-soft" />
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{td("hoursTotal")}</p>
                <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">
                  {totalHours.toFixed(1)}h
                </p>
              </div>
              <div className="rounded-xl bg-mv-cream-soft p-3.5 text-center">
                <Award size={20} className="mx-auto mb-1 text-mv-green-dark" />
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{td("punctuality")}</p>
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
            <CardHeader eyebrow={t("shiftsEyebrow")} title={t("shiftsTitle")} />
            <div className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {shifts.length === 0 ? (
                  <p className="text-[13px] text-mv-ink-faint py-2">{t("noShiftsYet")}</p>
                ) : (
                  shifts.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2 text-[13px]"
                    >
                      <span className="font-medium text-mv-ink">{formatDate(s.shiftDate)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-mv-green-dark">{t("hoursSuffix", { hours: s.hoursWorked })}</span>
                        {s.wasLate && <Badge tone="red">{t("late")}</Badge>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canManage && (
                <div className="border-t border-mv-border-soft pt-4">
                  <h3 className="mb-3 text-[13px] font-bold text-mv-ink">{t("logNewShift")}</h3>
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
            <CardHeader eyebrow="Suivi" title="Tâches assignées" />
            <div className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <p className="text-[13px] text-mv-ink-faint py-2">Aucune tâche assignée pour l'instant.</p>
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
                  <h3 className="mb-3 text-[13px] font-bold text-mv-ink">Assigner une nouvelle tâche</h3>
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
            <CardHeader eyebrow={td("reviewsEyebrow")} title={td("reviewsTitle")} />
            <div className="space-y-4">
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-[13px] text-mv-ink-faint py-2">{t("noReviewsYet")}</p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-mv-border p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-mv-ink">
                          {t("periodRange", { start: formatDate(r.periodStart), end: formatDate(r.periodEnd) })}
                        </p>
                        <StarRating value={r.rating} />
                      </div>
                      {r.raiseRecommended && (
                        <Badge tone="green" className="mt-1">
                          {tr("raiseRecommended")}
                        </Badge>
                      )}
                      {r.strengths && (
                        <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                          <strong className="text-mv-ink">{t("strengthsLabel")}</strong> {r.strengths}
                        </p>
                      )}
                      {r.improvements && (
                        <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                          <strong className="text-mv-ink">{t("improvementsLabel")}</strong> {r.improvements}
                        </p>
                      )}
                      {r.attributedRevenue !== null && (
                        <p className="text-[12.5px] font-medium text-mv-green-dark">
                          {t("revenueGenerated", { amount: formatCurrency(r.attributedRevenue) })}
                        </p>
                      )}
                      <div className="flex items-center justify-between border-t border-mv-border-soft pt-2 mt-2">
                        <span className="text-[11px] text-mv-ink-faint">{t("byReviewer", { name: r.reviewerName })}</span>
                        <Link
                          href={`/employees/${employee.id}/reviews/${r.id}`}
                          className="flex items-center gap-1.5 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                        >
                          <Printer size={12} /> {td("viewPrint")}
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canManage && (
                <div className="border-t border-mv-border-soft pt-4">
                  <h3 className="mb-3 text-[13px] font-bold text-mv-ink">{t("publishNewReview")}</h3>
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
