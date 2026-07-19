"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  createShiftScheduleAction,
  updateShiftScheduleStatusAction,
  deleteShiftScheduleAction,
  getEmployeeUpcomingShiftsAction,
  sendScheduleEmailAction,
  createScheduleShareLinkAction,
} from "./actions";
import { useApp } from "@/lib/app-context";
import { formatDate } from "@/lib/utils";
import type { Employee, ShiftSchedule, ShiftScheduleStatus } from "@/lib/types";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, Mail, Link2, Check, Copy } from "lucide-react";
import { GoogleCalendarCard } from "@/components/minerva/GoogleCalendarCard";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

const statusTone: Record<ShiftScheduleStatus, "green" | "amber" | "neutral"> = {
  planifie: "amber",
  confirme: "green",
  annule: "neutral",
};

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function weekDates(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + deltaWeeks * 7);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

function NewShiftModal({
  restaurantId,
  employees,
  defaultEmployeeId,
  defaultDate,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  employees: Employee[];
  defaultEmployeeId: string;
  defaultDate: string;
  open: boolean;
  onClose: () => void;
  onCreated: (s: ShiftSchedule) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const shift = await createShiftScheduleAction(restaurantId, {
        employeeId: String(form.get("employeeId") ?? ""),
        shiftDate: String(form.get("shiftDate") ?? defaultDate),
        startTime: String(form.get("startTime") ?? "09:00"),
        endTime: String(form.get("endTime") ?? "17:00"),
        positionLabel: String(form.get("positionLabel") ?? "") || null,
      });
      if (shift) {
        onCreated(shift);
        onClose();
      } else {
        toast.error("La planification du quart a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Planifier un quart" description="Employé, date et plage horaire.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Employé">
          <Select name="employeeId" defaultValue={defaultEmployeeId} required>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} — {e.roleTitle}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input name="shiftDate" type="date" defaultValue={defaultDate} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début">
            <Input name="startTime" type="time" defaultValue="09:00" required />
          </Field>
          <Field label="Fin">
            <Input name="endTime" type="time" defaultValue="17:00" required />
          </Field>
        </div>
        <Field label="Poste" hint="Optionnel — ex : cuisine, service, caisse">
          <Input name="positionLabel" placeholder="Ex : Service" />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Planification…" : "Planifier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EmployeeScheduleModal({
  restaurantId,
  employee,
  open,
  onClose,
}: {
  restaurantId: string;
  employee: Employee;
  open: boolean;
  onClose: () => void;
}) {
  const [shifts, setShifts] = useState<ShiftSchedule[] | null>(null);
  const [sending, setSending] = useState(false);
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShifts(null);
    setLink(null);
    getEmployeeUpcomingShiftsAction(employee.id).then(setShifts);
  }, [open, employee.id]);

  async function handleSendEmail() {
    setSending(true);
    try {
      const result = await sendScheduleEmailAction(restaurantId, employee.id);
      if (result.ok) toast.success(`Horaire envoyé à ${employee.contactEmail}.`);
      else toast.error(result.error ?? "L'envoi a échoué.");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateLink() {
    setLinking(true);
    try {
      const token = await createScheduleShareLinkAction(restaurantId, employee.id);
      if (token) setLink(`${window.location.origin}/h/${token}`);
      else toast.error("La création du lien a échoué.");
    } finally {
      setLinking(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title={employee.fullName} description="Ses prochains quarts, à envoyer ou partager.">
      <div className="space-y-4">
        {shifts === null ? (
          <p className="text-[12.5px] text-mv-ink-faint">Chargement…</p>
        ) : shifts.length === 0 ? (
          <p className="text-[12.5px] text-mv-ink-faint">Aucun quart à venir pour cet employé.</p>
        ) : (
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {shifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2">
                <span className="text-[12.5px] font-medium text-mv-ink">{formatDate(s.shiftDate)}</span>
                <span className="text-[12.5px] text-mv-ink-soft">
                  {formatTime(s.startTime)}–{formatTime(s.endTime)}
                  {s.positionLabel ? ` · ${s.positionLabel}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-mv-border-soft pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSendEmail}
            disabled={sending || !employee.contactEmail}
          >
            <Mail size={14} /> {sending ? "Envoi…" : `Envoyer par courriel${employee.contactEmail ? "" : " (aucun courriel enregistré)"}`}
          </Button>

          {!link ? (
            <Button variant="secondary" size="sm" onClick={handleCreateLink} disabled={linking}>
              <Link2 size={14} /> {linking ? "Génération…" : "Générer un lien à partager"}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-3 py-2">
              <p className="flex-1 truncate text-[12px] text-mv-ink-soft">{link}</p>
              <button
                onClick={handleCopy}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
                aria-label="Copier le lien"
              >
                {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function HoraireView({
  restaurantId,
  initialEmployees,
  initialShifts,
  initialWeekStart,
}: {
  restaurantId: string | null;
  initialEmployees: Employee[];
  initialShifts: ShiftSchedule[];
  initialWeekStart: string;
}) {
  const { role } = useApp();
  const [employees] = useState(initialEmployees);
  const [shifts, setShifts] = useState(initialShifts);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [modalTarget, setModalTarget] = useState<{ employeeId: string; date: string } | null>(null);
  const [scheduleEmployee, setScheduleEmployee] = useState<Employee | null>(null);

  const canManage = role === "owner" || role === "manager";
  const days = weekDates(weekStart);

  function shiftsFor(employeeId: string, date: string) {
    return shifts.filter((s) => s.employeeId === employeeId && s.shiftDate === date);
  }

  async function handleToggleStatus(shift: ShiftSchedule) {
    if (!restaurantId) return;
    const next: ShiftScheduleStatus = shift.status === "confirme" ? "planifie" : "confirme";
    const ok = await updateShiftScheduleStatusAction(restaurantId, shift.id, next);
    if (ok) setShifts((prev) => prev.map((s) => (s.id === shift.id ? { ...s, status: next } : s)));
  }

  async function handleDelete(id: string) {
    if (!restaurantId) return;
    const ok = await deleteShiftScheduleAction(restaurantId, id);
    if (ok) setShifts((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Opérations"
        title="Horaire"
        description="Le calendrier de quarts de votre équipe, semaine par semaine."
      />

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-52 text-center text-[13.5px] font-medium text-mv-ink">
          {formatShortDate(days[0])} — {formatShortDate(days[6])}
        </span>
        <button
          onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucun employé actif"
          description="Ajoutez des employés dans la section Employés pour pouvoir planifier des quarts."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-mv-border">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-mv-border bg-mv-cream-soft">
                <th className="sticky left-0 z-10 min-w-40 border-r border-mv-border bg-mv-cream-soft px-3 py-2.5 text-left font-semibold text-mv-ink-soft">
                  Employé
                </th>
                {days.map((d, i) => (
                  <th key={d} className="min-w-32 px-2 py-2.5 text-center font-semibold text-mv-ink-soft">
                    {DAY_LABELS[i]} <span className="font-normal text-mv-ink-faint">{formatShortDate(d)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-mv-border-soft last:border-b-0">
                  <td className="sticky left-0 z-10 border-r border-mv-border bg-mv-surface px-3 py-2 font-medium text-mv-ink">
                    <button
                      onClick={() => setScheduleEmployee(emp)}
                      className="text-left transition-colors hover:text-mv-green-dark"
                    >
                      {emp.fullName}
                    </button>
                    <p className="text-[11px] font-normal text-mv-ink-faint">{emp.roleTitle}</p>
                  </td>
                  {days.map((d) => {
                    const cellShifts = shiftsFor(emp.id, d);
                    return (
                      <td
                        key={d}
                        className={cn(
                          "min-h-14 px-1.5 py-1.5 align-top",
                          canManage && "cursor-pointer hover:bg-mv-ink/[0.02]"
                        )}
                        onClick={() => canManage && cellShifts.length === 0 && setModalTarget({ employeeId: emp.id, date: d })}
                      >
                        <div className="flex flex-col gap-1">
                          {cellShifts.map((s) => (
                            <div
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canManage) handleToggleStatus(s);
                              }}
                              className={cn(
                                "group flex items-center justify-between gap-1 rounded-md px-1.5 py-1",
                                canManage && "cursor-pointer"
                              )}
                            >
                              <Badge tone={statusTone[s.status]} className="text-[10.5px]">
                                {formatTime(s.startTime)}–{formatTime(s.endTime)}
                                {s.positionLabel ? ` · ${s.positionLabel}` : ""}
                              </Badge>
                              {canManage && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(s.id);
                                  }}
                                  aria-label="Retirer le quart"
                                  className="hidden text-mv-ink-faint hover:text-mv-red group-hover:block"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                          {canManage && cellShifts.length === 0 && (
                            <span className="flex items-center justify-center py-2 text-mv-ink-faint opacity-0 hover:opacity-100">
                              <Plus size={13} />
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 max-w-md">
        <GoogleCalendarCard />
      </div>

      {restaurantId && modalTarget && (
        <NewShiftModal
          restaurantId={restaurantId}
          employees={employees}
          defaultEmployeeId={modalTarget.employeeId}
          defaultDate={modalTarget.date}
          open={Boolean(modalTarget)}
          onClose={() => setModalTarget(null)}
          onCreated={(s) => setShifts((prev) => [...prev, s])}
        />
      )}

      {restaurantId && scheduleEmployee && (
        <EmployeeScheduleModal
          restaurantId={restaurantId}
          employee={scheduleEmployee}
          open={Boolean(scheduleEmployee)}
          onClose={() => setScheduleEmployee(null)}
        />
      )}
    </div>
  );
}
