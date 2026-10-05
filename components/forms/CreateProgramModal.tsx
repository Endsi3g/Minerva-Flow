"use client";


import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { createProgramAction } from "@/app/[locale]/(app)/programs/actions";
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
  const t = useTranslations("createProgram");
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
      setError(t("theNameAndDates"));
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
          t("couldNotCreateThe")
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
      title={t("createAProgram")}
      description={t("aRecurringOrSeasonal")}
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
              <option value="brunch">{t("brunch")}</option>
              <option value="soiree">{t("evening")}</option>
              <option value="saison">{t("season")}</option>
              <option value="evenement">{t("event")}</option>
            </Select>
          </Field>
          <Field label="Objectif">
            <Input name="objective" placeholder="Ex : Remplir la terrasse le dimanche" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("startDate")}>
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
          <Field label={t("expectedCost")}>
            <Input type="number" name="expectedCost" min="0" step="0.01" placeholder="0,00 $" />
          </Field>
        </div>

        {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("creating") : t("createTheProgram")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
