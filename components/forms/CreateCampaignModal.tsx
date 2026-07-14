"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { createCampaignAction } from "@/app/(app)/campaigns/actions";
import type { Campaign, CampaignChannel, CampaignType } from "@/lib/types";
import { useState } from "react";

export function CreateCampaignModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (campaign: Campaign) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const campaign = await createCampaignAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? "") || null,
        type: form.get("type") as CampaignType,
        channel: form.get("channel") as CampaignChannel,
        startDate: String(form.get("startDate") ?? ""),
        endDate: String(form.get("endDate") ?? form.get("startDate") ?? ""),
      });
      if (campaign) {
        onCreated(campaign);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Créer une campagne"
      description="Post, promotion ou email — tout ce qui pousse du monde vers votre restaurant."
      width={620}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom de la campagne">
          <Input name="name" placeholder="Ex : Terrasse d'été — teasing" required />
        </Field>

        <Field label="Description">
          <Textarea name="description" placeholder="De quoi parle cette campagne, quel est l'objectif ?" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select name="type" defaultValue="post">
              <option value="post">Post</option>
              <option value="email">Email</option>
              <option value="promo">Promotion</option>
            </Select>
          </Field>
          <Field label="Canal">
            <Select name="channel" defaultValue="Instagram">
              <option>Instagram</option>
              <option>Facebook</option>
              <option>Email</option>
              <option>En salle</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date de début">
            <Input name="startDate" type="date" required />
          </Field>
          <Field label="Date de fin">
            <Input name="endDate" type="date" />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer la campagne"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
