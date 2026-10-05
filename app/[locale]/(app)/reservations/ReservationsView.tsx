"use client";


import { intlLocale } from "@/lib/format-locale";
import { useTranslations, useLocale } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  createReservationAction,
  updateReservationStatusAction,
  updateReservationTableAction,
  deleteReservationAction,
  getReservationsForDayAction,
  createTableAction,
  deleteTableAction,
} from "./actions";

/** Mirrors RESERVATION_CONFLICT in lib/data/reservations.ts — kept as a literal since "use server" files may only export functions. */
const RESERVATION_CONFLICT = "conflict";
import { useApp } from "@/lib/app-context";
import type { Reservation, ReservationStatus, RestaurantTable } from "@/lib/types";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Trash2, Users, Link2, CheckCircle2, UsersRound } from "lucide-react";
import type { ReservationPlatformConnection } from "@/lib/data/reservation-platforms";
import { useState, type FormEvent } from "react";
import { notifyError } from "@/lib/notify-error";
import { formatTime } from "@/lib/utils";

function formatDayLabel(dayStart: string, locale?: string) {
  return new Date(dayStart).toLocaleDateString(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function shiftDay(dayStart: string, delta: number) {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + delta);
  return d.toISOString();
}

function NewReservationModal({
  restaurantId,
  tables,
  dayStart,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  tables: RestaurantTable[];
  dayStart: string;
  open: boolean;
  onClose: () => void;
  onCreated: (r: Reservation) => void;
}) {
  const tv = useTranslations("reservationsView");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultDate = dayStart.slice(0, 10);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date") ?? defaultDate);
    const time = String(form.get("time") ?? "18:00");
    const tableId = String(form.get("tableId") ?? "");

    setIsSubmitting(true);
    try {
      const reservation = await createReservationAction(restaurantId, {
        guestName: String(form.get("guestName") ?? ""),
        guestPhone: String(form.get("guestPhone") ?? "") || null,
        partySize: Number(form.get("partySize") ?? 2),
        reservationTime: new Date(`${date}T${time}`).toISOString(),
        tableId: tableId || null,
        notes: String(form.get("notes") ?? "") || null,
      });
      if (reservation && reservation !== RESERVATION_CONFLICT) {
        onCreated(reservation);
        onClose();
      } else if (reservation === RESERVATION_CONFLICT) {
        notifyError(tv("thisTableIsAlready"));
      } else {
        notifyError(tv("couldNotCreateThe"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={tv("newReservation")} description="Nom du client, date, heure et taille du groupe.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={tv("customerName")}>
          <Input name="guestName" placeholder="Ex : Famille Tremblay" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tv("phone")} hint="Optionnel">
            <Input name="guestPhone" type="tel" placeholder="Ex : 514-555-1234" />
          </Field>
          <Field label={tv("partySize")}>
            <Input name="partySize" type="number" min="1" defaultValue={2} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input name="date" type="date" defaultValue={defaultDate} required />
          </Field>
          <Field label="Heure">
            <Input name="time" type="time" defaultValue="18:00" required />
          </Field>
        </div>
        <Field label="Table" hint="Optionnel — assignable plus tard">
          <Select name="tableId" defaultValue="">
            <option value="">{tv("noTableAssigned")}</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.capacity} places)
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" hint="Optionnel">
          <Textarea name="notes" placeholder={tv("eGPeanutAllergy")} rows={2} />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tv("creating") : tv("createTheReservation")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TablesCard({
  restaurantId,
  tables,
  onChange,
}: {
  restaurantId: string;
  tables: RestaurantTable[];
  onChange: (tables: RestaurantTable[]) => void;
}) {
  const tv = useTranslations("reservationsView");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const capacity = Number(form.get("capacity") ?? 2);
    const type = String(form.get("type") ?? "table");

    setIsSubmitting(true);
    try {
      const typeSuffix = type === "bar" ? " (Bar)" : type === "terrasse" ? " (Terrasse)" : " (Table)";
      const fullLabel = `${label}${typeSuffix}`;

      const table = await createTableAction(restaurantId, {
        label: fullLabel,
        capacity,
      });
      if (table) {
        onChange([...tables, table].sort((a, b) => a.label.localeCompare(b.label)));
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError(tv("couldNotAddThe"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteTableAction(restaurantId, id);
    if (ok) onChange(tables.filter((t) => t.id !== id));
  }

  return (
    <Card>
      <CardHeader eyebrow="Plan de salle" title="Tables" description={tv("yourTablesToAssign")} />
      <div className="mb-3 space-y-1.5">
        {tables.length === 0 && <p className="text-[12.5px] text-mv-ink-faint">{tv("noTablesAdded")}</p>}
        {tables.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2"
          >
            <span className="text-[13px] font-medium text-mv-ink">
              {t.label} <span className="text-mv-ink-faint">— {t.capacity} places</span>
            </span>
            <button
              onClick={() => handleDelete(t.id)}
              aria-label={tv("removeTable")}
              className="text-mv-ink-faint transition-colors hover:text-mv-red"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex items-end gap-2 border-t border-mv-border-soft pt-3">
        <div className="flex-1">
          <Field label="Nom">
            <Input name="label" placeholder="Ex : Table 4" required />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Type">
            <Select name="type" defaultValue="table">
              <option value="table">{tv("standardTable")}</option>
              <option value="bar">{tv("counterBar")}</option>
              <option value="terrasse">{tv("terraceOutdoor")}</option>
            </Select>
          </Field>
        </div>
        <div className="w-20">
          <Field label="Places">
            <Input name="capacity" type="number" min="1" defaultValue={2} required />
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          <Plus size={14} />
        </Button>
      </form>
    </Card>
  );
}

const platformLabel: Record<ReservationPlatformConnection["platform"], string> = {
  opentable: "OpenTable",
  resy: "Resy",
  sevenrooms: "SevenRooms",
};

/**
 * Purely informational until a real partner account exists — most
 * reservation platforms require a business partnership to get API access,
 * not just a self-serve key like Square. See the migration comment on
 * reservation_platform_connections.
 */
function PlatformsCard({ connections }: { connections: ReservationPlatformConnection[] }) {
  const t = useTranslations("reservationsView");
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  return (
    <Card>
      <CardHeader
        eyebrow={t("integrations")}
        title={t("reservationServices")}
        description={t("connectAnExternalService")}
      />
      <div className="space-y-2">
        {(Object.keys(platformLabel) as ReservationPlatformConnection["platform"][]).map((platform) => {
          const connected = byPlatform.get(platform);
          return (
            <div
              key={platform}
              className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3.5 py-2.5"
            >
              <div>
                <p className="text-[13px] font-semibold text-mv-ink">{platformLabel[platform]}</p>
                <p className="text-[12px] text-mv-ink-faint">
                  {connected ? t("connected") : t("requiresAPartnerAccount")}
                </p>
              </div>
              {connected ? (
                <Badge tone="green" dot>
                  {t("connected")}
                </Badge>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg bg-mv-ink/[0.06] px-3 py-1.5 text-[12px] font-semibold text-mv-ink-faint">
                  <Link2 size={12} /> Pas encore disponible
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ReservationsView({
  restaurantId,
  initialTables,
  initialReservations,
  initialDayStart,
  initialPlatformConnections,
}: {
  restaurantId: string | null;
  initialTables: RestaurantTable[];
  initialReservations: Reservation[];
  initialDayStart: string;
  initialPlatformConnections: ReservationPlatformConnection[];
}) {
  const locale = useLocale();
  const tv = useTranslations("reservationsView");
  const { role } = useApp();
  const [tables, setTables] = useState(initialTables);
  const [reservations, setReservations] = useState(initialReservations);
  const [dayStart, setDayStart] = useState(initialDayStart);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canManage = role === "owner" || role === "manager";

  const confirmedCount = reservations.filter(
    (r) => r.status === "confirmee" || r.status === "honoree"
  ).length;
  const totalCovers = reservations
    .filter((r) => r.status !== "annulee" && r.status !== "no_show")
    .reduce((sum, r) => sum + r.partySize, 0);

  async function loadDay(newDayStart: string) {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const dayEnd = shiftDay(newDayStart, 1);
      const rows = await getReservationsForDayAction(restaurantId, newDayStart, dayEnd);
      setReservations(rows);
      setDayStart(newDayStart);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: ReservationStatus) {
    if (!restaurantId) return;
    let cancellationReason: string | undefined;
    if (status === "annulee") {
      const entered = window.prompt(tv("aShortNoteExplaining"));
      if (entered === null) return;
      cancellationReason = entered.trim() || tv("somethingUnexpectedPreventsThe");
    }
    const ok = await updateReservationStatusAction(restaurantId, id, status, cancellationReason);
    if (ok) setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  async function handleTableChange(id: string, tableId: string) {
    if (!restaurantId) return;
    const result = await updateReservationTableAction(restaurantId, id, tableId || null);
    if (result === true) {
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, tableId: tableId || null } : r)));
    } else if (result === RESERVATION_CONFLICT) {
      notifyError(tv("thisTableIsAlready2"));
    } else {
      notifyError(tv("couldNotUpdateThe"));
    }
  }

  async function handleDelete(id: string) {
    if (!restaurantId) return;
    const ok = await deleteReservationAction(restaurantId, id);
    if (ok) setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <PageHeader
        eyebrow={tv("operations")}
        title={tv("reservations")}
        description={tv("todaySReservationsParty")}
        action={
          restaurantId && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> {tv("newReservation")}
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <StatCard label={tv("todaySReservations")} value={reservations.length} icon={CalendarClock} sublabel={formatDayLabel(dayStart, locale)} accent="green" />
        <StatCard label={tv("confirmed")} value={confirmedCount} icon={CheckCircle2} sublabel={`Sur ${reservations.length} réservation${reservations.length > 1 ? "s" : ""}`} accent="lime" />
        <StatCard label={tv("coversExpected")} value={totalCovers} icon={UsersRound} sublabel={tv("totalPartySizes")} accent="ink" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => loadDay(shiftDay(dayStart, -1))}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-48 text-center text-[13.5px] font-medium capitalize text-mv-ink">
          {formatDayLabel(dayStart, locale)}
        </span>
        <button
          onClick={() => loadDay(shiftDay(dayStart, 1))}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-mv-border text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
        >
          <ChevronRight size={15} />
        </button>
        <button
          onClick={() => loadDay(new Date(new Date().setHours(0, 0, 0, 0)).toISOString())}
          disabled={loading}
          className="ml-1 rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
        >
          Aujourd&apos;hui
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          {reservations.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={tv("noReservationsThisDay")}
              description={tv("addOneOrChange")}
              action={
                restaurantId && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus size={15} /> {tv("newReservation")}
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>{tv("time")}</Th>
                <Th>{tv("customer")}</Th>
                <Th>{tv("party")}</Th>
                <Th>{tv("table")}</Th>
                <Th>{tv("status")}</Th>
                <Th className="text-right">{tv("actions")}</Th>
              </THead>
              <tbody>
                {reservations.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-medium text-mv-ink">{formatTime(r.reservationTime, locale)}</Td>
                    <Td>
                      <p className="font-semibold text-mv-ink">{r.guestName}</p>
                      {r.guestPhone && <p className="text-[12px] text-mv-ink-faint">{r.guestPhone}</p>}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 text-mv-ink-soft">
                        <Users size={13} /> {r.partySize}
                      </span>
                    </Td>
                    <Td>
                      <Select
                        value={r.tableId ?? ""}
                        onChange={(e) => handleTableChange(r.id, e.target.value)}
                        className="w-36"
                        disabled={!canManage}
                      >
                        <option value="">—</option>
                        {tables.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td>
                      <Select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value as ReservationStatus)}
                        className="w-36 h-8 text-[12px]"
                        disabled={!canManage}
                      >
                        <option value="demandee">{tv("pending")}</option>
                        <option value="confirmee">{tv("confirmed2")}</option>
                        <option value="annulee">{tv("cancelled")}</option>
                        <option value="honoree">{tv("honored")}</option>
                        <option value="no_show">{tv("noShow")}</option>
                      </Select>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {canManage && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            aria-label="Supprimer"
                            className="rounded-md p-1.5 text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-red"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {canManage && (
          <div className="space-y-6 xl:col-span-5">
            <TablesCard restaurantId={restaurantId!} tables={tables} onChange={setTables} />
            <PlatformsCard connections={initialPlatformConnections} />
          </div>
        )}
      </div>

      {restaurantId && (
        <NewReservationModal
          restaurantId={restaurantId}
          tables={tables}
          dayStart={dayStart}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(r) => setReservations((prev) => [...prev, r].sort((a, b) => a.reservationTime.localeCompare(b.reservationTime)))}
        />
      )}
    </div>
  );
}
