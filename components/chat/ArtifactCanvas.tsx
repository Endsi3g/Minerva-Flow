"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  CheckCircle2,
  Code2,
  Eye,
  Sparkles,
  ArrowRight,
  Layers,
  Sliders,
  RefreshCw,
} from "lucide-react";
import type { ActionableArtifactPayload } from "@/lib/types/generative-ui";
import { GenerativeKpiGrid } from "@/components/chat/generative/GenerativeKpiGrid";
import { GenerativeDataTable } from "@/components/chat/generative/GenerativeDataTable";
import { GenerativeChecklist } from "@/components/chat/generative/GenerativeChecklist";
import { GenerativeAlertBanner } from "@/components/chat/generative/GenerativeAlertBanner";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ArtifactCanvas({
  artifact,
  onClose,
  onApply,
  onSendPrompt,
}: {
  artifact: ActionableArtifactPayload | null;
  onClose?: () => void;
  onApply?: (artifact: ActionableArtifactPayload) => Promise<void>;
  onSendPrompt?: (promptText: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"visual" | "raw">("visual");
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(artifact?.isApplied ?? false);

  // Profitability Simulator Interactive State
  const [priceAdjustmentPct, setPriceAdjustmentPct] = useState(0); // 0 to 20%
  const [volumeAdjustmentPct, setVolumeAdjustmentPct] = useState(0); // -30 to +30%

  // Real-time simulated calculations
  const simulation = useMemo(() => {
    const baseMonthlyRevenue = 42500;
    const baseGrossMarginPct = 72.4;
    const baseAverageTicket = 48.5;

    const simulatedTicket = baseAverageTicket * (1 + priceAdjustmentPct / 100);
    const volumeMultiplier = 1 + volumeAdjustmentPct / 100;
    const simulatedRevenue = baseMonthlyRevenue * (1 + priceAdjustmentPct / 100) * volumeMultiplier;
    
    // Marginal impact on gross margin
    const simulatedMarginPct = Math.min(
      88,
      baseGrossMarginPct + (priceAdjustmentPct * 0.45)
    );

    const baseGrossProfit = baseMonthlyRevenue * (baseGrossMarginPct / 100);
    const simulatedGrossProfit = simulatedRevenue * (simulatedMarginPct / 100);
    const netMonthlyGain = simulatedGrossProfit - baseGrossProfit;

    return {
      simulatedTicket,
      simulatedRevenue,
      simulatedMarginPct,
      netMonthlyGain,
    };
  }, [priceAdjustmentPct, volumeAdjustmentPct]);

  // Dynamically adjusted chart points
  const dynamicChartPoints = useMemo(() => {
    if (!artifact?.data?.chartData?.points) return [];
    const multiplier = 1 + priceAdjustmentPct / 100;
    return artifact.data.chartData.points.map((p) => ({
      ...p,
      marge: Number(((Number(p.marge) || 0) * multiplier).toFixed(2)),
    }));
  }, [artifact, priceAdjustmentPct]);

  if (!artifact) return null;

  const handleCopyRaw = () => {
    const content =
      artifact.data.rawCsv ||
      JSON.stringify(artifact.data.rawJson || artifact.data, null, 2);
    void navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Données de l'artefact copiées !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csvContent =
      artifact.data.rawCsv ||
      "data:text/csv;charset=utf-8," +
        encodeURIComponent(JSON.stringify(artifact.data, null, 2));
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${artifact.title.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fichier CSV téléchargé avec succès !");
  };

  const handleApplySettings = async () => {
    if (applied || isApplying) return;
    setIsApplying(true);
    try {
      if (onApply) {
        await onApply({
          ...artifact,
          summary: `Appliqué avec ajustement prix +${priceAdjustmentPct}% (Gain est. ${formatCurrency(simulation.netMonthlyGain)}/mois)`,
        });
      }
      setApplied(true);
      toast.success("Ajustements de prix appliqués avec succès à la carte du restaurant !");
    } catch {
      toast.error("Erreur lors de l'application des paramètres.");
    } finally {
      setIsApplying(false);
    }
  };

  const resetSimulator = () => {
    setPriceAdjustmentPct(0);
    setVolumeAdjustmentPct(0);
  };

  return (
    <aside className="flex flex-col h-full bg-[#FAF8F5] border-l border-[#E8E5DF] overflow-hidden w-full select-none text-[#1F1E1D]">
      {/* ── 1. Top Header Toolbar ── */}
      <div className="flex flex-col border-b border-[#E8E5DF] bg-white px-4 py-3 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          
          {/* Title & Version Pill */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-[#0E7C5A]/10 text-[#0E7C5A] shrink-0">
              <Layers size={14} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-sm text-[#1F1E1D] truncate">
                  {artifact.title}
                </h3>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 border border-[#E8E5DF] text-[#5A5851]">
                  v{artifact.version}
                </span>
              </div>
              <p className="text-[11px] text-[#8A887F] truncate">
                {artifact.summary}
              </p>
            </div>
          </div>

          {/* Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg text-[#8A887F] hover:text-[#1F1E1D] hover:bg-gray-100 flex items-center justify-center transition-colors"
              title="Fermer le canvas"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center justify-between pt-1 border-t border-[#F0EFEA]">
          {/* Tabs: Visual vs Raw */}
          <div className="flex items-center bg-[#FAF8F5] border border-[#E8E5DF] rounded-xl p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all",
                activeTab === "visual"
                  ? "bg-white text-[#0A3F2F] shadow-2xs"
                  : "text-[#8A887F] hover:text-[#1F1E1D]"
              )}
            >
              <Eye size={12} />
              <span>Aperçu interactif</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all",
                activeTab === "raw"
                  ? "bg-white text-[#0A3F2F] shadow-2xs"
                  : "text-[#8A887F] hover:text-[#1F1E1D]"
              )}
            >
              <Code2 size={12} />
              <span>Données brutes</span>
            </button>
          </div>

          {/* Actions: Copy, CSV, Apply */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyRaw}
              className="h-7 px-2 rounded-lg bg-white border border-[#E2E0D8] hover:bg-gray-50 text-[11px] font-semibold text-[#5A5851] flex items-center gap-1 transition-colors shadow-2xs"
              title="Copier les données"
            >
              {copied ? <Check size={12} className="text-[#0E7C5A]" /> : <Copy size={12} />}
              <span className="hidden sm:inline">Copier</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="h-7 px-2 rounded-lg bg-white border border-[#E2E0D8] hover:bg-gray-50 text-[11px] font-semibold text-[#5A5851] flex items-center gap-1 transition-colors shadow-2xs"
              title="Télécharger en CSV"
            >
              <Download size={12} />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={handleApplySettings}
              disabled={applied || isApplying}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs",
                applied
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                  : "bg-[#0E7C5A] hover:bg-[#0A6348] text-white active:scale-95"
              )}
            >
              <CheckCircle2 size={12} />
              <span>{applied ? "Appliqué" : "Appliquer"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Scrollable Body Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {activeTab === "visual" ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* ── POS Real Data Interactive Profitability Simulator ── */}
            <div className="bg-white border border-[#E8E5DF] rounded-2xl p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0EFEA]">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-[#0E7C5A]/10 text-[#0E7C5A]">
                    <Sliders size={13} />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs sm:text-sm text-[#1F1E1D]">
                      Simulateur de Rentabilité en Direct
                    </h4>
                    <p className="text-[10.5px] text-[#8A887F]">
                      Synchronisé avec vos données de caisse POS
                    </p>
                  </div>
                </div>

                {(priceAdjustmentPct !== 0 || volumeAdjustmentPct !== 0) && (
                  <button
                    type="button"
                    onClick={resetSimulator}
                    className="flex items-center gap-1 text-[10.5px] font-semibold text-[#8A887F] hover:text-[#1F1E1D] transition-colors"
                  >
                    <RefreshCw size={10} />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Price Slider */}
                <div className="space-y-1.5 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E5DF]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#5A5851]">Ajustement Prix Carte</span>
                    <span className="font-bold text-[#0E7C5A] font-mono">
                      +{priceAdjustmentPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={priceAdjustmentPct}
                    onChange={(e) => setPriceAdjustmentPct(Number(e.target.value))}
                    className="w-full accent-[#0E7C5A] cursor-pointer h-1.5 bg-[#E2E0D8] rounded-lg"
                  />
                  <div className="flex justify-between text-[9.5px] text-[#8A887F] font-mono">
                    <span>Actuel (0%)</span>
                    <span>+10%</span>
                    <span>+20%</span>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-1.5 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E5DF]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#5A5851]">Volume Couverts</span>
                    <span className={cn("font-bold font-mono", volumeAdjustmentPct >= 0 ? "text-[#0E7C5A]" : "text-rose-600")}>
                      {volumeAdjustmentPct > 0 ? `+${volumeAdjustmentPct}%` : `${volumeAdjustmentPct}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="5"
                    value={volumeAdjustmentPct}
                    onChange={(e) => setVolumeAdjustmentPct(Number(e.target.value))}
                    className="w-full accent-[#0E7C5A] cursor-pointer h-1.5 bg-[#E2E0D8] rounded-lg"
                  />
                  <div className="flex justify-between text-[9.5px] text-[#8A887F] font-mono">
                    <span>-30%</span>
                    <span>Stable (0%)</span>
                    <span>+30%</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Result KPI Badges */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Gain Net Estimé
                  </span>
                  <span className="font-sans font-bold text-sm sm:text-base text-emerald-900">
                    +{formatCurrency(simulation.netMonthlyGain)}
                  </span>
                  <span className="block text-[9.5px] text-emerald-700 font-medium">
                    / mois
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] text-center">
                  <span className="block text-[10px] font-bold text-[#5A5851] uppercase tracking-wider">
                    Marge Brute
                  </span>
                  <span className="font-sans font-bold text-sm sm:text-base text-[#1F1E1D]">
                    {simulation.simulatedMarginPct.toFixed(1)} %
                  </span>
                  <span className="block text-[9.5px] text-emerald-700 font-semibold">
                    +{((priceAdjustmentPct * 0.45)).toFixed(1)} pts
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E5DF] text-center">
                  <span className="block text-[10px] font-bold text-[#5A5851] uppercase tracking-wider">
                    Ticket Moyen
                  </span>
                  <span className="font-sans font-bold text-sm sm:text-base text-[#1F1E1D]">
                    {formatCurrency(simulation.simulatedTicket)}
                  </span>
                  <span className="block text-[9.5px] text-[#8A887F]">
                    par couvert
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Chart Area */}
            {artifact.data.chartData && (
              <div className="bg-white border border-[#E8E5DF] rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0EFEA]">
                  <span className="font-sans font-bold text-xs text-[#1F1E1D]">
                    {artifact.data.chartData.title} {priceAdjustmentPct > 0 && `(Projeté +${priceAdjustmentPct}%)`}
                  </span>
                </div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicChartPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" />
                      <XAxis
                        dataKey={artifact.data.chartData.xAxisKey}
                        tick={{ fontSize: 10, fill: "#8A887F" }}
                        axisLine={{ stroke: "#E8E5DF" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#8A887F" }}
                        axisLine={{ stroke: "#E8E5DF" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E8E5DF",
                          borderRadius: "12px",
                          fontSize: "11px",
                        }}
                      />
                      {artifact.data.chartData.series.map((s) => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.name}
                          fill={s.color || "#0E7C5A"}
                          radius={[6, 6, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* KPI Grid if available */}
            {artifact.data.kpis && (
              <GenerativeKpiGrid
                data={artifact.data.kpis}
                onMetricClick={(item) =>
                  onSendPrompt?.(`Détaille l'évolution de la métrique ${item.label} (${item.value}).`)
                }
              />
            )}

            {/* Data Table if available */}
            {artifact.data.table && (
              <GenerativeDataTable
                data={artifact.data.table}
                onRowAction={(prompt) => onSendPrompt?.(prompt)}
              />
            )}

            {/* Checklist if available */}
            {artifact.data.checklist && (
              <GenerativeChecklist data={artifact.data.checklist} />
            )}

            {/* Alerts if available */}
            {artifact.data.alerts && artifact.data.alerts.length > 0 && (
              <div className="space-y-2">
                {artifact.data.alerts.map((al) => (
                  <GenerativeAlertBanner
                    key={al.id}
                    alert={al}
                    onActionClick={(prompt) => onSendPrompt?.(prompt)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Raw JSON/CSV View */
          <div className="bg-white border border-[#E8E5DF] rounded-2xl p-4 shadow-2xs font-mono text-[11px] text-[#1F1E1D] overflow-x-auto leading-relaxed max-h-[600px] animate-in fade-in duration-200">
            <pre className="whitespace-pre-wrap">
              {artifact.data.rawCsv || JSON.stringify(artifact.data, null, 2)}
            </pre>
          </div>
        )}

        {/* ── 3. Conversational Iteration Suggestions ── */}
        <div className="mt-4 pt-4 border-t border-[#E8E5DF] space-y-2">
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#5A5851] uppercase tracking-wider">
            <Sparkles size={11} className="text-[#0E7C5A]" />
            Itérer sur cet artefact
          </span>

          <div className="space-y-1.5">
            {[
              `Applique la simulation (+${priceAdjustmentPct}% prix, gain ${formatCurrency(simulation.netMonthlyGain)}) et génère le plan d'action.`,
              "Simule l'impact d'une hausse du coût du bœuf de 10% sur la marge du Burger Wagyu.",
              "Exporte le récapitulatif des ajustements tarifaires pour l'équipe en salle.",
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSendPrompt?.(sug)}
                className="w-full text-left p-2 rounded-xl bg-white hover:bg-emerald-50/50 border border-[#E8E5DF] hover:border-[#0E7C5A]/40 text-xs text-[#5A5851] hover:text-[#0A3F2F] flex items-center justify-between transition-colors shadow-2xs group"
              >
                <span className="truncate pr-2">{sug}</span>
                <ArrowRight size={11} className="text-[#0E7C5A] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}
