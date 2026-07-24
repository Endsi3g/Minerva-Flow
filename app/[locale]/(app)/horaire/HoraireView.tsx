"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { GoogleCalendarCard } from "@/components/minerva/GoogleCalendarCard";
import { cn, formatDate } from "@/lib/utils";
import {
  createShiftScheduleAction,
  updateShiftScheduleStatusAction,
  deleteShiftScheduleAction,
  getEmployeeUpcomingShiftsAction,
  sendScheduleEmailAction,
  createScheduleShareLinkAction,
  getRangeScheduleAction,
} from "./actions";
import { useApp } from "@/lib/app-context";
import type { Employee, ShiftSchedule, ShiftScheduleStatus } from "@/lib/types";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Mail,
  Link2,
  Check,
  Copy,
  Users,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const statusTone: Record<ShiftScheduleStatus, "green" | "amber" | "neutral"> = {
  planifie: "amber",
  confirme: "green",
  annule: "neutral",
};

const statusLabel: Record<ShiftScheduleStatus, string> = {
  planifie: "Planifié",
  confirme: "Confirmé",
  annule: "Annulé",
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
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

/* ───────────────────── Modals ───────────────────── */

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
        toast.success("Quart planifié avec succès.");
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
    <Modal open={open} onClose={onClose} title={employee.fullName} description="Prochains quarts de l'employé.">
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
            <Mail size={14} /> {sending ? "Envoi…" : `Envoyer par courriel${employee.contactEmail ? "" : " (aucun courriel)"}`}
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

/* Day Detail Modal for Month Calendar Cell Clic */
function DayDetailModal({
  dateIso,
  shifts,
  employeesMap,
  canManage,
  open,
  onClose,
  onAddShift,
  onToggleStatus,
  onDeleteShift,
}: {
  dateIso: string;
  shifts: ShiftSchedule[];
  employeesMap: Map<string, Employee>;
  canManage: boolean;
  open: boolean;
  onClose: () => void;
  onAddShift: (date: string) => void;
  onToggleStatus: (s: ShiftSchedule) => void;
  onDeleteShift: (id: string) => void;
}) {
  const formatted = new Date(dateIso + "T00:00:00").toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatted.charAt(0).toUpperCase() + formatted.slice(1)}
      description={`${shifts.length} quart(s) planifié(s) ce jour-là.`}
    >
      <div className="space-y-4">
        {shifts.length === 0 ? (
          <p className="text-[13px] text-mv-ink-faint py-4 text-center">
            Aucun quart de travail planifié pour cette journée.
          </p>
        ) : (
          <div className="divide-y divide-mv-border-soft max-h-72 overflow-y-auto">
            {shifts.map((s) => {
              const emp = employeesMap.get(s.employeeId);
              return (
                <div key={s.id} className="flex items-center justify-between py-2.5 px-1">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp?.fullName ?? "Employé"} size={32} />
                    <div>
                      <p className="text-[13.5px] font-semibold text-mv-ink">{emp?.fullName ?? "Employé"}</p>
                      <div className="flex items-center gap-2 text-[11.5px] text-mv-ink-soft">
                        <span>{formatTime(s.startTime)} – {formatTime(s.endTime)}</span>
                        {s.positionLabel && (
                          <span className="rounded bg-mv-cream px-1.5 py-0.5 border border-mv-border-soft text-mv-ink-faint">
                            {s.positionLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleStatus(s)}
                          className="text-[11.5px] font-medium text-mv-green-dark hover:underline px-1.5 py-0.5"
                        >
                          Changer
                        </button>
                        <button
                          onClick={() => onDeleteShift(s.id)}
                          className="p-1 text-mv-ink-faint hover:text-mv-red transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-mv-border-soft pt-4">
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onAddShift(dateIso);
              }}
            >
              <Plus size={14} /> Planifier un quart
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────── Main View ───────────────────── */

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
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  
  // Date state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [, startTransition] = useTransition();

  // Modals
  const [modalTarget, setModalTarget] = useState<{ employeeId: string; date: string } | null>(null);
  const [scheduleEmployee, setScheduleEmployee] = useState<Employee | null>(null);
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

  const canManage = role === "owner" || role === "manager";
  const employeesMap = new Map(employees.map((e) => [e.id, e]));

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthLabel = currentDate.toLocaleDateString("fr-CA", {
    month: "long",
    year: "numeric",
  });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function todayMonth() {
    setCurrentDate(new Date());
  }

  // Fetch shifts when Month changes
  useEffect(() => {
    if (!restaurantId) return;
    const startIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    startTransition(async () => {
      const { shifts: fetchedShifts } = await getRangeScheduleAction(restaurantId, startIso, endIso);
      if (fetchedShifts) {
        setShifts((prev) => {
          // Merge fetched into prev without duplicating
          const otherShifts = prev.filter((s) => s.shiftDate < startIso || s.shiftDate > endIso);
          return [...otherShifts, ...fetchedShifts];
        });
      }
    });
  }, [restaurantId, year, month]);

  // Calendar cells calculation
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday = 0, Sunday = 6
  let firstDayDow = firstDayOfMonth.getDay() - 1;
  if (firstDayDow === -1) firstDayDow = 6;

  const calendarDays: { iso: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Prev month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayDow - 1; i >= 0; i--) {
    const dNum = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, dNum);
    const iso = prevDate.toISOString().slice(0, 10);
    calendarDays.push({ iso, dayNum: dNum, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    calendarDays.push({ iso, dayNum: i, isCurrentMonth: true });
  }

  // Next month padding days to complete grid
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const iso = nextDate.toISOString().slice(0, 10);
      calendarDays.push({ iso, dayNum: i, isCurrentMonth: false });
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  function shiftsForDate(iso: string) {
    return shifts.filter((s) => s.shiftDate === iso);
  }

  function shiftsForEmployeeAndDate(employeeId: string, date: string) {
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

  const weekDays = weekDates(weekStart);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Opérations"
        title="Horaire d'Équipe"
        description="Le calendrier interactif de planification des quarts de votre restaurant."
        action={
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-mv-xs">
              <button
                onClick={() => setViewMode("month")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all",
                  viewMode === "month"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                <CalendarIcon size={14} />
                Calendrier
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all",
                  viewMode === "week"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                <Users size={14} />
                Planning Semaine
              </button>
            </div>

            {canManage && (
              <Button
                size="sm"
                onClick={() =>
                  setModalTarget({
                    employeeId: employees[0]?.id ?? "",
                    date: todayIso,
                  })
                }
              >
                <Plus size={15} /> Planifier un quart
              </Button>
            )}
          </div>
        }
      />

      {/* ── View 1: Month Calendar View ── */}
      {viewMode === "month" && (
        <div className="rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="flex items-center justify-between border-b border-mv-border bg-mv-surface px-4 sm:px-5 py-3.5">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[14.5px] sm:text-[16px] font-semibold text-mv-ink">{capitalizedMonth}</span>
              <button
                onClick={todayMonth}
                className="rounded-lg border border-mv-border px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-[11.5px] font-medium text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink transition-colors"
              >
                Aujourd'hui
              </button>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft hover:bg-mv-cream-soft transition-colors"
                >
                  <ChevronLeft size={16} />
                </TooltipTrigger>
                <TooltipContent side="bottom">Mois précédent</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft hover:bg-mv-cream-soft transition-colors"
                >
                  <ChevronRight size={16} />
                </TooltipTrigger>
                <TooltipContent side="bottom">Mois suivant</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Grid Header (Days of week) */}
          <div className="grid grid-cols-7 border-b border-mv-border bg-mv-cream-soft text-center text-[11px] sm:text-[12px] font-semibold text-mv-ink-soft">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 sm:py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-mv-border-soft bg-mv-border-soft">
            {calendarDays.map((cell) => {
              const dayShifts = shiftsForDate(cell.iso);
              const isToday = cell.iso === todayIso;

              return (
                <div
                  key={cell.iso}
                  onClick={() => setSelectedDayIso(cell.iso)}
                  className={cn(
                    "min-h-[75px] sm:min-h-[115px] p-1 sm:p-2 bg-mv-surface flex flex-col justify-between transition-colors relative group cursor-pointer",
                    !cell.isCurrentMonth && "bg-mv-cream/20 opacity-50",
                    isToday && "bg-mv-green/10 border-2 border-mv-green"
                  )}
                >
                  {/* Top day header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-[11px] sm:text-[12px] font-bold h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center transition-colors",
                        isToday
                          ? "bg-mv-green text-white shadow-sm"
                          : cell.isCurrentMonth
                          ? "text-mv-ink"
                          : "text-mv-ink-faint"
                      )}
                    >
                      {cell.dayNum}
                    </span>

                    {dayShifts.length > 0 && (
                      <span className="text-[9.5px] sm:text-[10px] font-semibold text-mv-green-dark bg-mv-green/10 px-1 sm:px-1.5 py-0.5 rounded-full">
                        {dayShifts.length} <span className="hidden sm:inline">quart{dayShifts.length > 1 ? "s" : ""}</span>
                      </span>
                    )}
                  </div>

                  {/* Shifts list inside cell */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {/* Desktop view shift badges */}
                    <div className="hidden sm:block space-y-1">
                      {dayShifts.slice(0, 3).map((s) => {
                        const emp = employeesMap.get(s.employeeId);
                        return (
                          <div
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canManage) handleToggleStatus(s);
                            }}
                            className={cn(
                              "flex items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium border transition-all truncate",
                              s.status === "confirme"
                                ? "bg-mv-green/10 border-mv-green/30 text-mv-green-dark"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-600"
                            )}
                          >
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <span className="font-semibold truncate">{emp?.fullName.split(" ")[0] ?? "Employé"}</span>
                              <span className="text-[10px] opacity-75 shrink-0">{formatTime(s.startTime)}</span>
                            </div>
                            {s.positionLabel && (
                              <span className="text-[9.5px] font-normal opacity-70 truncate hidden xl:inline">
                                {s.positionLabel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {dayShifts.length > 3 && (
                        <p className="text-[10px] font-semibold text-mv-ink-faint text-center pt-0.5">
                          +{dayShifts.length - 3} autre{dayShifts.length - 3 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>

                    {/* Mobile compact shift indicators */}
                    <div className="sm:hidden flex flex-wrap gap-0.5 pt-0.5">
                      {dayShifts.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          className={cn(
                            "h-2 w-2 rounded-full",
                            s.status === "confirme" ? "bg-mv-green" : "bg-amber-500"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Add Shift Plus Button on Hover */}
                  {canManage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalTarget({
                          employeeId: employees[0]?.id ?? "",
                          date: cell.iso,
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-6 w-6 rounded-md bg-mv-surface border border-mv-border text-mv-ink-faint hover:text-mv-green-dark hover:border-mv-green transition-all absolute bottom-1.5 right-1.5"
                      title="Ajouter un quart"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── View 2: Week Planning View ── */}
      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-mv-border bg-mv-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft hover:bg-mv-cream transition-colors"
                >
                  <ChevronLeft size={15} />
                </TooltipTrigger>
                <TooltipContent side="bottom">Semaine précédente</TooltipContent>
              </Tooltip>

              <span className="min-w-44 text-center text-[13.5px] font-semibold text-mv-ink">
                Semaine du {formatShortDate(weekDays[0])} au {formatShortDate(weekDays[6])}
              </span>

              <Tooltip>
                <TooltipTrigger
                  onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft hover:bg-mv-cream transition-colors"
                >
                  <ChevronRight size={15} />
                </TooltipTrigger>
                <TooltipContent side="bottom">Semaine suivante</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {employees.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Aucun employé actif"
              description="Ajoutez des employés dans la section Employés pour pouvoir planifier des quarts."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-mv-border bg-white shadow-mv-sm">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-mv-border bg-mv-cream-soft">
                    <th className="sticky left-0 z-10 min-w-44 border-r border-mv-border bg-mv-cream-soft px-4 py-3 text-left font-semibold text-mv-ink-soft">
                      Employé
                    </th>
                    {weekDays.map((d, i) => (
                      <th key={d} className="min-w-32 px-2 py-3 text-center font-semibold text-mv-ink-soft">
                        {DAY_LABELS[i]} <span className="font-normal text-mv-ink-faint ml-1">{formatShortDate(d)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-mv-border-soft last:border-b-0">
                      <td className="sticky left-0 z-10 border-r border-mv-border bg-mv-surface px-4 py-3 font-medium text-mv-ink">
                        <button
                          onClick={() => setScheduleEmployee(emp)}
                          className="text-left font-semibold text-mv-ink transition-colors hover:text-mv-green-dark"
                        >
                          {emp.fullName}
                        </button>
                        <p className="text-[11px] font-normal text-mv-ink-faint">{emp.roleTitle}</p>
                      </td>
                      {weekDays.map((d) => {
                        const cellShifts = shiftsForEmployeeAndDate(emp.id, d);
                        return (
                          <td
                            key={d}
                            className={cn(
                              "min-h-14 px-1.5 py-2 align-top",
                              canManage && "cursor-pointer hover:bg-mv-cream/40"
                            )}
                            onClick={() => canManage && cellShifts.length === 0 && setModalTarget({ employeeId: emp.id, date: d })}
                          >
                            <div className="flex flex-col gap-1.5">
                              {cellShifts.map((s) => (
                                <div
                                  key={s.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canManage) handleToggleStatus(s);
                                  }}
                                  className={cn(
                                    "group flex items-center justify-between gap-1 rounded-lg px-2 py-1 border transition-all",
                                    s.status === "confirme"
                                      ? "bg-mv-green/10 border-mv-green/30 text-mv-green-dark"
                                      : "bg-amber-50 border-amber-200 text-amber-800"
                                  )}
                                >
                                  <span className="text-[11px] font-medium">
                                    {formatTime(s.startTime)}–{formatTime(s.endTime)}
                                    {s.positionLabel ? ` · ${s.positionLabel}` : ""}
                                  </span>
                                  {canManage && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(s.id);
                                      }}
                                      aria-label="Retirer le quart"
                                      className="hidden text-mv-ink-faint hover:text-mv-red group-hover:block"
                                    >
                                      <X size={12} />
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
        </div>
      )}

      {/* Google Calendar Card */}
      <div className="max-w-md">
        <GoogleCalendarCard />
      </div>

      {/* Modals */}
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

      {selectedDayIso && (
        <DayDetailModal
          dateIso={selectedDayIso}
          shifts={shiftsForDate(selectedDayIso)}
          employeesMap={employeesMap}
          canManage={canManage}
          open={Boolean(selectedDayIso)}
          onClose={() => setSelectedDayIso(null)}
          onAddShift={(date) =>
            setModalTarget({
              employeeId: employees[0]?.id ?? "",
              date,
            })
          }
          onToggleStatus={handleToggleStatus}
          onDeleteShift={handleDelete}
        />
      )}
    </div>
  );
}
