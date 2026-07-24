"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff, LayoutGrid, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export type WidgetItem = {
  id: string;
  title: string;
  description: string;
  category: "kpi" | "analytics" | "operations" | "assistant";
  defaultVisible: boolean;
};

export const OVERVIEW_WIDGETS: WidgetItem[] = [
  {
    id: "widget-kpi-summary",
    title: "Chiffre d'Affaires & KPIs du Mois",
    description: "Métriques de revenus, marge brute et nombre de couverts du mois en cours.",
    category: "kpi",
    defaultVisible: true,
  },
  {
    id: "widget-alerts",
    title: "Alertes Opérationnelles & Stock",
    description: "Signalement des ruptures d'ingrédients et écarts de coût matière.",
    category: "operations",
    defaultVisible: true,
  },
  {
    id: "widget-heatmap",
    title: "Calendrier d'Affluence & Heatmap",
    description: "Heatmap des jours calmes vs jours de pointe du mois.",
    category: "analytics",
    defaultVisible: true,
  },
  {
    id: "widget-trends",
    title: "Tendances Unifiées Recharts",
    description: "Graphiques d'évolution du chiffre d'affaires et de la masse salariale.",
    category: "analytics",
    defaultVisible: true,
  },
  {
    id: "widget-recommendations",
    title: "Recommandations IA & Checklist",
    description: "Actions prioritaires suggérées par Flow AI et statut du démarrage.",
    category: "assistant",
    defaultVisible: true,
  },
];

const STORAGE_KEY = "mv-overview-widget-visibility";

export function useWidgetVisibility() {
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(() => {
    return OVERVIEW_WIDGETS.reduce((acc, w) => {
      acc[w.id] = w.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setVisibleWidgets(JSON.parse(saved));
      }
    } catch {
      // Ignore fallback
    }
  }, []);

  function toggleWidget(id: string) {
    setVisibleWidgets((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  function resetWidgets() {
    const defaults = OVERVIEW_WIDGETS.reduce((acc, w) => {
      acc[w.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setVisibleWidgets(defaults);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch {
      // Ignore
    }
    toast.success("Tous les widgets ont été réaffichés.");
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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personnaliser mes widgets"
      description="Choisissez les widgets et cartes à afficher ou masquer sur votre tableau de bord."
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between border-b border-mv-border-soft pb-2">
          <span className="text-[12px] font-semibold uppercase text-mv-ink-faint tracking-wider">
            Widgets de la vue Overview
          </span>
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11.5px] font-medium text-mv-green-dark hover:underline"
          >
            <RotateCcw size={12} /> Tout réinitialiser
          </button>
        </div>

        <div className="space-y-2">
          {OVERVIEW_WIDGETS.map((widget) => {
            const active = visibleWidgets[widget.id] !== false;
            return (
              <div
                key={widget.id}
                onClick={() => onToggle(widget.id)}
                className="flex items-center justify-between p-3 rounded-xl border border-mv-border-soft bg-mv-surface hover:bg-mv-cream-soft/50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-[13px] font-semibold text-mv-ink">{widget.title}</p>
                  <p className="text-[11.5px] text-mv-ink-soft">{widget.description}</p>
                </div>

                <div className="shrink-0 ml-3">
                  <button
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-semibold rounded-lg transition-all ${
                      active
                        ? "bg-mv-green/10 text-mv-green-dark border border-mv-green/30"
                        : "bg-mv-cream text-mv-ink-faint border border-mv-border"
                    }`}
                  >
                    {active ? <Eye size={13} /> : <EyeOff size={13} />}
                    {active ? "Visible" : "Masqué"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Button className="w-full" onClick={onClose}>
            Terminer la personnalisation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
