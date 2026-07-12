"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { restaurants } from "@/lib/mock-data";
import { useCurrentRestaurant } from "@/lib/app-context";

export function CreateCampaignModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const current = useCurrentRestaurant();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Créer une campagne"
      description="Post, promotion ou email — tout ce qui pousse du monde vers votre restaurant."
      width={620}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="space-y-4"
      >
        <Field label="Nom de la campagne">
          <Input placeholder="Ex : Terrasse d'été — teasing" required />
        </Field>

        <Field label="Description">
          <Textarea placeholder="De quoi parle cette campagne, quel est l'objectif ?" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select defaultValue="post">
              <option value="post">Post</option>
              <option value="email">Email</option>
              <option value="promo">Promotion</option>
            </Select>
          </Field>
          <Field label="Canal">
            <Select defaultValue="Instagram">
              <option>Instagram</option>
              <option>Facebook</option>
              <option>Email</option>
              <option>En salle</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date de début">
            <Input type="date" required />
          </Field>
          <Field label="Date de fin">
            <Input type="date" />
          </Field>
        </div>

        <Field label="Établissement">
          <Select defaultValue={current.id}>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">Créer la campagne</Button>
        </div>
      </form>
    </Modal>
  );
}
