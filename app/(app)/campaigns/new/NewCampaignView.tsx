"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { CampaignAssets, type PreparedCampaignAsset } from "@/components/campaigns/CampaignAssets";
import { createCampaignAction, saveCampaignAssetAction } from "@/app/(app)/campaigns/actions";
import type { CampaignChannel, CampaignType } from "@/lib/types";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewCampaignView({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [draftId] = useState(() => crypto.randomUUID());
  const [assets, setAssets] = useState<PreparedCampaignAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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
      if (!campaign) {
        setError("La création de la campagne a échoué. Réessayez.");
        return;
      }
      await Promise.all(
        assets.map((a) =>
          saveCampaignAssetAction({
            campaignId: campaign.id,
            restaurantId,
            storagePath: a.path,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            kind: a.kind,
          })
        )
      );
      router.push("/campaigns");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <Link
        href="/campaigns"
        className="mb-3 flex items-center gap-1 text-[13px] text-mv-ink-faint hover:text-mv-ink"
      >
        <ChevronLeft size={14} /> Campagnes
      </Link>

      <PageHeader
        eyebrow="Campagnes & contenu"
        title="Nouvelle campagne"
        description="Post, promotion ou email — ajoutez des visuels et des documents directement ici."
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <div className="space-y-4">
            <Field label="Nom de la campagne">
              <Input name="name" placeholder="Ex : Terrasse d'été — teasing" required />
            </Field>

            <Field label="Description">
              <Textarea name="description" placeholder="De quoi parle cette campagne, quel est l'objectif ?" />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date de début">
                <Input name="startDate" type="date" required />
              </Field>
              <Field label="Date de fin">
                <Input name="endDate" type="date" />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <p className="mb-4 font-display text-[16px] font-medium text-mv-ink">Images et fichiers</p>
          <CampaignAssets
            restaurantId={restaurantId}
            draftId={draftId}
            onAdd={(next) => setAssets((prev) => [...prev, ...next])}
          />
        </Card>

        {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push("/campaigns")} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer la campagne"}
          </Button>
        </div>
      </form>
    </div>
  );
}
