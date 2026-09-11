"use client";

import { useState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Sparkles, Building2, TrendingUp, ShieldCheck } from "lucide-react";
import { type Plan } from "@/lib/billingsdk-config";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

export interface PricingTableFiveProps {
  plans: Plan[];
  title?: string;
  description?: string;
  onPlanSelect?: (planId: string, interval: "monthly" | "yearly") => void;
  className?: string;
  size?: "small" | "medium" | "large";
  theme?: "minimal" | "classic";
}

export function PricingTableFive({
  plans,
  title = "Choisissez votre forfait",
  description = "Deux produits clairs selon votre priorité : rentabiliser votre carte ou fidéliser votre clientèle.",
  onPlanSelect,
  className,
}: PricingTableFiveProps) {
  const [isAnnually, setIsAnnually] = useState(false);
  const uniqueId = useId();

  return (
    <section className={cn("py-8 relative overflow-hidden", className)}>
      <div className="relative container mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-mv-ink">
            {title}
          </h2>
          <p className="mt-2.5 text-mv-ink-soft text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>

          {/* Billing Interval Toggle */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex h-11 items-center rounded-xl border border-mv-border bg-mv-cream-soft p-1 shadow-mv-xs">
              <RadioGroup
                defaultValue="monthly"
                className="flex items-center gap-1"
                onValueChange={(value) => {
                  setIsAnnually(value === "annually");
                }}
              >
                <div className='has-[button[data-state="checked"]]:bg-mv-surface has-[button[data-state="checked"]]:shadow-mv-xs has-[button[data-state="checked"]]:text-mv-ink rounded-lg transition-all'>
                  <RadioGroupItem
                    value="monthly"
                    id={`${uniqueId}-monthly`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`${uniqueId}-monthly`}
                    className="cursor-pointer px-4 py-1.5 text-xs font-semibold text-mv-ink-soft hover:text-mv-ink transition-colors"
                  >
                    Mensuel
                  </Label>
                </div>

                <div className='has-[button[data-state="checked"]]:bg-mv-surface has-[button[data-state="checked"]]:shadow-mv-xs has-[button[data-state="checked"]]:text-mv-ink rounded-lg transition-all'>
                  <RadioGroupItem
                    value="annually"
                    id={`${uniqueId}-annually`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`${uniqueId}-annually`}
                    className="cursor-pointer px-4 py-1.5 text-xs font-semibold text-mv-ink-soft hover:text-mv-ink transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Annuel</span>
                    <span className="rounded bg-mv-green-tint px-1.5 py-0.5 text-[10.5px] font-bold text-mv-green-dark">
                      -25 % (3 mois offerts)
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* 3-Column Plan Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
          {plans.map((plan, index) => {
            const isStarPlan = Boolean(plan.highlight);
            const isEnterprise = plan.id === "marque_blanche";

            // Price calculation
            const rawMonthly = parseFloat(plan.monthlyPrice);
            const rawYearly = parseFloat(plan.yearlyPrice);
            const monthlyEquivalent = isAnnually && !isNaN(rawYearly) ? Math.round(rawYearly / 12) : rawMonthly;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex"
              >
                <div
                  className={cn(
                    "relative flex flex-col justify-between w-full rounded-2xl p-6 sm:p-7 transition-all duration-300",
                    isStarPlan
                      ? "border-2 border-mv-green bg-mv-surface shadow-mv-lg ring-1 ring-mv-green/30 lg:-translate-y-2"
                      : "border border-mv-border bg-mv-surface shadow-mv-sm hover:shadow-mv-md"
                  )}
                >
                  {/* Top Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-mv-xs",
                          isStarPlan
                            ? "bg-mv-green text-white ring-2 ring-mv-surface"
                            : "bg-mv-cream-soft text-mv-ink border border-mv-border"
                        )}
                      >
                        {isStarPlan && <Sparkles size={11} className="text-mv-lime" />}
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header: Title & Subtitle */}
                    <div className="border-b border-mv-border-soft pb-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-xl font-bold text-mv-ink">
                          {plan.title}
                        </h3>
                        {isStarPlan ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                            <TrendingUp size={15} />
                          </span>
                        ) : isEnterprise ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-ink/[0.06] text-mv-ink">
                            <Building2 size={15} />
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-lime/30 text-mv-lime-dark">
                            <ShieldCheck size={15} />
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[13px] leading-snug text-mv-ink-soft">
                        {plan.description}
                      </p>

                      {/* Price Display */}
                      <div className="mt-5 flex items-baseline gap-1.5">
                        {isEnterprise && (
                          <span className="text-xs font-semibold text-mv-ink-faint">
                            À partir de
                          </span>
                        )}
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={isAnnually ? "year" : "month"}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="font-display text-3xl sm:text-4xl font-bold text-mv-ink"
                          >
                            {monthlyEquivalent} $
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-sm text-mv-ink-faint">
                          / mois
                        </span>
                      </div>

                      {isAnnually && !isNaN(rawYearly) && (
                        <p className="mt-1 text-[11.5px] text-mv-green-dark font-medium">
                          {`Facturé ${rawYearly} $ par an (économie de ${Math.round(rawMonthly * 12 - rawYearly)} $)`}
                        </p>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="py-5 space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                        {isStarPlan
                          ? "Fonctionnalités vedettes incluses :"
                          : isEnterprise
                          ? "Infrastructures multi-sites incluses :"
                          : "Outils de protection de marge inclus :"}
                      </p>

                      <ul className="space-y-2.5">
                        {plan.features.map((feature, fIdx) => {
                          const isHighlightedFeature = feature.name.startsWith("Tout ce qui est inclus");
                          return (
                            <li key={fIdx} className="flex items-start gap-2.5 text-[13px]">
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full mt-0.5",
                                  isStarPlan
                                    ? "bg-mv-green text-white"
                                    : "bg-mv-green-tint text-mv-green-dark"
                                )}
                              >
                                <Check size={10} strokeWidth={3} />
                              </span>
                              <span
                                className={cn(
                                  isHighlightedFeature
                                    ? "font-semibold text-mv-ink"
                                    : "text-mv-ink-soft"
                                )}
                              >
                                {feature.name}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4 border-t border-mv-border-soft">
                    <Button
                      onClick={() => onPlanSelect?.(plan.id, isAnnually ? "yearly" : "monthly")}
                      className={cn(
                        "w-full text-center py-2.5 text-[13px] font-semibold transition-all",
                        isStarPlan
                          ? "bg-mv-green text-white hover:bg-mv-green-dark shadow-mv-sm hover:shadow-mv-md"
                          : isEnterprise
                          ? "border border-mv-border bg-mv-cream-soft text-mv-ink hover:bg-mv-cream"
                          : "border border-mv-border bg-mv-surface text-mv-ink hover:bg-mv-cream-soft"
                      )}
                      variant={isStarPlan ? "default" : "secondary"}
                    >
                      {plan.buttonText}
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-mv-ink-faint">
                      {isEnterprise
                        ? "Déploiement et facturation centralisée"
                        : "Sans engagement — annulation en 1 clic"}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
