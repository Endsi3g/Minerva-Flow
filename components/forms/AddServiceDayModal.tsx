"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useState } from "react";

const eventOptions = ["Promo", "Changement de menu", "Soirée spéciale", "Événement privé"];
const anomalyOptions = [
  { id: "", label: "Aucune" },
  { id: "rush", label: "Rush" },
  { id: "creux", label: "Creux inhabituel" },
  { id: "probleme", label: "Problème opérationnel" },
];

export function AddServiceDayModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: () => void;
}) {
  const [events, setEvents] = useState<string[]>([]);

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter une journée de service"
      description="Encodez le revenu, les événements et les observations du service."
      width={620}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
          onClose();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input type="date" defaultValue="2026-07-11" required />
          </Field>
          <Field label="Revenu du jour">
            <Input type="number" placeholder="2 450" required />
          </Field>
        </div>

        <Field label="Source principale">
          <Select defaultValue="salle">
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

        <Field label="Anomalie observée">
          <Select defaultValue="">
            {anomalyOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes libres" hint="Ambiance, incidents, ruptures de stock…">
          <Textarea placeholder="Ex : terrasse pleine dès 19h, rupture sur le tartare…" />
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">Enregistrer la journée</Button>
        </div>
      </form>
    </Modal>
  );
}
