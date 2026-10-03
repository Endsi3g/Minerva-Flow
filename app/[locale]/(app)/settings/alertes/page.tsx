"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Input } from "@/components/minerva/FormField";
import { Switch } from "@/components/ui/Switch";
import { useApp } from "@/lib/app-context";
import { EditorialLoadingState } from "@/components/ui/EditorialLoadingState";
import { getAlertRulesAction, upsertAlertRuleAction } from "../actions";
import type { AlertRule } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import {
  Bell,
  TrendingDown,
  TrendingUp,
  CalendarX,
  PlugZap,
  Users,
  PackageX,
  UserX,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SettingsNav } from "../SettingsNav";

const ruleIcon: Record<AlertRule["type"], typeof TrendingDown> = {
  revenue_drop: TrendingDown,
  expense_spike: TrendingUp,
  missing_day_input: CalendarX,
  broken_sync: PlugZap,
  reservation_anomaly: Users,
  low_stock: PackageX,
  unfilled_shift: UserX,
  late_supplier_order: Truck,
};

export default function SettingsAlertesPage() {
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Règles d'alertes" />
      <SettingsNav active="alertes" />
      <AlertRulesList />
    </div>
  );
}

function AlertRulesList() {
  const { restaurantId } = useApp();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!restaurantId) return;
    getAlertRulesAction(restaurantId).then((data) => {
      if (isMounted) {
        setRules(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  function updateLocal(id: string, patch: Partial<AlertRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function persist(rule: AlertRule, patch: { threshold?: number; enabled?: boolean; notify?: boolean }) {
    const updated = await upsertAlertRuleAction(restaurantId, rule.type, patch);
    if (updated) {
      setRules((prev) => prev.map((r) => (r.type === rule.type ? updated : r)));
    } else {
      toast.error("La mise à jour de la règle a échoué.");
    }
  }

  if (loading) {
    return (
      <EditorialLoadingState
        title="Chargement des règles d'alertes…"
        subtitle="Synchronisation des seuils critiques et des déclencheurs automatiques."
        rows={4}
      />
    );
  }

  return (
    <div className="space-y-3.5">
      {rules.map((rule) => {
        const Icon = ruleIcon[rule.type];
        return (
          <Card key={rule.id} className={cn("transition-all duration-200", !rule.enabled && "opacity-65")}>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                  rule.enabled ? "bg-mv-green/10 text-mv-green-dark" : "bg-mv-cream-soft text-mv-ink-faint"
                )}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="font-display text-[15.5px] font-medium text-mv-ink">{rule.label}</p>
                    <Badge tone={rule.enabled ? "green" : "neutral"} variant="subtle" size="sm">
                      {rule.enabled ? "Surveillance active" : "Désactivée"}
                    </Badge>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked: boolean) => {
                      updateLocal(rule.id, { enabled: checked });
                      persist(rule, { enabled: checked });
                    }}
                    className="data-checked:bg-mv-green"
                  />
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-mv-ink-soft">
                  {rule.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-5 pt-2 border-t border-mv-border-soft">
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-semibold uppercase tracking-wider text-mv-ink-faint">Seuil déclencheur :</span>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        value={rule.threshold}
                        disabled={!rule.enabled}
                        onChange={(e) => updateLocal(rule.id, { threshold: Number(e.target.value) })}
                        onBlur={(e) => persist(rule, { threshold: Number(e.target.value) })}
                        className="h-8.5 w-24 pr-8 text-[13px] font-mono font-medium"
                      />
                      <span className="pointer-events-none absolute right-2.5 text-[11.5px] font-semibold text-mv-ink-faint">
                        {rule.unit}
                      </span>
                    </div>
                  </div>
                  <label
                    className={cn(
                      "flex items-center gap-2 text-[12.5px] font-medium transition-colors cursor-pointer",
                      rule.enabled ? "text-mv-ink hover:text-mv-green-dark" : "text-mv-ink-faint pointer-events-none"
                    )}
                  >
                    <Switch
                      size="sm"
                      checked={rule.notify}
                      disabled={!rule.enabled}
                      onCheckedChange={(checked: boolean) => {
                        updateLocal(rule.id, { notify: checked });
                        persist(rule, { notify: checked });
                      }}
                      className="data-checked:bg-mv-green"
                    />
                    <Bell size={13} className={rule.notify ? "text-mv-green" : "opacity-60"} /> Notifier l&apos;équipe
                  </label>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
