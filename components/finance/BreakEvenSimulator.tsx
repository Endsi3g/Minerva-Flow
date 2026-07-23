"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";
import { useState, useOptimistic, useTransition } from "react";
import {
  Calculator,
  Target,
  Users,
  Calendar,
  Sparkles,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

export function BreakEvenSimulator() {
  const [fixedCosts, setFixedCosts] = useState<number>(18500);
  const [grossMarginPct, setGrossMarginPct] = useState<number>(68);
  const [avgBasket, setAvgBasket] = useState<number>(38.5);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(34500);

  const [, startTransition] = useTransition();

  // Optimistic State for Sliders
  const [optimisticValues, setOptimisticValue] = useOptimistic(
    { fixedCosts, grossMarginPct, avgBasket, monthlyRevenue },
    (state, update: Partial<{ fixedCosts: number; grossMarginPct: number; avgBasket: number; monthlyRevenue: number }>) => ({
      ...state,
      ...update,
    })
  );

  function handleFixedCostsChange(val: number) {
    startTransition(() => {
      setOptimisticValue({ fixedCosts: val });
    });
    setFixedCosts(val);
  }

  function handleGrossMarginChange(val: number) {
    startTransition(() => {
      setOptimisticValue({ grossMarginPct: val });
    });
    setGrossMarginPct(val);
  }

  function handleAvgBasketChange(val: number) {
    startTransition(() => {
      setOptimisticValue({ avgBasket: val });
    });
    setAvgBasket(val);
  }

  function handleMonthlyRevenueChange(val: number) {
    startTransition(() => {
      setOptimisticValue({ monthlyRevenue: val });
    });
    setMonthlyRevenue(val);
  }

  // Calculations based on optimistic values for 0ms lag UI feedback
  const grossMarginRatio = optimisticValues.grossMarginPct / 100;
  const breakEvenMonthly = grossMarginRatio > 0 ? optimisticValues.fixedCosts / grossMarginRatio : 0;
  const breakEvenDaily = breakEvenMonthly / 30;
  const dailyCoversNeeded = optimisticValues.avgBasket > 0 ? Math.ceil(breakEvenDaily / optimisticValues.avgBasket) : 0;

  const estimatedGrossProfit = optimisticValues.monthlyRevenue * grossMarginRatio;
  const netProfit = estimatedGrossProfit - optimisticValues.fixedCosts;
  const isProfitable = netProfit >= 0;

  const dayBreakEvenReached =
    optimisticValues.monthlyRevenue > 0
      ? Math.min(30, Math.ceil((breakEvenMonthly / optimisticValues.monthlyRevenue) * 30))
      : 30;

  return (
    <div className="space-y-6">
      {/* Top Banner Card built with Shadcn Card */}
      <Card className="border border-mv-border bg-mv-surface p-6 shadow-mv-md rounded-2xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mv-border-soft pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark border border-mv-green/20 shrink-0">
              <Calculator size={22} />
            </div>
            <div>
              <CardTitle className="font-display text-[20px] font-bold text-mv-ink flex items-center gap-2">
                <span>Simulateur de Seuil de Rentabilité &amp; Point Mort</span>
                <Tooltip>
                  <TooltipTrigger>
                    <button type="button" aria-label="Informations sur le simulateur" className="text-mv-ink-faint hover:text-mv-ink transition-colors">
                      <Info size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Module de calcul interactif du point mort mensuel et du nombre de couverts nécessaires.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription className="text-[13px] text-mv-ink-soft">
                Ajustez vos variables d&apos;exploitation pour calculer en direct votre seuil minimal et la date d&apos;équilibre.
              </CardDescription>
            </div>
          </div>
          <Badge
            tone={isProfitable ? "green" : "red"}
            className="font-bold py-1.5 px-3.5 text-[12.5px] shrink-0"
          >
            {isProfitable ? (
              <>
                <CheckCircle2 size={14} className="mr-1.5 inline" /> Modèle Rentable (+{formatCurrency(netProfit)})
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="mr-1.5 inline" /> Déficit Estimé ({formatCurrency(netProfit)})
              </>
            )}
          </Badge>
        </CardHeader>

        {/* Top Summary Metrics via Shadcn StatCard */}
        <CardContent className="pt-5 p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tooltip>
              <TooltipTrigger>
                <div>
                  <StatCard
                    label="Point Mort Mensuel"
                    value={formatCurrency(breakEvenMonthly)}
                    icon={Target}
                    sublabel="Seuil minimal de revenus"
                    accent="green"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Chiffre d&apos;affaires minimal pour couvrir 100% des coûts fixes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <div>
                  <StatCard
                    label="Seuil Quotidien"
                    value={`${formatCurrency(breakEvenDaily)} / jour`}
                    icon={DollarSign}
                    sublabel="Obj. quotidien pour équilibre"
                    accent="green"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Ventes moyennes nécessaires chaque jour d&apos;ouverture</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <div>
                  <StatCard
                    label="Clients / Jour Requis"
                    value={`${dailyCoversNeeded} clients`}
                    icon={Users}
                    sublabel={`à ${formatCurrency(optimisticValues.avgBasket)} / client`}
                    accent="lime"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Nombre de transactions nécessaires basées sur le panier moyen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <div>
                  <StatCard
                    label="Jour de Rentabilité"
                    value={`Jour ${dayBreakEvenReached} du mois`}
                    icon={Calendar}
                    sublabel={dayBreakEvenReached <= 30 ? "Profit après cette date" : "Hors objectif"}
                    accent="ink"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Jour du mois où tous les coûts fixes sont intégralement remboursés</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Sliders Controls & Equilibrium Curve Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Sliders Controls (Shadcn Card + Slider) */}
        <Card className="border border-mv-border bg-mv-surface p-6 shadow-mv-md rounded-2xl space-y-6">
          <CardHeader className="p-0 border-b border-mv-border-soft pb-3">
            <CardTitle className="font-display text-[17px] font-bold text-mv-ink">
              Hypothèses &amp; Variables d&apos;Exploitation
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-6">
            {/* Slider 1: Fixed Costs */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-semibold">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Coûts Fixes Mensuels (Loyer, Salaires, Assurance)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Frais récurrents indépendants du volume de ventes</TooltipContent>
                </Tooltip>
                <span className="font-bold text-mv-green-dark">{formatCurrency(optimisticValues.fixedCosts)}</span>
              </div>
              <Slider
                min={5000}
                max={50000}
                step={500}
                value={optimisticValues.fixedCosts}
                onValueChange={handleFixedCostsChange}
                aria-label="Coûts Fixes Mensuels"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint">
                <span>5 000 $</span>
                <span>25 000 $</span>
                <span>50 000 $</span>
              </div>
            </div>

            {/* Slider 2: Gross Margin % */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-semibold">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Taux de Marge Brute (100% - Food Cost %)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Pourcentage restant après paiement des matières premières</TooltipContent>
                </Tooltip>
                <span className="font-bold text-mv-green-dark">{optimisticValues.grossMarginPct}%</span>
              </div>
              <Slider
                min={40}
                max={85}
                step={1}
                value={optimisticValues.grossMarginPct}
                onValueChange={handleGrossMarginChange}
                aria-label="Taux de Marge Brute"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint">
                <span>40% (Coût élevé)</span>
                <span>65% (Moyenne)</span>
                <span>85% (Excellente marge)</span>
              </div>
            </div>

            {/* Slider 3: Average Basket */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-semibold">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Panier Moyen par Client / Transaction
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Dépense moyenne par client par repas ou transaction</TooltipContent>
                </Tooltip>
                <span className="font-bold text-mv-green-dark">{formatCurrency(optimisticValues.avgBasket)}</span>
              </div>
              <Slider
                min={10}
                max={120}
                step={0.5}
                value={optimisticValues.avgBasket}
                onValueChange={handleAvgBasketChange}
                aria-label="Panier Moyen par Client"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint">
                <span>10,00 $ (Café)</span>
                <span>40,00 $ (Bistro)</span>
                <span>120,00 $ (Gastronomique)</span>
              </div>
            </div>

            {/* Slider 4: Monthly Revenue */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-semibold">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Chiffre d&apos;Affaires Mensuel Estimé
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ventes totales brutes prévues sur le mois</TooltipContent>
                </Tooltip>
                <span className="font-bold text-mv-green-dark">{formatCurrency(optimisticValues.monthlyRevenue)}</span>
              </div>
              <Slider
                min={10000}
                max={100000}
                step={1000}
                value={optimisticValues.monthlyRevenue}
                onValueChange={handleMonthlyRevenueChange}
                aria-label="Chiffre d'Affaires Mensuel Estimé"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint">
                <span>10 000 $</span>
                <span>50 000 $</span>
                <span>100 000 $</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Break-Even Curve SVG Chart & AI Strategic Alert */}
        <div className="space-y-6">
          <Card className="border border-mv-border bg-mv-surface p-6 shadow-mv-md rounded-2xl">
            <CardHeader className="p-0 border-b border-mv-border-soft pb-3">
              <CardTitle className="font-display text-[17px] font-bold text-mv-ink">
                Courbe d&apos;Équilibre (Zone de Perte vs Zone de Profit)
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 mt-4">
              <div className="h-48 w-full relative flex items-center justify-center bg-mv-cream-soft/60 rounded-xl border border-mv-border-soft p-4">
                {/* SVG Break-Even Curve Illustration */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120">
                  <line x1="0" y1="90" x2="300" y2="90" stroke="#ab7d1f" strokeWidth="1.5" strokeDasharray="4" />
                  <text x="5" y="85" fill="#ab7d1f" fontSize="9" fontWeight="bold">Coûts Fixes ({formatCurrency(optimisticValues.fixedCosts)})</text>

                  <line x1="0" y1="90" x2="300" y2="30" stroke="#b5473a" strokeWidth="2" />
                  <text x="205" y="32" fill="#b5473a" fontSize="9" fontWeight="bold">Coûts Totaux</text>

                  <line x1="0" y1="110" x2="300" y2="10" stroke="#167f5b" strokeWidth="2.5" />
                  <text x="205" y="15" fill="#167f5b" fontSize="9" fontWeight="bold">Ventes ({formatCurrency(optimisticValues.monthlyRevenue)})</text>

                  <circle cx="160" cy="53" r="5" fill="#167f5b" stroke="#ffffff" strokeWidth="2" />
                  <text x="135" y="42" fill="#167f5b" fontSize="10" fontWeight="bold">Point Mort</text>
                </svg>
              </div>

              <div className="mt-4 flex items-center justify-between text-[13px] border-t border-mv-border-soft pt-3 font-medium">
                <span className="text-mv-ink-soft">Résultat Net Mensuel estimé :</span>
                <span className={`font-bold text-[14px] ${isProfitable ? "text-mv-green-dark" : "text-mv-red"}`}>
                  {isProfitable ? "+" : ""}{formatCurrency(netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI Strategic Insights via Shadcn Alert */}
          <Alert variant="default" className="border border-mv-border bg-mv-surface shadow-mv-sm">
            <Sparkles size={18} className="text-mv-green-dark" />
            <AlertTitle>Recommandation Stratégique Minerva Flow</AlertTitle>
            <AlertDescription>
              {isProfitable ? (
                <>
                  Votre modèle génère un bénéfice net estimé de <strong className="text-mv-ink font-bold">{formatCurrency(netProfit)}</strong>. Pour atteindre le point mort plus tôt (actuellement jour {dayBreakEvenReached}), augmentez votre panier moyen de 2,00 $ ou réduisez les pertes d&apos;ingrédients de 3%.
                </>
              ) : (
                <>
                  Votre niveau de ventes actuel ({formatCurrency(optimisticValues.monthlyRevenue)}) est inférieur au seuil de rentabilité de <strong className="text-mv-ink font-bold">{formatCurrency(breakEvenMonthly)}</strong>. Nous recommandons de viser {dailyCoversNeeded} clients/jour ou de revoir la marge brute des plats vedettes.
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
