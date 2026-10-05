"use client";


import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { cn } from "@/lib/utils";
import type { RushLevel, ServiceSource, ServiceDay } from "@/lib/types";
import type { CreateServiceDayResult } from "@/app/[locale]/(app)/days/actions";
import { useEffect, useState } from "react";

function buildEventOptions(t: (key: string) => string) {
  return ["Promo", t("menuChange"), t("specialEvening"), t("privateEvent")];
}

function buildRushLevelOptions(t: (key: string) => string): { id: RushLevel; label: string }[] {
  return [
  { id: "calme", label: "Calme" },
  { id: "normal", label: "Normal" },
  { id: "rush", label: "Rush" },
  { id: "debordement", label: t("overflow") },
];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export type AddServiceDayInput = {
  date: string;
  revenue: number;
  mainSource: ServiceSource;
  rushLevel: RushLevel;
  events: string[];
  notes: string;
};

export function AddServiceDayModal({
  open,
  onClose,
  onSubmit,
  editingDay,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddServiceDayInput) => Promise<CreateServiceDayResult>;
  editingDay?: ServiceDay | null;
}) {
  const t = useTranslations("addServiceDay");
  const [date, setDate] = useState(todayIso());
  const [revenue, setRevenue] = useState("");
  const [mainSource, setMainSource] = useState<ServiceSource>("salle");
  const [rushLevel, setRushLevel] = useState<RushLevel>("normal");
  const [events, setEvents] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    if (editingDay) {
      setDate(editingDay.date);
      setRevenue(String(editingDay.revenue));
      setMainSource(editingDay.mainSource);
      setRushLevel(editingDay.rushLevel ?? "normal");
      setEvents(editingDay.events);
      setNotes(editingDay.notes ?? "");
    } else {
      setDate(todayIso());
      setRevenue("");
      setMainSource("salle");
      setRushLevel("normal");
      setEvents([]);
      setNotes("");
    }
    setError(null);
  }

  // Re-populate whenever the modal opens (or which day it's editing changes) —
  // this component stays mounted across opens/closes, so a plain useState
  // initializer would only ever run once.
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingDay?.id]);

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedRevenue = Number(revenue);
    if (!date || !Number.isFinite(parsedRevenue)) {
      setError(t("theDateAndRevenue"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        date,
        revenue: parsedRevenue,
        mainSource,
        rushLevel,
        events,
        notes,
      });
      if (result.ok) {
        reset();
        onClose();
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editingDay ? t("editTheServiceDay") : t("addAServiceDay")}
      description={t("enterTheRevenueEvents")}
      width={620}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Revenu du jour">
            <Input
              type="number"
              step="0.01"
              placeholder="2 450"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Source principale">
          <Select
            value={mainSource}
            onChange={(e) => setMainSource(e.target.value as ServiceSource)}
          >
            <option value="salle">{t("onSite")}</option>
            <option value="livraison">{t("delivery")}</option>
            <option value="reservation">{t("onlineReservation")}</option>
          </Select>
        </Field>

        <Field label={t("eventsOfTheDay")} hint={t("selectWhatApplies")}>
          <div className="flex flex-wrap gap-2">
            {buildEventOptions(t).map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => toggleEvent(e)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  events.includes(e)
                    ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                    : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("activityLevel")}>
          <Select
            value={rushLevel}
            onChange={(e) => setRushLevel(e.target.value as RushLevel)}
          >
            {buildRushLevelOptions(t).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes libres" hint={t("atmosphereIncidentsStockouts")}>
          <Textarea
            placeholder={t("eGPatioFull")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {error && <p className="text-[12.5px] font-medium text-mv-red">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("saving") : editingDay ? t("saveChanges") : t("saveTheDay")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
