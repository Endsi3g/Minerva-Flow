"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/minerva/FormField";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StarRating } from "../employees/EmployeesView";
import { setEmployeeTaskStatusAction } from "../employees/actions";
import { clockInAction, clockOutAction, getMyPaySummaryAction } from "./actions";
import type {
  Employee,
  EmployeeReview,
  EmployeeShift,
  EmployeeTask,
  ShiftSchedule,
} from "@/lib/types";
import type { EmployeePaySummary, PayPeriod } from "@/lib/data/employees";
import { Clock, Award, Printer, LogIn, LogOut, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const PERIOD_LABELS: Record<PayPeriod, string> = {
  week: "Cette semaine",
  biweekly: "2 dernières semaines",
  month: "Ce mois-ci",
};

function ClockInOutCard({ shifts, onShiftsChange }: { shifts: EmployeeShift[]; onShiftsChange: (s: EmployeeShift[]) => void }) {
  const openShift = shifts.find((s) => s.clockIn && !s.clockOut) ?? null;
  const [pending, setPending] = useState(false);

  async function handleClockIn() {
    setPending(true);
    const shift = await clockInAction();
    setPending(false);
    if (shift) {
      onShiftsChange([shift, ...shifts]);
      toast.success("Quart commencé.");
    } else {
      toast.error("Impossible de pointer. Vous avez peut-être déjà un quart en cours.");
    }
  }

  async function handleClockOut() {
    if (!openShift) return;
    setPending(true);
    const updated = await clockOutAction(openShift.id);
    setPending(false);
    if (updated) {
      onShiftsChange(shifts.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(`Quart terminé — ${updated.hoursWorked.toFixed(2)} heures.`);
    } else {
      toast.error("Impossible de terminer le quart.");
    }
  }

  return (
    <Card className="mb-6 flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Pointage</p>
        <p className="mt-0.5 font-display text-[16px] font-medium text-mv-ink">
          {openShift
            ? `En quart depuis ${new Date(openShift.clockIn!).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`
            : "Aucun quart en cours"}
        </p>
      </div>
      {openShift ? (
        <Button onClick={handleClockOut} disabled={pending} variant="secondary">
          <LogOut data-icon="inline-start" /> Terminer mon quart
        </Button>
      ) : (
        <Button onClick={handleClockIn} disabled={pending}>
          <LogIn data-icon="inline-start" /> Pointer
        </Button>
      )}
    </Card>
  );
}

function PaySummaryCard({ initialSummary }: { initialSummary: EmployeePaySummary | null }) {
  const [period, setPeriod] = useState<PayPeriod>("week");
  const [summary, setSummary] = useState<EmployeePaySummary | null>(initialSummary);
  const [loading, setLoading] = useState(false);

  async function handlePeriodChange(next: PayPeriod) {
    setPeriod(next);
    setLoading(true);
    const result = await getMyPaySummaryAction(next);
    setSummary(result);
    setLoading(false);
  }

  return (
    <Card className="text-center">
      <div className="mb-2 flex items-center justify-center gap-2">
        <Clock size={16} className="text-mv-ink-soft" />
        <Select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value as PayPeriod)}
          className="h-7 w-auto border-0 bg-transparent px-1 text-[11px] font-semibold uppercase text-mv-ink-faint"
        >
          {(Object.keys(PERIOD_LABELS) as PayPeriod[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </Select>
      </div>
      <p className="font-display text-[20px] font-medium text-mv-ink">
        {loading ? "…" : summary ? `${summary.hours.toFixed(1)}h` : "—"}
      </p>
      {summary?.grossPay != null && (
        <p className="mt-0.5 text-[12.5px] font-medium text-mv-green-dark">{formatCurrency(summary.grossPay)}</p>
      )}
    </Card>
  );
}

export function MonEspaceView({
  employee,
  shifts: initialShifts,
  reviews,
  tasks: initialTasks,
  upcomingShifts,
  paySummary: initialPaySummary,
  restaurantId,
}: {
  employee: Employee | null;
  shifts: EmployeeShift[];
  reviews: EmployeeReview[];
  tasks: EmployeeTask[];
  upcomingShifts: ShiftSchedule[];
  paySummary: EmployeePaySummary | null;
  restaurantId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [shifts, setShifts] = useState(initialShifts);

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

  const lateCount = shifts.filter((s) => s.wasLate).length;
  const punctuality = shifts.length > 0 ? Math.round(((shifts.length - lateCount) / shifts.length) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl w-full">
      <PageHeader
        eyebrow="Mon espace"
        title={`Bonjour, ${employee.fullName.split(" ")[0]}`}
        description={`${employee.roleTitle} · Vos quarts de travail et vos revues de performance`}
      />

      <ClockInOutCard shifts={shifts} onShiftsChange={setShifts} />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <PaySummaryCard initialSummary={initialPaySummary} />
        <Card className="text-center">
          <Award size={20} className="mx-auto mb-1 text-mv-green-dark" />
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Ponctualité</p>
          <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">
            {punctuality === null ? "—" : `${punctuality}%`}
          </p>
        </Card>
      </div>

      <div className="space-y-6">
        {upcomingShifts.length > 0 && (
          <Card>
            <CardHeader eyebrow="Horaire" title="Mes prochains quarts" />
            <div className="space-y-2">
              {upcomingShifts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2 text-[13px]"
                >
                  <span className="flex items-center gap-2 font-medium text-mv-ink">
                    <CalendarClock size={14} className="text-mv-ink-faint" />
                    {formatDate(s.shiftDate)}
                  </span>
                  <span className="text-mv-ink-soft">
                    {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                    {s.positionLabel ? ` · ${s.positionLabel}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

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
