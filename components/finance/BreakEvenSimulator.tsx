"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";
import { useState, useOptimistic, useTransition, useMemo } from "react";
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
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceDot,
} from "recharts";

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

  // Generate 30 days curve data for Recharts
  const chartData = useMemo(() => {
    const points = [];
    const dailyRevStep = optimisticValues.monthlyRevenue / 30;
    const dailyCostStep = (optimisticValues.monthlyRevenue * (1 - grossMarginRatio)) / 30;

    for (let day = 1; day <= 30; day += 2) {
      const sales = Math.round(dailyRevStep * day);
      const totalCosts = Math.round(optimisticValues.fixedCosts + dailyCostStep * day);
      const fixed = optimisticValues.fixedCosts;

      points.push({
        day: `J${day}`,
        dayNum: day,
        Ventes: sales,
        "Coûts Totaux": totalCosts,
        "Coûts Fixes": fixed,
      });
    }
    return points;
  }, [optimisticValues.fixedCosts, optimisticValues.monthlyRevenue, grossMarginRatio]);

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
              <CardTitle className="font-heading text-[21px] font-normal text-mv-ink flex items-center gap-2">
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
              <CardDescription className="text-[13px] text-mv-ink-soft font-normal">
                Ajustez vos variables d&apos;exploitation pour calculer en direct votre seuil minimal et la date d&apos;équilibre.
              </CardDescription>
            </div>
          </div>
          <Badge
            tone={isProfitable ? "green" : "red"}
            className="font-normal py-1.5 px-3.5 text-[12.5px] shrink-0"
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

      {/* Main Grid: Sliders Controls & Equilibrium Curve Recharts Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Sliders Controls (Shadcn Card + Slider) */}
        <Card className="border border-mv-border bg-mv-surface p-6 shadow-mv-md rounded-2xl space-y-6">
          <CardHeader className="p-0 border-b border-mv-border-soft pb-3">
            <CardTitle className="font-heading text-[18px] font-normal text-mv-ink">
              Hypothèses &amp; Variables d&apos;Exploitation
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 space-y-6">
            {/* Slider 1: Fixed Costs */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-normal">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Coûts Fixes Mensuels (Loyer, Salaires, Assurance)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Frais récurrents indépendants du volume de ventes</TooltipContent>
                </Tooltip>
                <span className="font-normal text-mv-green-dark">{formatCurrency(optimisticValues.fixedCosts)}</span>
              </div>
              <Slider
                min={5000}
                max={50000}
                step={500}
                value={optimisticValues.fixedCosts}
                onValueChange={handleFixedCostsChange}
                aria-label="Coûts Fixes Mensuels"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint font-normal">
                <span>5 000 $</span>
                <span>25 000 $</span>
                <span>50 000 $</span>
              </div>
            </div>

            {/* Slider 2: Gross Margin % */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-normal">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Taux de Marge Brute (100% - Food Cost %)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Pourcentage restant après paiement des matières premières</TooltipContent>
                </Tooltip>
                <span className="font-normal text-mv-green-dark">{optimisticValues.grossMarginPct}%</span>
              </div>
              <Slider
                min={40}
                max={85}
                step={1}
                value={optimisticValues.grossMarginPct}
                onValueChange={handleGrossMarginChange}
                aria-label="Taux de Marge Brute"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint font-normal">
                <span>40% (Coût élevé)</span>
                <span>65% (Moyenne)</span>
                <span>85% (Excellente marge)</span>
              </div>
            </div>

            {/* Slider 3: Average Basket */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-normal">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Panier Moyen par Client / Transaction
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Dépense moyenne par client par repas ou transaction</TooltipContent>
                </Tooltip>
                <span className="font-normal text-mv-green-dark">{formatCurrency(optimisticValues.avgBasket)}</span>
              </div>
              <Slider
                min={10}
                max={120}
                step={0.5}
                value={optimisticValues.avgBasket}
                onValueChange={handleAvgBasketChange}
                aria-label="Panier Moyen par Client"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint font-normal">
                <span>10,00 $ (Café)</span>
                <span>40,00 $ (Bistro)</span>
                <span>120,00 $ (Gastronomique)</span>
              </div>
            </div>

            {/* Slider 4: Monthly Revenue */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13.5px] font-normal">
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-mv-ink cursor-help border-b border-dashed border-mv-border-soft">
                      Chiffre d&apos;Affaires Mensuel Estimé
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ventes totales brutes prévues sur le mois</TooltipContent>
                </Tooltip>
                <span className="font-normal text-mv-green-dark">{formatCurrency(optimisticValues.monthlyRevenue)}</span>
              </div>
              <Slider
                min={10000}
                max={100000}
                step={1000}
                value={optimisticValues.monthlyRevenue}
                onValueChange={handleMonthlyRevenueChange}
                aria-label="Chiffre d'Affaires Mensuel Estimé"
              />
              <div className="flex justify-between text-[11px] text-mv-ink-faint font-normal">
                <span>10 000 $</span>
                <span>50 000 $</span>
                <span>100 000 $</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Recharts Dynamic Break-Even Equilibrium Chart */}
        <div className="space-y-6">
          <Card className="border border-mv-border bg-mv-surface p-6 shadow-mv-md rounded-2xl">
            <CardHeader className="p-0 border-b border-mv-border-soft pb-3">
              <CardTitle className="font-heading text-[18px] font-normal text-mv-ink">
                Courbe d&apos;Équilibre (Zone de Perte vs Zone de Profit)
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 mt-4">
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k$`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#faf8f5", borderColor: "#e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />

                    <Line type="monotone" dataKey="Coûts Fixes" stroke="#ab7d1f" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Coûts Totaux" stroke="#b5473a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Ventes" stroke="#167f5b" strokeWidth={2.5} dot={false} />

                    {dayBreakEvenReached <= 30 && (
                      <ReferenceDot
                        x={`J${dayBreakEvenReached % 2 === 0 ? dayBreakEvenReached - 1 : dayBreakEvenReached}`}
                        y={Math.round(breakEvenMonthly)}
                        r={6}
                        fill="#167f5b"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex items-center justify-between text-[13px] border-t border-mv-border-soft pt-3 font-normal">
                <span className="text-mv-ink-soft font-normal">Résultat Net Mensuel estimé :</span>
                <span className={`font-normal text-[14.5px] ${isProfitable ? "text-mv-green-dark" : "text-mv-red"}`}>
                  {isProfitable ? "+" : ""}{formatCurrency(netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI Strategic Insights via Shadcn Alert */}
          <Alert variant="default" className="border border-mv-border bg-mv-surface shadow-mv-sm">
            <Sparkles size={18} className="text-mv-green-dark" />
            <AlertTitle className="font-heading font-normal">Recommandation Stratégique Minerva Flow</AlertTitle>
            <AlertDescription className="font-normal text-[13px]">
              {isProfitable ? (
                <>
                  Votre modèle génère un bénéfice net estimé de <strong className="text-mv-ink font-normal">{formatCurrency(netProfit)}</strong>. Pour atteindre le point mort plus tôt (actuellement jour {dayBreakEvenReached}), augmentez votre panier moyen de 2,00 $ ou réduisez les pertes d&apos;ingrédients de 3%.
                </>
              ) : (
                <>
                  Votre niveau de ventes actuel ({formatCurrency(optimisticValues.monthlyRevenue)}) est inférieur au seuil de rentabilité de <strong className="text-mv-ink font-normal">{formatCurrency(breakEvenMonthly)}</strong>. Nous recommandons de viser {dailyCoversNeeded} clients/jour ou de revoir la marge brute des plats vedettes.
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
