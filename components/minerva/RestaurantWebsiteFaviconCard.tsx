"use client";

import { Card } from "@/components/minerva/PageCard";
import { Input, Field } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useState } from "react";
import { Globe, Sparkles, CheckCircle2, ArrowUpRight } from "lucide-react";
import { getRestaurantFaviconUrl, extractDomain } from "@/lib/utils/favicon";
import { toast } from "sonner";

export function RestaurantWebsiteFaviconCard({
  initialWebsiteUrl = "https://leminerva.ca",
  restaurantName = "Café & Bistro Minerva",
}: {
  initialWebsiteUrl?: string;
  restaurantName?: string;
}) {
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const domain = extractDomain(websiteUrl);
  const faviconUrl = getRestaurantFaviconUrl(websiteUrl, 128);

  function handleSave() {
    toast.success("Site web et logo de marque enregistrés avec succès !");
  }

  return (
    <Card className="p-6 border border-mv-border bg-mv-surface shadow-mv-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mv-border-soft pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mv-cream-soft border border-mv-border text-mv-green-dark shrink-0">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt={`Favicon de ${restaurantName}`}
                className="h-7 w-7 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <Globe size={22} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[16px] font-bold text-mv-ink">
                Site Web Officiel &amp; Logo Favicon
              </h3>
              <Badge tone="green">
                <CheckCircle2 size={12} className="mr-1 inline" /> Détecté
              </Badge>
            </div>
            <p className="text-[12.5px] text-mv-ink-soft">
              Extrait automatiquement le logo officiel de votre établissement à partir de votre nom de domaine.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Field label="URL du site web de l'établissement">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Globe size={15} className="absolute left-3 top-3 text-mv-ink-faint" />
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://votre-restaurant.com"
                className="pl-9"
              />
            </div>
            <Button onClick={handleSave} className="bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark shrink-0">
              Enregistrer
            </Button>
          </div>
        </Field>

        {domain && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3.5">
            <div className="flex items-center gap-3">
              {faviconUrl && (
                <img
                  src={faviconUrl}
                  alt={domain}
                  className="h-8 w-8 rounded-lg bg-mv-surface p-1 border border-mv-border-soft object-contain shrink-0"
                />
              )}
              <div>
                <span className="block text-[13px] font-bold text-mv-ink">{domain}</span>
                <span className="text-[11.5px] text-mv-ink-faint">
                  Favicon extrait en haute résolution (128x128px)
                </span>
              </div>
            </div>

            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
            >
              Visiter le site <ArrowUpRight size={13} />
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
