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
} from "./actions";
import type { Employee, EmployeeReview, EmployeeShift } from "@/lib/types";
import { useApp } from "@/lib/app-context";
import { UserPlus, Star, Printer, Users2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

function StarRating({ value }: { value: number }) {
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
      });
      if (employee) {
        onCreated(employee);
        onClose();
      } else {
        toast.error("L'ajout de l'employé a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un employé" description="Nom, poste et taux horaire (optionnel).">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom complet">
          <Input name="fullName" placeholder="Ex : Sam Tremblay" required />
        </Field>
        <Field label="Poste">
          <Input name="roleTitle" placeholder="Ex : Serveur, Cuisinier…" defaultValue="Employé" />
        </Field>
        <Field label="Taux horaire ($/h)" hint="Optionnel">
          <Input name="hourlyWage" type="number" step="0.01" min="0" placeholder="Ex : 18.50" />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Ajout…" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LogShiftForm({
  employeeId,
  restaurantId,
  onLogged,
}: {
  employeeId: string;
  restaurantId: string;
  onLogged: (s: EmployeeShift) => void;
}) {
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
        toast.error("L'enregistrement du quart a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input name="shiftDate" type="date" required />
        </Field>
        <Field label="Heures travaillées">
          <Input name="hoursWorked" type="number" step="0.25" min="0" required />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[12.5px] font-medium text-mv-ink-soft">
        <Switch checked={wasLate} onCheckedChange={setWasLate} size="sm" className="data-checked:bg-mv-red" />
        En retard
      </label>
      <Field label="Notes" hint="Optionnel">
        <Input name="notes" placeholder="Ex : a fermé le service" />
      </Field>
      <Button size="sm" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement…" : "Enregistrer le quart"}
      </Button>
    </form>
  );
}

function NewReviewForm({
  employee,
  restaurantId,
  onCreated,
}: {
  employee: Employee;
  restaurantId: string;
  onCreated: (r: EmployeeReview) => void;
}) {
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
        onCreated(review);
        (e.target as HTMLFormElement).reset();
        setRating(3);
        setRaiseRecommended(false);
        toast.success("Revue publiée.");
      } else {
        toast.error("La publication de la revue a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Début de période">
          <Input name="periodStart" type="date" required />
        </Field>
        <Field label="Fin de période">
          <Input name="periodEnd" type="date" required />
        </Field>
      </div>

      <Field label="Note globale">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} étoiles`}>
              <Star size={20} className={n <= rating ? "fill-mv-lime-dark text-mv-lime-dark" : "text-mv-ink-mute"} />
            </button>
          ))}
        </div>
      </Field>

      <Field label="Points forts">
        <Textarea name="strengths" placeholder="Ce que fait bien cet employé…" rows={3} />
      </Field>
      <Field label="Ce qu'il devrait améliorer">
        <Textarea name="improvements" placeholder="Ce qui mériterait d'être travaillé…" rows={3} />
      </Field>
      <Field label="Chiffre d'affaires attribué ($)" hint="Optionnel, basé sur vos données de vente">
        <Input name="attributedRevenue" type="number" step="0.01" min="0" />
      </Field>
      <label className="flex items-center gap-2 text-[12.5px] font-medium text-mv-ink-soft">
        <Switch
          checked={raiseRecommended}
          onCheckedChange={setRaiseRecommended}
          size="sm"
          className="data-checked:bg-mv-green"
        />
        Augmentation recommandée
      </label>

      <Button size="sm" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Publication…" : "Publier la revue"}
      </Button>
    </form>
  );
}

function EmployeeDetail({
  employee,
  restaurantId,
  onToggleActive,
}: {
  employee: Employee;
  restaurantId: string;
  onToggleActive: (id: string, active: boolean) => void;
}) {
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
          <Badge tone={employee.active ? "green" : "neutral"}>{employee.active ? "Actif" : "Inactif"}</Badge>
        </div>
        {employee.hourlyWage !== null && (
          <p className="mt-2 text-[13px] text-mv-ink-soft">{formatCurrency(employee.hourlyWage)}/h</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-mv-cream-soft p-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Heures (total)</p>
            <p className="font-display text-[16px] font-medium text-mv-ink">{totalHours.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Ponctualité</p>
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
          {employee.active ? "Marquer inactif" : "Marquer actif"}
        </Button>
      </Card>

      <Card>
        <CardHeader eyebrow="Quarts" title="Journal des quarts" />
        {loading ? (
          <p className="text-[12.5px] text-mv-ink-faint">Chargement…</p>
        ) : (
          <div className="mb-4 max-h-40 space-y-1.5 overflow-y-auto">
            {shifts.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">Aucun quart enregistré.</p>
            ) : (
              shifts.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-mv-ink-soft">{formatDate(s.shiftDate)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-mv-ink">{s.hoursWorked}h</span>
                    {s.wasLate && <Badge tone="amber">Retard</Badge>}
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
        <CardHeader eyebrow="Revues" title="Revues de performance" />
        {loading ? (
          <p className="text-[12.5px] text-mv-ink-faint">Chargement…</p>
        ) : (
          <div className="mb-4 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">Aucune revue pour l&apos;instant.</p>
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
                      Augmentation recommandée
                    </Badge>
                  )}
                  {r.strengths && <p className="mt-2 text-[12.5px] text-mv-ink-soft">{r.strengths}</p>}
                  <Link
                    href={`/employees/${employee.id}/reviews/${r.id}`}
                    target="_blank"
                    className="mt-2 flex w-fit items-center gap-1.5 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
                  >
                    <Printer size={12} /> Voir / imprimer
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
}: {
  restaurantId: string | null;
  employees: Employee[];
}) {
  const { role } = useApp();
  const [list, setList] = useState(employees);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        eyebrow="Équipe"
        title="Employés"
        description="Suivez vos employés, leurs quarts et leurs revues de performance."
        action={
          canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus size={15} /> Ajouter un employé
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={selected ? "xl:col-span-7" : "xl:col-span-12"}>
          {list.length === 0 ? (
            <EmptyState
              icon={Users2}
              title="Aucun employé pour le moment"
              description="Ajoutez vos employés pour suivre leurs quarts et leurs performances."
              action={
                canManage && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <UserPlus size={15} /> Ajouter un employé
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Employé</Th>
                <Th>Poste</Th>
                <Th>Taux</Th>
                <Th>Statut</Th>
              </THead>
              <tbody>
                {list.map((e) => (
                  <Tr key={e.id} onClick={() => setSelectedId(e.id)} active={e.id === selectedId}>
                    <Td className="font-semibold text-mv-ink">{e.fullName}</Td>
                    <Td className="text-mv-ink-soft">{e.roleTitle}</Td>
                    <Td className="text-mv-ink-soft">{e.hourlyWage !== null ? `${formatCurrency(e.hourlyWage)}/h` : "—"}</Td>
                    <Td>
                      <Badge tone={e.active ? "green" : "neutral"}>{e.active ? "Actif" : "Inactif"}</Badge>
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
