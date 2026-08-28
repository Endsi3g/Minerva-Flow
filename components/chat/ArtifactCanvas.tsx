"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import type { ActionableArtifactPayload } from "@/lib/types/generative-ui";
import { GenerativeKpiGrid } from "@/components/chat/generative/GenerativeKpiGrid";
import { GenerativeDataTable } from "@/components/chat/generative/GenerativeDataTable";
import { GenerativeChecklist } from "@/components/chat/generative/GenerativeChecklist";
import { GenerativeAlertBanner } from "@/components/chat/generative/GenerativeAlertBanner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
        await onApply(artifact);
      }
      setApplied(true);
      toast.success("Artefact appliqué avec succès aux paramètres du restaurant !");
    } catch {
      toast.error("Erreur lors de l'application des paramètres.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <aside className="flex flex-col h-full bg-[#FAF8F5] border-l border-[#E8E5DF] overflow-hidden w-full select-none">
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
            
            {/* Chart Area if available */}
            {artifact.data.chartData && (
              <div className="bg-white border border-[#E8E5DF] rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0EFEA]">
                  <span className="font-sans font-bold text-xs text-[#1F1E1D]">
                    {artifact.data.chartData.title}
                  </span>
                </div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={artifact.data.chartData.points}>
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
              "Recalcule cette matrice avec une hausse de 10% sur les marges brutes.",
              "Ajoute une étape de validation de commande dans la checklist.",
              "Exporte une version synthétique condensée pour l'équipe du soir.",
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
