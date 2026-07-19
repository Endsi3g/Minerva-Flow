"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { Switch } from "@/components/ui/Switch";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createEmployeeAction,
  setEmployeeActiveAction,
  createEmployeeShiftAction,
  getEmployeeShiftsAction,
  createEmployeeReviewAction,
  getEmployeeReviewsAction,
  createEmployeeTaskAction,
} from "./actions";
import posthog from "posthog-js";
import type { Employee, EmployeeReview, EmployeeShift, EmployeeTask } from "@/lib/types";
import { useApp } from "@/lib/app-context";
import { UserPlus, Star, Printer, Users2, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

export function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={13}
          className={i < value ? "fill-mv-lime-dark text-mv-lime-dark" : "text-mv-ink-mute"}
        />
      ))}
    </span>
  );
}

function NewEmployeeModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (e: Employee) => void;
}) {
  const t = useTranslations("employees.newEmployee");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const wage = String(form.get("hourlyWage") ?? "").trim();
      const employee = await createEmployeeAction(restaurantId, {
        fullName: String(form.get("fullName") ?? ""),
        roleTitle: String(form.get("roleTitle") ?? "") || "Employé",
        hourlyWage: wage ? Number(wage) : null,
        description: String(form.get("description") ?? "") || null,
        contactPhone: String(form.get("contactPhone") ?? "") || null,
        contactEmail: String(form.get("contactEmail") ?? "") || null,
      });
      if (employee) {
        posthog.capture("employee_created", { role_title: employee.roleTitle, has_wage: employee.hourlyWage !== null });
        onCreated(employee);
        onClose();
      } else {
        toast.error(t("createFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("modalTitle")} description={t("modalDescription")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("fullNameLabel")}>
          <Input name="fullName" placeholder={t("fullNamePlaceholder")} required />
        </Field>
        <Field label={t("roleLabel")}>
          <Input name="roleTitle" placeholder={t("rolePlaceholder")} defaultValue="Employé" />
        </Field>
        <Field label={t("wageLabel")} hint={t("optional")}>
          <Input name="hourlyWage" type="number" step="0.01" min="0" placeholder={t("wagePlaceholder")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("phoneLabel")} hint={t("optional")}>
            <Input name="contactPhone" type="tel" placeholder={t("phonePlaceholder")} />
          </Field>
          <Field label={t("emailLabel")} hint={t("optional")}>
            <Input name="contactEmail" type="email" placeholder={t("emailPlaceholder")} />
          </Field>
        </div>
        <Field label={t("descriptionLabel")} hint={t("optional")}>
          <Textarea name="description" placeholder={t("descriptionPlaceholder")} rows={2} />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("adding") : t("add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function LogShiftForm({
  employeeId,
  restaurantId,
  onLogged,
}: {
  employeeId: string;
  restaurantId: string;
  onLogged: (s: EmployeeShift) => void;
}) {
  const t = useTranslations("employees.shiftForm");
  const tCommon = useTranslations("employees.newEmployee");
  const [wasLate, setWasLate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const shift = await createEmployeeShiftAction({
        employeeId,
        restaurantId,
        shiftDate: String(form.get("shiftDate") ?? ""),
        hoursWorked: Number(form.get("hoursWorked") ?? 0),
        wasLate,
        notes: String(form.get("notes") ?? "") || null,
      });
      if (shift) {
        onLogged(shift);
        (e.target as HTMLFormElement).reset();
        setWasLate(false);
      } else {
        toast.error(t("logFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("dateLabel")}>
          <Input name="shiftDate" type="date" required />
        </Field>
        <Field label={t("hoursLabel")}>
          <Input name="hoursWorked" type="number" step="0.25" min="0" required />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[12.5px] font-medium text-mv-ink-soft">
        <Switch checked={wasLate} onCheckedChange={setWasLate} size="sm" className="data-checked:bg-mv-red" />
        {t("late")}
      </label>
      <Field label={t("notesLabel")} hint={tCommon("optional")}>
        <Input name="notes" placeholder={t("notesPlaceholder")} />
      </Field>
      <Button size="sm" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

export function NewTaskForm({
  employeeId,
  restaurantId,
  employeeName,
  onCreated,
}: {
  employeeId: string;
  restaurantId: string;
  employeeName: string;
  onCreated: (t: EmployeeTask) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const task = await createEmployeeTaskAction(
        {
          employeeId,
          restaurantId,
          title: String(form.get("title") ?? "").trim(),
          description: String(form.get("description") ?? "") || null,
        },
        employeeName
      );
      if (task) {
        onCreated(task);
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("L'assignation de la tâche a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Titre">
        <Input name="title" placeholder="Ex : Nettoyer la machine à espresso" required />
      </Field>
      <Field label="Description" hint="Optionnel">
        <Textarea name="description" rows={2} />
      </Field>
      <Button size="sm" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Assignation…" : "Assigner la tâche"}
      </Button>
    </form>
  );
}

export function NewReviewForm({
  employee,
  restaurantId,
  onCreated,
}: {
  employee: Employee;
  restaurantId: string;
  onCreated: (r: EmployeeReview) => void;
}) {
  const t = useTranslations("employees.reviewForm");
  const [rating, setRating] = useState(3);
  const [raiseRecommended, setRaiseRecommended] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const revenue = String(form.get("attributedRevenue") ?? "").trim();
      const review = await createEmployeeReviewAction(
        {
          employeeId: employee.id,
          restaurantId,
          periodStart: String(form.get("periodStart") ?? ""),
          periodEnd: String(form.get("periodEnd") ?? ""),
          rating,
          strengths: String(form.get("strengths") ?? "") || null,
          improvements: String(form.get("improvements") ?? "") || null,
          attributedRevenue: revenue ? Number(revenue) : null,
          raiseRecommended,
        },
        employee.fullName
      );
      if (review) {
        posthog.capture("employee_review_submitted", { rating, raise_recommended: raiseRecommended, has_attributed_revenue: Boolean(revenue) });
        onCreated(review);
        (e.target as HTMLFormElement).reset();
        setRating(3);
        setRaiseRecommended(false);
        toast.success(t("publishSuccess"));
      } else {
        toast.error(t("publishFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("periodStart")}>
          <Input name="periodStart" type="date" required />
        </Field>
        <Field label={t("periodEnd")}>
          <Input name="periodEnd" type="date" required />
        </Field>
      </div>

      <Field label={t("overallRating")}>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={t("starsAria", { n })}>
              <Star size={20} className={n <= rating ? "fill-mv-lime-dark text-mv-lime-dark" : "text-mv-ink-mute"} />
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("strengths")}>
        <Textarea name="strengths" placeholder={t("strengthsPlaceholder")} rows={3} />
      </Field>
      <Field label={t("improvements")}>
        <Textarea name="improvements" placeholder={t("improvementsPlaceholder")} rows={3} />
      </Field>
      <Field label={t("attributedRevenue")} hint={t("attributedRevenueHint")}>
        <Input name="attributedRevenue" type="number" step="0.01" min="0" />
      </Field>
      <label className="flex items-center gap-2 text-[12.5px] font-medium text-mv-ink-soft">
        <Switch
          checked={raiseRecommended}
          onCheckedChange={setRaiseRecommended}
          size="sm"
          className="data-checked:bg-mv-green"
        />
        {t("raiseRecommended")}
      </label>

      <Button size="sm" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("publishing") : t("publish")}
      </Button>
    </form>
  );
}

export function EmployeeDetail({
  employee,
  restaurantId,
  onToggleActive,
}: {
  employee: Employee;
  restaurantId: string;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const t = useTranslations("employees");
  const td = useTranslations("employees.detail");
  const tr = useTranslations("employees.reviewForm");
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [reviews, setReviews] = useState<EmployeeReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getEmployeeShiftsAction(employee.id), getEmployeeReviewsAction(employee.id)]).then(
      ([s, r]) => {
        setShifts(s);
        setReviews(r);
        setLoading(false);
      }
    );
  }, [employee.id]);

  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0);
  const lateCount = shifts.filter((s) => s.wasLate).length;
  const punctuality = shifts.length > 0 ? Math.round(((shifts.length - lateCount) / shifts.length) * 100) : null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[18px] font-medium text-mv-ink">{employee.fullName}</h2>
            <p className="text-[12.5px] text-mv-ink-faint">{employee.roleTitle}</p>
          </div>
          <Badge tone={employee.active ? "green" : "neutral"}>{employee.active ? t("active") : t("inactive")}</Badge>
        </div>
        {employee.hourlyWage !== null && (
          <p className="mt-2 text-[13px] text-mv-ink-soft">{formatCurrency(employee.hourlyWage)}/h</p>
        )}
        {employee.description && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-mv-ink-soft">{employee.description}</p>
        )}
        {(employee.contactPhone || employee.contactEmail) && (
          <div className="mt-2 space-y-0.5 text-[12.5px] text-mv-ink-soft">
            {employee.contactPhone && <p>{employee.contactPhone}</p>}
            {employee.contactEmail && <p>{employee.contactEmail}</p>}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-mv-cream-soft p-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{td("hoursTotal")}</p>
            <p className="font-display text-[16px] font-medium text-mv-ink">{totalHours.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">{td("punctuality")}</p>
            <p className="font-display text-[16px] font-medium text-mv-ink">
              {punctuality === null ? "—" : `${punctuality}%`}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="mt-4"
          onClick={() => onToggleActive(employee.id, !employee.active)}
        >
          {employee.active ? td("markInactive") : td("markActive")}
        </Button>
      </Card>

      <Card>
        <CardHeader eyebrow={td("shiftsEyebrow")} title={td("shiftsTitle")} />
        {loading ? (
          <p className="text-[12.5px] text-mv-ink-faint">{td("loading")}</p>
        ) : (
          <div className="mb-4 max-h-40 space-y-1.5 overflow-y-auto">
            {shifts.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">{td("noShifts")}</p>
            ) : (
              shifts.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-mv-ink-soft">{formatDate(s.shiftDate)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-mv-ink">{s.hoursWorked}h</span>
                    {s.wasLate && <Badge tone="amber">{td("late")}</Badge>}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        <LogShiftForm
          employeeId={employee.id}
          restaurantId={restaurantId}
          onLogged={(s) => setShifts((prev) => [s, ...prev])}
        />
      </Card>

      <Card>
        <CardHeader eyebrow={td("reviewsEyebrow")} title={td("reviewsTitle")} />
        {loading ? (
          <p className="text-[12.5px] text-mv-ink-faint">{td("loading")}</p>
        ) : (
          <div className="mb-4 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">{td("noReviews")}</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-mv-border-soft p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-mv-ink">
                      {formatDate(r.periodStart)} — {formatDate(r.periodEnd)}
                    </p>
                    <StarRating value={r.rating} />
                  </div>
                  {r.raiseRecommended && (
                    <Badge tone="green" className="mt-1.5">
                      {tr("raiseRecommended")}
                    </Badge>
                  )}
                  {r.strengths && <p className="mt-2 text-[12.5px] text-mv-ink-soft">{r.strengths}</p>}
                  <Link
                    href={`/employees/${employee.id}/reviews/${r.id}`}
                    target="_blank"
                    className="mt-2 flex w-fit items-center gap-1.5 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                  >
                    <Printer size={12} /> {td("viewPrint")}
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
        <NewReviewForm
          employee={employee}
          restaurantId={restaurantId}
          onCreated={(r) => setReviews((prev) => [r, ...prev])}
        />
      </Card>
    </div>
  );
}

export function EmployeesView({
  restaurantId,
  employees,
  initialSelectedId,
}: {
  restaurantId: string | null;
  employees: Employee[];
  initialSelectedId?: string;
}) {
  const t = useTranslations("employees");
  const { role } = useApp();
  const [list, setList] = useState(employees);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = Boolean(restaurantId) && (role === "owner" || role === "manager");
  const selected = list.find((e) => e.id === selectedId);

  async function handleToggleActive(id: string, active: boolean) {
    if (!restaurantId) return;
    const ok = await setEmployeeActiveAction(restaurantId, id, active);
    if (ok) setList((prev) => prev.map((e) => (e.id === id ? { ...e, active } : e)));
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus size={15} /> {t("addEmployee")}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={selected ? "xl:col-span-7" : "xl:col-span-12"}>
          {list.length === 0 ? (
            <EmptyState
              icon={Users2}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                canManage && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <UserPlus size={15} /> {t("addEmployee")}
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>{t("colEmployee")}</Th>
                <Th>{t("colRole")}</Th>
                <Th>{t("colRate")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th className="text-right"></Th>
              </THead>
              <tbody>
                {list.map((e) => (
                  <Tr key={e.id} onClick={() => setSelectedId(e.id)} active={e.id === selectedId}>
                    <Td className="font-semibold text-mv-ink">{e.fullName}</Td>
                    <Td className="text-mv-ink-soft">{e.roleTitle}</Td>
                    <Td className="text-mv-ink-soft">{e.hourlyWage !== null ? `${formatCurrency(e.hourlyWage)}/h` : "—"}</Td>
                    <Td>
                      <Badge tone={e.active ? "green" : "neutral"}>{e.active ? t("active") : t("inactive")}</Badge>
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/employees/${e.id}`}
                        onClick={(ev) => ev.stopPropagation()}
                        aria-label={t("viewFullProfile")}
                        className="inline-flex rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
                      >
                        <ChevronRight size={15} />
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {selected && restaurantId && (
          <div className="xl:col-span-5">
            <div className="xl:sticky xl:top-6">
              <EmployeeDetail employee={selected} restaurantId={restaurantId} onToggleActive={handleToggleActive} />
            </div>
          </div>
        )}
      </div>

      {canManage && restaurantId && (
        <NewEmployeeModal
          restaurantId={restaurantId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(e) => {
            setList((prev) => [...prev, e].sort((a, b) => a.fullName.localeCompare(b.fullName)));
            setSelectedId(e.id);
          }}
        />
      )}
    </div>
  );
}
