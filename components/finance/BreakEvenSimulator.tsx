"use client";

import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import {
  Calculator,
  TrendingUp,
  Target,
  Users,
  Calendar,
  Sparkles,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export function BreakEvenSimulator() {
  const [fixedCosts, setFixedCosts] = useState<number>(18500);
  const [grossMarginPct, setGrossMarginPct] = useState<number>(68);
  const [avgBasket, setAvgBasket] = useState<number>(38.5);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(34500);

  // Calculations
  const grossMarginRatio = grossMarginPct / 100;
  const breakEvenMonthly = grossMarginRatio > 0 ? fixedCosts / grossMarginRatio : 0;
  const breakEvenDaily = breakEvenMonthly / 30;
  const dailyCoversNeeded = avgBasket > 0 ? Math.ceil(breakEvenDaily / avgBasket) : 0;

  const actualDailyRevenue = monthlyRevenue / 30;
  const actualDailyCovers = avgBasket > 0 ? Math.round(actualDailyRevenue / avgBasket) : 0;

  const estimatedGrossProfit = monthlyRevenue * grossMarginRatio;
  const netProfit = estimatedGrossProfit - fixedCosts;
  const isProfitable = netProfit >= 0;

  // Day of month break-even is reached
  const dayBreakEvenReached =
    monthlyRevenue > 0
      ? Math.min(30, Math.ceil((breakEvenMonthly / monthlyRevenue) * 30))
      : 30;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-6 border border-mv-border bg-mv-surface shadow-mv-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mv-border-soft pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark border border-mv-green/20 shrink-0">
              <Calculator size={22} />
            </div>
            <div>
              <h2 className="font-display text-[18px] font-bold text-mv-ink">
                Simulateur de Seuil de Rentabilité &amp; Point Mort
              </h2>
              <p className="text-[13px] text-mv-ink-soft">
                Ajustez vos coûts et votre panier moyen pour calculer en direct le chiffre d&apos;affaires et le nombre de clients quotidiens requis.
              </p>
            </div>
          </div>
          <Badge
            tone={isProfitable ? "green" : "red"}
            className="font-bold py-1 px-3"
          >
            {isProfitable ? (
              <>
                <CheckCircle2 size={13} className="mr-1 inline" /> Modèle Rentable (+{formatCurrency(netProfit)})
              </>
            ) : (
              <>
                <AlertTriangle size={13} className="mr-1 inline" /> Déficit Estimer ({formatCurrency(netProfit)})
              </>
            )}
          </Badge>
        </div>

        {/* Top Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
            <div className="flex items-center justify-between text-mv-ink-faint">
              <span className="text-[11.5px] font-bold uppercase">Point Mort Mensuel</span>
              <Target size={16} className="text-mv-green-dark" />
            </div>
            <p className="mt-2 font-display text-[22px] font-bold text-mv-ink">
              {formatCurrency(breakEvenMonthly)}
            </p>
            <span className="text-[11.5px] text-mv-ink-soft">
              Seuil minimal de revenus
            </span>
          </div>

          <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
            <div className="flex items-center justify-between text-mv-ink-faint">
              <span className="text-[11.5px] font-bold uppercase">Seuil Quotidien</span>
              <DollarSign size={16} className="text-mv-green-dark" />
            </div>
            <p className="mt-2 font-display text-[22px] font-bold text-mv-ink">
              {formatCurrency(breakEvenDaily)} / jour
            </p>
            <span className="text-[11.5px] text-mv-ink-soft">
              Obj. quotidien pour équilibre
            </span>
          </div>

          <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
            <div className="flex items-center justify-between text-mv-ink-faint">
              <span className="text-[11.5px] font-bold uppercase">Clients / Jour Requis</span>
              <Users size={16} className="text-mv-green-dark" />
            </div>
            <p className="mt-2 font-display text-[22px] font-bold text-mv-ink">
              {dailyCoversNeeded} clients
            </p>
            <span className="text-[11.5px] text-mv-ink-soft">
              à {formatCurrency(avgBasket)} / client
            </span>
          </div>

          <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
            <div className="flex items-center justify-between text-mv-ink-faint">
              <span className="text-[11.5px] font-bold uppercase">Jour de Rentabilité</span>
              <Calendar size={16} className="text-mv-amber" />
            </div>
            <p className="mt-2 font-display text-[22px] font-bold text-mv-ink">
              Jour {dayBreakEvenReached} du mois
            </p>
            <span className="text-[11.5px] text-mv-ink-soft">
              {dayBreakEvenReached <= 30 ? "Profit après cette date" : "Hors objectif"}
            </span>
          </div>
        </div>
      </Card>

      {/* Sliders & Visual Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders Controls Card */}
        <Card className="p-6 border border-mv-border bg-mv-surface shadow-mv-md space-y-6">
          <h3 className="font-display text-[16px] font-bold text-mv-ink border-b border-mv-border-soft pb-3">
            Hypothèses &amp; Variables d&apos;Exploitation
          </h3>

          {/* Slider 1: Fixed Costs */}
          <div className="space-y-2">
            <div className="flex justify-between text-[13px] font-semibold">
              <span className="text-mv-ink">Coûts Fixes Mensuels (Loyer, Salaires, Assurance)</span>
              <span className="font-bold text-mv-green-dark">{formatCurrency(fixedCosts)}</span>
            </div>
            <input
              type="range"
              min="5000"
              max="50000"
              step="500"
              value={fixedCosts}
              onChange={(e) => setFixedCosts(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-mv-cream-soft appearance-none cursor-pointer accent-mv-green"
            />
            <div className="flex justify-between text-[10.5px] text-mv-ink-faint">
              <span>5 000 $</span>
              <span>25 000 $</span>
              <span>50 000 $</span>
            </div>
          </div>

          {/* Slider 2: Gross Margin % */}
          <div className="space-y-2">
            <div className="flex justify-between text-[13px] font-semibold">
              <span className="text-mv-ink">Taux de Marge Brute (100% - Food Cost %)</span>
              <span className="font-bold text-mv-green-dark">{grossMarginPct}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="85"
              step="1"
              value={grossMarginPct}
              onChange={(e) => setGrossMarginPct(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-mv-cream-soft appearance-none cursor-pointer accent-mv-green"
            />
            <div className="flex justify-between text-[10.5px] text-mv-ink-faint">
              <span>40% (Coût élevé)</span>
              <span>65% (Moyenne)</span>
              <span>85% (Excellente marge)</span>
            </div>
          </div>

          {/* Slider 3: Average Basket */}
          <div className="space-y-2">
            <div className="flex justify-between text-[13px] font-semibold">
              <span className="text-mv-ink">Panier Moyen par Client / Transaction</span>
              <span className="font-bold text-mv-green-dark">{formatCurrency(avgBasket)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="0.5"
              value={avgBasket}
              onChange={(e) => setAvgBasket(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-mv-cream-soft appearance-none cursor-pointer accent-mv-green"
            />
            <div className="flex justify-between text-[10.5px] text-mv-ink-faint">
              <span>10,00 $ (Café)</span>
              <span>40,00 $ (Bistro)</span>
              <span>120,00 $ (Gastronomique)</span>
            </div>
          </div>

          {/* Slider 4: Monthly Revenue */}
          <div className="space-y-2">
            <div className="flex justify-between text-[13px] font-semibold">
              <span className="text-mv-ink">Chiffre d&apos;Affaires Mensuel Estimé</span>
              <span className="font-bold text-mv-green-dark">{formatCurrency(monthlyRevenue)}</span>
            </div>
            <input
              type="range"
              min="10000"
              max="100000"
              step="1000"
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-mv-cream-soft appearance-none cursor-pointer accent-mv-green"
            />
            <div className="flex justify-between text-[10.5px] text-mv-ink-faint">
              <span>10 000 $</span>
              <span>50 000 $</span>
              <span>100 000 $</span>
            </div>
          </div>
        </Card>

        {/* Visual Break-Even Curve Chart & AI Analysis */}
        <div className="space-y-6">
          <Card className="p-6 border border-mv-border bg-mv-surface shadow-mv-md">
            <h3 className="font-display text-[16px] font-bold text-mv-ink border-b border-mv-border-soft pb-3">
              Courbe d&apos;Équilibre (Zone de Perte vs Zone de Profit)
            </h3>

            <div className="mt-4 h-48 w-full relative flex items-center justify-center bg-mv-cream-soft/50 rounded-xl border border-mv-border-soft p-4">
              {/* SVG Break-Even Curve Illustration */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120">
                {/* Fixed Costs Horizontal Line */}
                <line x1="0" y1="90" x2="300" y2="90" stroke="#ab7d1f" strokeWidth="1.5" strokeDasharray="4" />
                <text x="5" y="85" fill="#ab7d1f" fontSize="9" fontWeight="bold">Coûts Fixes ({formatCurrency(fixedCosts)})</text>

                {/* Total Costs Line (Fixed + Variable) */}
                <line x1="0" y1="90" x2="300" y2="30" stroke="#b5473a" strokeWidth="2" />
                <text x="210" y="32" fill="#b5473a" fontSize="9" fontWeight="bold">Coûts Totaux</text>

                {/* Revenue Line */}
                <line x1="0" y1="110" x2="300" y2="10" stroke="#167f5b" strokeWidth="2.5" />
                <text x="210" y="15" fill="#167f5b" fontSize="9" fontWeight="bold">Ventes ({formatCurrency(monthlyRevenue)})</text>

                {/* Break-Even Intersection Point Circle */}
                <circle cx="160" cy="53" r="5" fill="#167f5b" stroke="#ffffff" strokeWidth="2" />
                <text x="135" y="42" fill="#167f5b" fontSize="10" fontWeight="bold">Point Mort</text>
              </svg>
            </div>

            <div className="mt-4 flex items-center justify-between text-[12.5px] border-t border-mv-border-soft pt-3">
              <span className="text-mv-ink-soft">Résultat Net Mensuel estimé :</span>
              <span className={`font-bold ${isProfitable ? "text-mv-green-dark" : "text-mv-red"}`}>
                {isProfitable ? "+" : ""}{formatCurrency(netProfit)}
              </span>
            </div>
          </Card>

          {/* AI Strategic Insights */}
          <div className="rounded-2xl border border-mv-green/30 bg-mv-green-tint/50 p-5 space-y-2 shadow-mv-sm">
            <div className="flex items-center gap-2 text-[13px] font-bold text-mv-green-dark">
              <Sparkles size={16} />
              Recommandation Stratégique Minerva Flow
            </div>
            <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
              {isProfitable ? (
                <>
                  Votre modèle génère un bénéfice net estimé de <strong className="text-mv-ink">{formatCurrency(netProfit)}</strong>. Pour atteindre le point mort plus tôt (actuellement jour {dayBreakEvenReached}), augmentez votre panier moyen de 2,00 $ ou réduisez les pertes d&apos;ingrédients de 3%.
                </>
              ) : (
                <>
                  Votre niveau de ventes actuel ({formatCurrency(monthlyRevenue)}) est inférieur au seuil de rentabilité de <strong className="text-mv-ink">{formatCurrency(breakEvenMonthly)}</strong>. Nous recommandons de viser {dailyCoversNeeded} clients/jour ou de revoir la marge brute des plats vedettes.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
