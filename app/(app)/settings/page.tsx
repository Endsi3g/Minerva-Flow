"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Switch } from "@/components/ui/Switch";
import { useApp } from "@/lib/app-context";
import { ReferralSettingsTab } from "@/components/chat/ReferralSettingsTab";
import { CompaniesTab } from "@/components/minerva/CompaniesTab";
import { AdPlatformsCard } from "@/components/minerva/AdPlatformsCard";
import { GoogleWorkspaceCard } from "@/components/minerva/GoogleWorkspaceCard";
import {
  createRestaurantAction,
  updateRestaurantAction,
  getConnectionsAction,
  createConnectionAction,
  getAlertRulesAction,
  upsertAlertRuleAction,
} from "@/app/(app)/settings/actions";
import type {
  AlertRule,
  Connection,
  ConnectionStatus,
  ConnectionType,
  Restaurant,
} from "@/lib/types";
import {
  Plus,
  MapPin,
  Clock,
  Landmark,
  CreditCard,
  Bike,
  Mail,
  CalendarCheck2,
  RefreshCw,
  Bell,
  TrendingDown,
  TrendingUp,
  CalendarX,
  PlugZap,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const typeIcon: Record<ConnectionType, typeof Landmark> = {
  banque: Landmark,
  pos: CreditCard,
  livraison: Bike,
  email: Mail,
  reservation: CalendarCheck2,
};

const typeLabel: Record<ConnectionType, string> = {
  banque: "Banque",
  pos: "Point de vente",
  livraison: "Livraison",
  email: "Email",
  reservation: "Réservations",
};

const statusTone: Record<ConnectionStatus, "green" | "red" | "amber"> = {
  connecte: "green",
  erreur: "red",
  attente: "amber",
};

const statusLabel: Record<ConnectionStatus, string> = {
  connecte: "Connecté",
  erreur: "Erreur",
  attente: "En attente",
};

const ruleIcon: Record<AlertRule["type"], typeof TrendingDown> = {
  revenue_drop: TrendingDown,
  expense_spike: TrendingUp,
  missing_day_input: CalendarX,
  broken_sync: PlugZap,
  reservation_anomaly: Users,
};

function AlertRulesTab() {
  const { restaurantId } = useApp();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    getAlertRulesAction(restaurantId).then((data) => {
      setRules(data);
      setLoading(false);
    });
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
    return <p className="text-[13px] text-mv-ink-faint">Chargement…</p>;
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => {
        const Icon = ruleIcon[rule.type];
        return (
          <Card key={rule.id} className={!rule.enabled ? "opacity-60" : undefined}>
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-[15px] font-medium text-mv-ink">{rule.label}</p>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked: boolean) => {
                      updateLocal(rule.id, { enabled: checked });
                      persist(rule, { enabled: checked });
                    }}
                    className="data-checked:bg-mv-green"
                  />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-mv-ink-soft">
                  {rule.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-mv-ink-faint">Seuil</span>
                    <Input
                      type="number"
                      value={rule.threshold}
                      disabled={!rule.enabled}
                      onChange={(e) => updateLocal(rule.id, { threshold: Number(e.target.value) })}
                      onBlur={(e) => persist(rule, { threshold: Number(e.target.value) })}
                      className="h-8 w-20 text-[13px]"
                    />
                    <span className="text-[12px] text-mv-ink-faint">{rule.unit}</span>
                  </div>
                  <label className="flex items-center gap-2 text-[12px] font-semibold text-mv-ink-soft">
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
                    <Bell size={13} /> Notifier
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

function RestaurantFormFields({
  values,
  onChange,
}: {
  values: { name: string; address: string; city: string; timezone: string };
  onChange: (patch: Partial<{ name: string; address: string; city: string; timezone: string }>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nom de l'établissement">
        <Input
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex : Minerva — Vieux-Port"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Adresse">
          <Input value={values.address} onChange={(e) => onChange({ address: e.target.value })} />
        </Field>
        <Field label="Ville">
          <Input value={values.city} onChange={(e) => onChange({ city: e.target.value })} />
        </Field>
      </div>
      <Field label="Fuseau horaire">
        <Input
          value={values.timezone}
          onChange={(e) => onChange({ timezone: e.target.value })}
          placeholder="Ex : America/Montreal"
        />
      </Field>
    </div>
  );
}

function RestaurantsTab() {
  const { restaurants, setRestaurantId } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", timezone: "America/Montreal" });
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm({ name: "", address: "", city: "", timezone: "America/Montreal" });
    setCreateOpen(true);
  }

  function openEdit(r: Restaurant) {
    setEditing(r);
    setForm({ name: r.name, address: r.address, city: r.city, timezone: r.timezone });
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    const created = await createRestaurantAction(form);
    setSaving(false);
    if (created) {
      toast.success("Établissement ajouté.");
      setCreateOpen(false);
      setRestaurantId(created.id);
    } else {
      toast.error("L'ajout de l'établissement a échoué.");
    }
  }

  async function handleUpdate() {
    if (!editing || !form.name.trim()) return;
    setSaving(true);
    const updated = await updateRestaurantAction(editing.id, form);
    setSaving(false);
    if (updated) {
      toast.success("Établissement modifié.");
      setEditing(null);
    } else {
      toast.error("La modification a échoué.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus size={15} /> Ajouter un établissement
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {restaurants.map((r) => (
          <Card key={r.id}>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
              <h3 className="font-display text-[16px] font-medium text-mv-ink">{r.name}</h3>
            </div>
            <div className="space-y-1.5 text-[13px] text-mv-ink-soft">
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-mv-ink-faint" /> {r.address || "—"}
                {r.city ? `, ${r.city}` : ""}
              </p>
              <p className="flex items-center gap-2">
                <Clock size={14} className="text-mv-ink-faint" /> {r.timezone}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(r)}>
                Modifier
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter un établissement"
        description="Créez un nouveau restaurant à gérer dans Minerva Flow."
      >
        <div className="space-y-4">
          <RestaurantFormFields values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          <Button className="w-full" onClick={handleCreate} disabled={!form.name.trim() || saving}>
            {saving ? "Création…" : "Créer l'établissement"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Modifier l'établissement"
        description={editing?.name}
      >
        <div className="space-y-4">
          <RestaurantFormFields values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          <Button className="w-full" onClick={handleUpdate} disabled={!form.name.trim() || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function IntegrationsTab() {
  const { restaurantId } = useApp();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState<ConnectionType>("banque");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    getConnectionsAction(restaurantId).then((data) => {
      setConnections(data);
      setLoading(false);
    });
  }, [restaurantId]);

  async function handleConnect() {
    if (!newName.trim()) return;
    setSaving(true);
    const created = await createConnectionAction(restaurantId, { name: newName.trim(), type: newType });
    setSaving(false);
    if (created) {
      setConnections((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      toast.success("Intégration ajoutée.");
    } else {
      toast.error("L'ajout de l'intégration a échoué.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdPlatformsCard />
        <GoogleWorkspaceCard />
      </div>

      {loading ? (
        <p className="text-[13px] text-mv-ink-faint">Chargement…</p>
      ) : connections.length === 0 ? (
        <Card>
          <p className="text-[13px] text-mv-ink-soft">
            Aucune intégration connectée pour cet établissement.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connections.map((c) => {
            const Icon = typeIcon[c.type];
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-cream-soft text-mv-ink-soft">
                    <Icon size={17} />
                  </div>
                  <Badge tone={statusTone[c.status]} dot>
                    {statusLabel[c.status]}
                  </Badge>
                </div>
                <h3 className="mt-3 font-display text-[15px] font-medium text-mv-ink">{c.name}</h3>
                <p className="text-[12px] text-mv-ink-faint">
                  {typeLabel[c.type]} · {c.lastSync}
                </p>
                {c.detail && <p className="mt-1.5 text-[12px] text-mv-red">{c.detail}</p>}
                <div className="mt-4">
                  {c.status === "erreur" ? (
                    <Button size="sm" variant="secondary" className="w-full">
                      <RefreshCw size={13} /> Reconnecter
                    </Button>
                  ) : c.status === "attente" ? (
                    <Button size="sm" className="w-full">
                      Configurer
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="w-full">
                      Gérer
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader eyebrow="Nouvelle connexion" title="Connecter un service" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Type de service">
            <Select value={newType} onChange={(e) => setNewType(e.target.value as ConnectionType)}>
              <option value="banque">Banque</option>
              <option value="pos">Point de vente</option>
              <option value="livraison">Livraison</option>
              <option value="email">Email</option>
              <option value="reservation">Réservations</option>
            </Select>
          </Field>
          <Field label="Nom du fournisseur">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex : Stripe, Square…"
            />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleConnect} disabled={!newName.trim() || saving}>
              {saving ? "Ajout…" : "Continuer"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Settings" />

      <Tabs defaultValue="restaurants">
        <TabsList className="mb-6 h-auto rounded-full border border-mv-border bg-mv-cream-soft p-1">
          <TabsTrigger
            value="restaurants"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Restaurants
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Intégrations
          </TabsTrigger>
          <TabsTrigger
            value="alertes"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Règles d&apos;alertes
          </TabsTrigger>
          <TabsTrigger
            value="parrainage"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Parrainage
          </TabsTrigger>
          <TabsTrigger
            value="entreprises"
            className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
          >
            Entreprises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurants">
          <RestaurantsTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="alertes">
          <AlertRulesTab />
        </TabsContent>

        <TabsContent value="parrainage">
          <ReferralSettingsTab />
        </TabsContent>

        <TabsContent value="entreprises">
          <CompaniesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
