"use client";


import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

export type WidgetItem = {
  id: string;
  title: string;
  description: string;
  category: "kpi" | "analytics" | "operations" | "assistant";
  defaultVisible: boolean;
};

export function buildOVERVIEW_WIDGETS(t: (key: string) => string): WidgetItem[] {
  return [
  {
    id: "widget-daily-target",
    title: t("goalOfTheDay"),
    description: t("numberOfCustomersNeeded"),
    category: "kpi",
    defaultVisible: true,
  },
  {
    id: "widget-labor-cost",
    title: t("laborCostOfThe"),
    description: t("laborCostAsA"),
    category: "kpi",
    defaultVisible: true,
  },
  {
    id: "widget-incremental-revenue",
    title: t("incrementalRevenueLoyalty"),
    description: t("revenueFromVisitsThat"),
    category: "kpi",
    defaultVisible: true,
  },
  {
    id: "widget-ltv-impact",
    title: t("loyaltyResults"),
    description: t("whatLoyaltyBringsIn"),
    category: "kpi",
    defaultVisible: true,
  },
  {
    id: "widget-menu-health",
    title: t("menuHealth"),
    description: t("breakdownOfYourDishes"),
    category: "analytics",
    defaultVisible: true,
  },
  {
    id: "widget-loyalty-health",
    title: t("loyaltyAtAGlance"),
    description: t("breakdownOfLoyaltyTiers"),
    category: "analytics",
    defaultVisible: true,
  },
  {
    id: "widget-kpi-summary",
    title: t("salesKpisOfThe"),
    description: t("revenueMetricsGrossMargin"),
    category: "kpi",
    defaultVisible: true,
  },
  {
    id: "widget-alerts",
    title: t("operationalStockAlerts"),
    description: t("reportingOfIngredientStockouts"),
    category: "operations",
    defaultVisible: true,
  },
  {
    id: "widget-heatmap",
    title: "Calendrier d'Affluence & Heatmap",
    description: t("heatmapOfQuietDays"),
    category: "analytics",
    defaultVisible: true,
  },
  {
    id: "widget-recommendations",
    title: "Recommandations IA & Checklist",
    description: t("priorityActionsSuggestedBy"),
    category: "assistant",
    defaultVisible: true,
  },
];
}

const STORAGE_KEY = "mv-overview-widget-visibility";

export function useWidgetVisibility() {
  const t = useTranslations("widgetManager");
  const defaults = useMemo(() => {
    return buildOVERVIEW_WIDGETS(t).reduce((acc, w) => {
      acc[w.id] = w.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);
  }, [t]);
  const parseSaved = useCallback((raw: string | null) => {
    if (!raw) return defaults;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return defaults;
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
      );
    } catch {
      return defaults;
    }
  }, [defaults]);
  const [visibleWidgets, setVisibleWidgets] = useLocalStorageState(
    STORAGE_KEY,
    defaults,
    parseSaved,
    (value) => JSON.stringify(value)
  );

  function toggleWidget(id: string) {
    setVisibleWidgets({ ...visibleWidgets, [id]: !visibleWidgets[id] });
  }

  function resetWidgets() {
    const defaults = buildOVERVIEW_WIDGETS(t).reduce((acc, w) => {
      acc[w.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setVisibleWidgets(defaults);
    toast.success(t("allWidgetsAreShown"));
  }

  function isVisible(id: string): boolean {
    return visibleWidgets[id] !== false;
  }

  return { visibleWidgets, toggleWidget, resetWidgets, isVisible };
}

export function WidgetManagerModal({
  open,
  onClose,
  visibleWidgets,
  onToggle,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  visibleWidgets: Record<string, boolean>;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  const t = useTranslations("widgetManager");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personnaliser mes widgets"
      description={t("chooseTheWidgetsAnd")}
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between border-b border-mv-border-soft pb-2">
          <span className="text-[12px] font-semibold uppercase text-mv-ink-faint tracking-wider">
            {t("overviewWidgets")}
          </span>
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[12px] font-medium text-mv-green-dark hover:underline"
          >
            <RotateCcw size={12} /> Tout réinitialiser
          </button>
        </div>

        <div className="space-y-2">
          {buildOVERVIEW_WIDGETS(t).map((widget) => {
            const active = visibleWidgets[widget.id] !== false;
            return (
              <div
                key={widget.id}
                onClick={() => onToggle(widget.id)}
                className="flex items-center justify-between p-3 rounded-xl border border-mv-border-soft bg-mv-surface hover:bg-mv-cream-soft/50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-[13px] font-semibold text-mv-ink">{widget.title}</p>
                  <p className="text-[12px] text-mv-ink-soft">{widget.description}</p>
                </div>

                <div className="shrink-0 ml-3">
                  <button
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold rounded-lg transition-all ${
                      active
                        ? "bg-mv-green/10 text-mv-green-dark border border-mv-green/30"
                        : "bg-mv-cream text-mv-ink-faint border border-mv-border"
                    }`}
                  >
                    {active ? <Eye size={13} /> : <EyeOff size={13} />}
                    {active ? "Visible" : t("hidden")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Button className="w-full" onClick={onClose}>
            {t("finishCustomizing")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
