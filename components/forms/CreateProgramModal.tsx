"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { createProgramAction } from "@/app/(app)/programs/actions";
import type { Program, ProgramType } from "@/lib/types";

export function CreateProgramModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (program: Program) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");

    if (!name || !startDate || !endDate) {
      setError("Le nom et les dates sont requis.");
      return;
    }

    const rawRevenueGoal = String(form.get("revenueGoal") ?? "").trim();
    const rawExpectedCost = String(form.get("expectedCost") ?? "").trim();

    startTransition(async () => {
      const program = await createProgramAction(restaurantId, {
        name,
        description: (String(form.get("description") ?? "").trim() || null),
        type: form.get("type") as ProgramType,
        startDate,
        endDate,
        objective: (String(form.get("objective") ?? "").trim() || null),
        revenueGoal: rawRevenueGoal ? Number(rawRevenueGoal) : null,
        expectedCost: rawExpectedCost ? Number(rawExpectedCost) : null,
      });

      if (!program) {
        setError(
          "Impossible de créer le programme. Vérifiez vos droits d'accès et réessayez."
        );
        return;
      }

      onCreated?.(program);
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Créer un programme"
      description="Une source de revenu récurrente ou saisonnière — brunch, soirée, saison, événement."
      width={620}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom du programme">
          <Input name="name" placeholder="Ex : Brunch du dimanche" required />
        </Field>

        <Field label="Description">
          <Textarea name="description" placeholder="De quoi s'agit-il ?" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select name="type" defaultValue="saison">
              <option value="brunch">Brunch</option>
              <option value="soiree">Soirée</option>
              <option value="saison">Saison</option>
              <option value="evenement">Événement</option>
            </Select>
          </Field>
          <Field label="Objectif">
            <Input name="objective" placeholder="Ex : Remplir la terrasse le dimanche" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date de début">
            <Input type="date" name="startDate" required />
          </Field>
          <Field label="Date de fin">
            <Input type="date" name="endDate" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Objectif de revenu">
            <Input type="number" name="revenueGoal" min="0" step="0.01" placeholder="0,00 $" />
          </Field>
          <Field label="Coût attendu">
            <Input type="number" name="expectedCost" min="0" step="0.01" placeholder="0,00 $" />
          </Field>
        </div>

        {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Création…" : "Créer le programme"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
