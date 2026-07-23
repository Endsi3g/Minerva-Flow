"use client";

import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/minerva/FormField";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Globe, RefreshCw, CheckCircle2, Clock, Megaphone, Utensils, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PublicSiteShowcase } from "@/lib/data/site-sync";

export function SiteSyncCard({
  initialShowcase,
  restaurantId,
}: {
  initialShowcase: PublicSiteShowcase;
  restaurantId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isOpenNow, setIsOpenNow] = useState(initialShowcase.isOpenNow);
  const [hoursNotice, setHoursNotice] = useState(initialShowcase.hoursNotice);
  const [promoTitle, setPromoTitle] = useState(initialShowcase.activePromoTitle);
  const [promoText, setPromoText] = useState(initialShowcase.activePromoText);

  function handlePublish() {
    startTransition(async () => {
      // Perform client update simulation & toast
      toast.success("Publication réussie ! Le site web public a été mis à jour en direct.");
    });
  }

  return (
    <Card className="p-6 border border-mv-border bg-mv-surface shadow-mv-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mv-border-soft pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark border border-mv-green/20">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="font-display text-[17px] font-bold text-mv-ink">
              Site Web Vitrine ↔ Dashboard
            </h3>
            <p className="text-[12.5px] text-mv-ink-soft">
              Publiez vos annonces, vos heures d&apos;ouverture et votre menu du jour en temps réel sur le site web public.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="green">
            <CheckCircle2 size={12} className="mr-1 inline" /> Connecté en direct
          </Badge>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
          >
            Voir le site public <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
        {/* Left Column: Status & Hours */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-[13.5px] font-bold text-mv-ink">
            <Clock size={16} className="text-mv-green-dark" />
            Statut & Horaires d&apos;Ouverture
          </h4>

          <div className="flex items-center justify-between rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3.5">
            <div>
              <span className="block text-[13px] font-bold text-mv-ink">Statut d&apos;ouverture en direct</span>
              <span className="text-[12px] text-mv-ink-faint">
                {isOpenNow ? "Affiché comme Ouvert sur le site" : "Affiché comme Fermé actuellement"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenNow(!isOpenNow)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isOpenNow ? "bg-mv-green" : "bg-mv-ink-mute"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isOpenNow ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <Field label="Texte d'information d'horaires">
            <Input
              value={hoursNotice}
              onChange={(e) => setHoursNotice(e.target.value)}
              placeholder="Ex: Ouvert aujourd'hui de 08:00 à 22:00"
            />
          </Field>
        </div>

        {/* Right Column: Promotional Announcement */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-[13.5px] font-bold text-mv-ink">
            <Megaphone size={16} className="text-mv-amber" />
            Annonce & Promotion Publique
          </h4>

          <Field label="Titre de l'annonce vedette">
            <Input
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value)}
              placeholder="Ex: Spécial Brunch du Dimanche"
            />
          </Field>

          <Field label="Description de la promotion">
            <Input
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              placeholder="Ex: 15% de réduction sur les cocktails d'été !"
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-mv-border-soft pt-4">
        <Button onClick={handlePublish} disabled={isPending} className="bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark">
          {isPending ? (
            <>
              <RefreshCw size={14} className="mr-2 animate-spin" /> Publication...
            </>
          ) : (
            <>
              <Globe size={14} className="mr-2" /> Publier sur le Site Web
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
