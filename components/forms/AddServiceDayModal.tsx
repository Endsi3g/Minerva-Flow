"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { cn } from "@/lib/utils";
import type { RushLevel, ServiceSource } from "@/lib/types";
import type { CreateServiceDayResult } from "@/app/(app)/days/actions";
import { useState } from "react";

const eventOptions = ["Promo", "Changement de menu", "Soirée spéciale", "Événement privé"];

const rushLevelOptions: { id: RushLevel; label: string }[] = [
  { id: "calme", label: "Calme" },
  { id: "normal", label: "Normal" },
  { id: "rush", label: "Rush" },
  { id: "debordement", label: "Débordement" },
];

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
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddServiceDayInput) => Promise<CreateServiceDayResult>;
}) {
  const [date, setDate] = useState(todayIso());
  const [revenue, setRevenue] = useState("");
  const [mainSource, setMainSource] = useState<ServiceSource>("salle");
  const [rushLevel, setRushLevel] = useState<RushLevel>("normal");
  const [events, setEvents] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  function reset() {
    setDate(todayIso());
    setRevenue("");
    setMainSource("salle");
    setRushLevel("normal");
    setEvents([]);
    setNotes("");
    setError(null);
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
      setError("La date et le revenu sont requis.");
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
      title="Ajouter une journée de service"
      description="Encodez le revenu, les événements et les observations du service."
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
            <option value="salle">Sur place</option>
            <option value="livraison">Livraison</option>
            <option value="reservation">Réservation en ligne</option>
          </Select>
        </Field>

        <Field label="Événements du jour" hint="Sélectionnez ce qui s'applique">
          <div className="flex flex-wrap gap-2">
            {eventOptions.map((e) => (
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

        <Field label="Niveau d'activité">
          <Select
            value={rushLevel}
            onChange={(e) => setRushLevel(e.target.value as RushLevel)}
          >
            {rushLevelOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes libres" hint="Ambiance, incidents, ruptures de stock…">
          <Textarea
            placeholder="Ex : terrasse pleine dès 19h, rupture sur le tartare…"
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
            {submitting ? "Enregistrement…" : "Enregistrer la journée"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
