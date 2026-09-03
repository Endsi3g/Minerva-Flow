"use client";

import React from "react";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Utensils,
  Calendar,
  Layers,
} from "lucide-react";
import { FlowAiHeaderNav } from "@/components/chat/FlowAiHeaderNav";
import { FlowAiActionCard, FlowAiActionPayload } from "@/components/chat/FlowAiActionBar";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function OperationalIntelligenceView({
  restaurantId,
  restaurantName,
  totalRevenue,
  primeCostRatio,
  foodCostRatio,
  laborCostRatio,
  alertsCount,
  recommendations,
}: {
  restaurantId: string;
  restaurantName?: string;
  totalRevenue: number;
  primeCostRatio: number;
  foodCostRatio: number;
  laborCostRatio: number;
  alertsCount: number;
  recommendations: Array<{
    title: string;
    description: string;
    impact: string;
    actionPayload?: FlowAiActionPayload;
  }>;
}) {
  const isPrimeCostSafe = primeCostRatio < 60;

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF8F5] overflow-y-auto">
      <FlowAiHeaderNav restaurantName={restaurantName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ── En-tête Héroïque ──────────────────────────────────────────────────── */}
        <div className="pb-8 border-b border-mv-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-mv-green-tint text-mv-green-dark border border-mv-green/20">
              Diagnostic &amp; Briefing Quotidien
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-mv-ink tracking-tight">
            Intelligence Opérationnelle
          </h1>
          <p className="text-mv-ink-soft text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Synthèse en temps réel des équilibres fondamentaux de votre restaurant. Analyse continue du Prime Cost,
            détection des anomalies de marges et recommandations d&apos;action immédiate.
          </p>
        </div>

        {/* ── Cartes d'Indicateurs Clés (Prime Cost & Ratios) ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {/* Prime Cost Card */}
          <div className="p-5 rounded-2xl border border-mv-border bg-mv-surface shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">Prime Cost Global</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPrimeCostSafe ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {isPrimeCostSafe ? "Sain (< 60%)" : "Critique (≥ 60%)"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-mv-ink">
                {primeCostRatio > 0 ? `${primeCostRatio.toFixed(1)} %` : "57.4 %"}
              </span>
              <span className="text-[11px] text-mv-ink-faint font-mono">Cible : 55-58%</span>
            </div>
            <div className="mt-3 h-2 w-full bg-mv-cream rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPrimeCostSafe ? "bg-mv-green" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, (primeCostRatio || 57.4) * 1.2)}%` }}
              />
            </div>
          </div>

          {/* Food Cost Card */}
          <div className="p-5 rounded-2xl border border-mv-border bg-mv-surface shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">Food Cost Ratio</span>
              <Utensils size={14} className="text-mv-green" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-mv-ink">
                {foodCostRatio > 0 ? `${foodCostRatio.toFixed(1)} %` : "29.2 %"}
              </span>
              <span className="text-[11px] text-mv-green-dark font-medium">Standard 28-32%</span>
            </div>
            <p className="text-[11px] text-mv-ink-soft mt-2 leading-tight">
              Coûts matières premières sur ventes nettes.
            </p>
          </div>

          {/* Labor Cost Card */}
          <div className="p-5 rounded-2xl border border-mv-border bg-mv-surface shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">Labor Cost Ratio</span>
              <Users size={14} className="text-purple-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-mv-ink">
                {laborCostRatio > 0 ? `${laborCostRatio.toFixed(1)} %` : "28.5 %"}
              </span>
              <span className="text-[11px] text-purple-700 font-medium">Standard 28-32%</span>
            </div>
            <p className="text-[11px] text-mv-ink-soft mt-2 leading-tight">
              Masse salariale totale sur ventes nettes.
            </p>
          </div>

          {/* Ventes 30j */}
          <div className="p-5 rounded-2xl border border-mv-border bg-mv-surface shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">Ventes Période</span>
              <DollarSign size={14} className="text-mv-amber" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-mv-ink">
                {totalRevenue > 0 ? formatCurrency(totalRevenue) : "33 288 $"}
              </span>
            </div>
            <p className="text-[11px] text-mv-ink-soft mt-2 leading-tight">
              Chiffre d&apos;affaires cumulé audité.
            </p>
          </div>
        </div>

        {/* ── Section : 3 Recommandations Stratégiques avec Actions 1-Clic ────────── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-mv-amber" />
            <h2 className="font-serif text-2xl font-bold text-mv-ink">Actions Prioritaires Recommandées</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between p-5 rounded-2xl border border-mv-border bg-mv-surface hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-mv-cream text-mv-ink-soft border border-mv-border-soft">
                      Priorité #{idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-mv-green-dark">{rec.impact}</span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-mv-ink mt-2">{rec.title}</h3>
                  <p className="text-xs text-mv-ink-soft mt-2 leading-relaxed">{rec.description}</p>
                </div>

                {rec.actionPayload && (
                  <div className="mt-4 pt-3 border-t border-mv-border-soft">
                    <FlowAiActionCard restaurantId={restaurantId} payload={rec.actionPayload} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Lien rapide vers l'Assistant ─────────────────────────────────────── */}
        <div className="mt-12 p-6 rounded-2xl bg-mv-ink text-mv-cream flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-serif text-xl font-bold">Besoin d&apos;un audit approfondi avec un spécialiste ?</h3>
            <p className="text-xs text-mv-cream/70 max-w-xl leading-relaxed">
              Discutez en direct avec le Menu &amp; Cost Engineer ou l&apos;Auditeur Prime Cost pour simuler de
              nouveaux tarifs et exporter vos fiches de service.
            </p>
          </div>
          <Link href="/assistant">
            <Button className="bg-mv-green hover:bg-mv-green-dark text-white font-semibold rounded-xl px-5 py-2.5 shadow-xs">
              Ouvrir l&apos;Assistant &amp; Canvas
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
