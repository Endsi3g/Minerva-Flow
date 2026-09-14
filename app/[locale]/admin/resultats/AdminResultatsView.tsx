"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/minerva/FormField";
import { ShareCardConfigurator } from "@/components/fidelisation/ShareCardConfigurator";
import { getAdminResultCardDataAction, type AdminResultCardData } from "./actions";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Scope = "platform" | "restaurant";

type Props = {
  restaurants: { id: string; name: string }[];
  initialMetrics: AdminResultCardData["metrics"];
};

export function AdminResultatsView({ restaurants, initialMetrics }: Props) {
  const t = useTranslations("admin.resultats");
  const [scope, setScope] = useState<Scope>("platform");
  const [restaurantId, setRestaurantId] = useState<string>(restaurants[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<AdminResultCardData>({
    metrics: initialMetrics,
    restaurantName: "Minerva Flow",
    logoUrl: null,
    restaurantUrl: process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app",
  });

  function loadScope(nextScope: Scope, nextRestaurantId?: string) {
    startTransition(async () => {
      const result = await getAdminResultCardDataAction(
        nextScope,
        nextScope === "restaurant" ? (nextRestaurantId ?? restaurantId) : undefined
      );
      if (result) setData(result);
    });
  }

  function handleScopeChange(next: Scope) {
    setScope(next);
    if (next === "platform") {
      loadScope("platform");
    } else {
      loadScope("restaurant", restaurantId);
    }
  }

  function handleRestaurantChange(id: string) {
    setRestaurantId(id);
    loadScope("restaurant", id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("pageTitle")}</h1>
        <p className="text-[13px] text-mv-ink-soft">{t("pageDescription")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
        <div className="flex gap-1.5 rounded-lg border border-mv-border-soft bg-mv-cream-soft p-1">
          {(["platform", "restaurant"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleScopeChange(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                scope === s ? "bg-mv-surface text-mv-ink shadow-mv-sm" : "text-mv-ink-faint hover:text-mv-ink-soft"
              )}
            >
              {s === "platform" ? t("scopePlatform") : t("scopeRestaurant")}
            </button>
          ))}
        </div>

        {scope === "restaurant" && (
          <Select
            aria-label={t("scopeRestaurant")}
            value={restaurantId}
            onChange={(e) => handleRestaurantChange(e.target.value)}
            className="max-w-xs"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        )}

        {isPending && <Loader2 size={15} className="animate-spin text-mv-ink-faint" />}
      </div>

      {data.metrics.length === 0 ? (
        <p className="text-[13px] text-mv-ink-faint">{t("noData")}</p>
      ) : (
        <ShareCardConfigurator
          key={`${scope}-${scope === "restaurant" ? restaurantId : "platform"}`}
          metrics={data.metrics}
          restaurantName={data.restaurantName}
          logoUrl={data.logoUrl}
          restaurantUrl={data.restaurantUrl}
          filePrefix={scope === "platform" ? "minerva-flow-plateforme" : "minerva-flow-restaurant"}
        />
      )}
    </div>
  );
}
