"use client";

import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import type { Alert, Program } from "@/lib/types";
import { 
  TrendingUp, 
  Sparkles, 
  ChevronRight, 
  Percent, 
  ShieldAlert,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasContextData = {
  totalRevenue: number;
  estimatedMargin: number;
  alerts: Alert[];
  activePrograms: Program[];
};

export function CanvasDefaultContext({
  data,
  onSendPrompt,
}: {
  data: CanvasContextData;
  onSendPrompt?: (promptText: string) => void;
}) {
  const { totalRevenue, estimatedMargin, alerts, activePrograms } = data;
  const marginRate = totalRevenue > 0 ? ((estimatedMargin / totalRevenue) * 100).toFixed(1) : "0.0";

  const criticalAlert = alerts.find((a) => a.severity === "critique") || alerts[0];

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 sm:p-5 select-none bg-mv-cream-soft/60">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-mv-border/40 pb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
          <Sparkles size={13} className="text-mv-green-dark" />
          <span>Contexte Opérationnel</span>
        </div>
        <span className="text-[10px] font-semibold text-mv-green-dark bg-mv-green-tint px-2 py-0.5 rounded-full border border-mv-green/15">
          Temps Réel
        </span>
      </div>

      {/* 1. KPIs Financiers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-mv-ink-faint">
            Aperçu Financier
          </span>
          <span className="text-[10px] text-mv-ink-soft">Mois en cours</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Revenu */}
          <div
            onClick={() =>
              onSendPrompt?.(
                `Fais une analyse détaillée du chiffre d'affaires actuel (${formatCurrency(
                  totalRevenue
                )}) et identifie la dynamique des ventes et leviers de croissance.`
              )
            }
            className={cn(
              "group rounded-xl border border-mv-border/80 bg-mv-surface p-3 transition-all",
              onSendPrompt && "cursor-pointer hover:border-mv-green/50 hover:shadow-mv-sm hover:-translate-y-0.5"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-mv-ink-faint">
                Revenu Net
              </span>
              <TrendingUp size={12} className="text-mv-green-dark opacity-70 group-hover:opacity-100" />
            </div>
            <p className="font-display text-[15px] font-bold text-mv-ink mt-0.5">
              {formatCurrency(totalRevenue)}
            </p>
            <span className="text-[9.5px] font-medium text-emerald-600 flex items-center gap-0.5 mt-0.5">
              +12.4% vs N-1
            </span>
          </div>

          {/* Marge */}
          <div
            onClick={() =>
              onSendPrompt?.(
                `Analyse le taux de marge brute actuel (${marginRate}%) et identifie les postes de coûts matières à optimiser pour accroître la rentabilité.`
              )
            }
            className={cn(
              "group rounded-xl border border-mv-border/80 bg-mv-surface p-3 transition-all",
              onSendPrompt && "cursor-pointer hover:border-mv-green/50 hover:shadow-mv-sm hover:-translate-y-0.5"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-mv-ink-faint">
                Marge Brute
              </span>
              <Percent size={12} className="text-mv-amber opacity-70 group-hover:opacity-100" />
            </div>
            <p className="font-display text-[15px] font-bold text-mv-ink mt-0.5">
              {formatCurrency(estimatedMargin)}
            </p>
            <span className="text-[9.5px] font-medium text-mv-ink-soft mt-0.5 block">
              Taux : <strong className="text-mv-ink">{marginRate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Point de Vigilance / Alerte Interactive */}
      {criticalAlert ? (
        <div>
          <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-wide text-mv-ink-faint">
            Point de Vigilance
          </span>
          <div className="rounded-xl border border-red-200/90 bg-red-50/50 p-3.5 space-y-2 text-mv-ink shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-red-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>{criticalAlert.title}</span>
              </div>
              <Badge tone="red" className="text-[9px] px-1.5 py-0">Urgent</Badge>
            </div>
            <p className="text-[11px] leading-relaxed text-red-950/80">
              {criticalAlert.detail || "Cette anomalie impacte le calcul des marges en temps réel."}
            </p>
            {onSendPrompt && (
              <button
                type="button"
                onClick={() =>
                  onSendPrompt(
                    `Comment régulariser l'alerte suivante : "${criticalAlert.title} - ${criticalAlert.detail}" et quel est l'impact estimé sur la rentabilité de l'établissement ?`
                  )
                }
                className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold py-1.5 shadow-mv-sm transition-all"
              >
                <ShieldAlert size={13} />
                <span>Régulariser avec l&apos;IA</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-wide text-mv-ink-faint">
            Alertes actives
          </span>
          <div className="rounded-xl border border-mv-border/80 bg-mv-surface p-3 text-center text-xs text-mv-ink-faint">
            Aucune alerte critique en cours.
          </div>
        </div>
      )}

      {/* 3. Programmes Actifs */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-mv-ink-faint">
            Programmes Actifs
          </span>
          <span className="text-[10px] text-mv-ink-faint font-mono">Part CA</span>
        </div>

        <div className="space-y-1.5">
          {activePrograms.length === 0 ? (
            <p className="rounded-xl border border-mv-border/80 bg-mv-surface p-3 text-center text-xs text-mv-ink-faint">
              Aucun programme actif actuellement.
            </p>
          ) : (
            activePrograms.map((p) => {
              const sharePercent =
                totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
              return (
                <div
                  key={p.id}
                  onClick={() =>
                    onSendPrompt?.(
                      `Audit de rentabilité spécifique pour le programme "${p.name}". Détaille le chiffre d'affaires généré (${formatCurrency(
                        p.revenue
                      )}), le volume de commandes et propose 3 optimisations pour maximiser le panier moyen.`
                    )
                  }
                  className={cn(
                    "group flex items-center justify-between rounded-xl border border-mv-border/80 bg-mv-surface p-2.5 transition-all text-xs",
                    onSendPrompt && "cursor-pointer hover:border-mv-green/50 hover:bg-mv-cream/50"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-mv-ink truncate block group-hover:text-mv-green-dark transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-mv-ink-faint">
                      {sharePercent}% du CA total
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-mv-ink text-[12px]">
                      {formatCurrency(p.revenue)}
                    </span>
                    {onSendPrompt && (
                      <ChevronRight
                        size={13}
                        className="text-mv-ink-faint group-hover:text-mv-green-dark group-hover:translate-x-0.5 transition-all"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info Tip */}
      <div className="rounded-xl bg-mv-cream border border-mv-border/60 p-2.5 text-[10.5px] text-mv-ink-soft flex items-start gap-2">
        <HelpCircle size={13} className="shrink-0 text-mv-ink-faint mt-0.5" />
        <span>
          Cliquez sur n&apos;importe quelle métrique ou programme pour lancer un audit instantané avec le copilote.
        </span>
      </div>

    </div>
  );
}
