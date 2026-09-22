"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Input } from "@/components/minerva/FormField";
import { Switch } from "@/components/ui/Switch";
import { useApp } from "@/lib/app-context";
import { ReferralSettingsTab } from "@/components/chat/ReferralSettingsTab";
import { IntegrationsGrid } from "@/components/minerva/IntegrationsGrid";
import { EditorialLoadingState } from "@/components/ui/EditorialLoadingState";
import {
  getAlertRulesAction,
  upsertAlertRuleAction,
  getMySessionsAction,
  revokeSessionAction,
} from "@/app/[locale]/(app)/settings/actions";
import type { AlertRule } from "@/lib/types";
import type { DeviceSession } from "@/lib/data/sessions";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { Badge } from "@/components/ui/Badge";
import { AlertBanner } from "@/components/ui/AlertBanner";
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
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { formatRelativeTime, cn } from "@/lib/utils";

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

function AlertRulesTab() {
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

const deviceIcon: Record<string, typeof Monitor> = {
  iPhone: Smartphone,
  "Téléphone Android": Smartphone,
  iPad: Tablet,
  "Tablette Android": Tablet,
};

function SecurityTab() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [toRevoke, setToRevoke] = useState<DeviceSession | null>(null);

  useEffect(() => {
    let isMounted = true;
    getMySessionsAction().then((data) => {
      if (isMounted) {
        setSessions(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRevoke() {
    if (!toRevoke) return;
    const ok = await revokeSessionAction(toRevoke.id);
    if (ok) {
      toast.success("Appareil déconnecté.");
      setSessions((prev) => prev.filter((s) => s.id !== toRevoke.id));
    } else {
      toast.error("La déconnexion de cet appareil a échoué.");
    }
  }

  if (loading) {
    return (
      <EditorialLoadingState
        title="Détection des appareils connectés…"
        subtitle="Recherche des sessions actives et des autorisations de sécurité."
        rows={2}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AlertBanner tone="info" title="Vos appareils connectés">
        Plusieurs appareils connectés en même temps, c&apos;est normal (téléphone, ordinateur du resto, etc.) — ceci
        sert surtout à repérer une connexion qui ne vous appartient pas et à la déconnecter. La déconnexion prend
        effet dans les minutes qui suivent, pas instantanément.
      </AlertBanner>
      <div className="space-y-3">
        {sessions.map((s) => {
          const Icon = deviceIcon[s.device] ?? Monitor;
          return (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-[15px] font-medium text-mv-ink">
                        {s.device}
                        {s.browser ? ` — ${s.browser}` : ""}
                      </p>
                      {s.isCurrent && (
                        <Badge tone="green" variant="subtle" size="sm">
                          Cet appareil
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] text-mv-ink-soft">
                      Dernière activité {formatRelativeTime(s.updatedAt)} · Connecté depuis{" "}
                      {formatRelativeTime(s.createdAt)}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </p>
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => setToRevoke(s)}
                    className="shrink-0 rounded-lg border border-mv-border px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-colors hover:border-mv-red/30 hover:text-mv-red"
                  >
                    Déconnecter
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmDestructiveModal
        open={Boolean(toRevoke)}
        onOpenChange={(open) => !open && setToRevoke(null)}
        title="Déconnecter cet appareil ?"
        description={`${toRevoke?.device ?? "Cet appareil"}${toRevoke?.browser ? ` — ${toRevoke.browser}` : ""} sera déconnecté de votre compte. Si c'est bien vous, il vous suffira de vous reconnecter.`}
        actionLabel="Déconnecter"
        onConfirm={handleRevoke}
      />
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "integrations";

  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Paramètres" />

      <Tabs key={defaultTab} defaultValue={defaultTab}>
        <TabsList variant="pills" className="mb-6">
          <TabsTrigger value="integrations">
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="alertes">
            Règles d&apos;alertes
          </TabsTrigger>
          <TabsTrigger value="parrainage">
            Parrainage
          </TabsTrigger>
          <TabsTrigger value="securite">
            Sécurité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <IntegrationsGrid />
        </TabsContent>

        <TabsContent value="alertes">
          <AlertRulesTab />
        </TabsContent>

        <TabsContent value="parrainage">
          <ReferralSettingsTab />
        </TabsContent>

        <TabsContent value="securite">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
