"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { LoyaltyTierBadge } from "@/components/minerva/LoyaltyTierBadge";
import { getLoyaltyTier, getVisitBonusMultiplier, loyaltyTierLabel, loyaltyTierOrder, type LoyaltyTierThresholds } from "@/lib/loyalty-tiers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { notifyError } from "@/lib/notify-error";
import { logVisitAction, redeemRewardAction, sendPortalLinkAction, deleteCustomerAction } from "@/app/[locale]/(app)/fidelisation/actions";
import type { Customer, LoyaltyReward, LoyaltyTransactionType } from "@/lib/types";
import { ArrowLeft, Gift, Plus, Send, Trash2 } from "lucide-react";

const txLabel: Record<LoyaltyTransactionType, string> = {
  visite: "Visite",
  echange: "Échange",
  ajustement: "Ajustement",
};

export function CustomerDetailView({
  restaurantId,
  initialCustomer,
  rewards,
  loyaltyPointsPerDollar,
  loyaltyTierThresholds,
}: {
  restaurantId: string;
  initialCustomer: Customer;
  rewards: LoyaltyReward[];
  loyaltyPointsPerDollar: number;
  loyaltyTierThresholds: LoyaltyTierThresholds;
}) {
  const router = useRouter();
  const { role } = useApp();
  const canManage = role === "owner" || role === "manager";
  const canCreate = role === "owner" || role === "manager" || role === "staff";

  const [customer, setCustomer] = useState(initialCustomer);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitAmount, setVisitAmount] = useState("");
  const [sendingPortalLink, setSendingPortalLink] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rate = loyaltyPointsPerDollar;

  const pointsHistory = useMemo(() => {
    const ascending = [...customer.transactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return ascending.reduce<{ date: string; points: number }[]>((acc, t) => {
      const previous = acc.length > 0 ? acc[acc.length - 1].points : 0;
      acc.push({ date: t.createdAt, points: previous + t.pointsDelta });
      return acc;
    }, []);
  }, [customer.transactions]);

  async function handleVisitSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount") ?? 0);
    const note = String(form.get("note") ?? "") || null;
    if (!Number.isFinite(amount) || amount <= 0) return;

    const tierBefore = getLoyaltyTier(customer.totalSpent, loyaltyTierThresholds);
    const updated = await logVisitAction(restaurantId, customer.id, amount, note);
    if (updated) {
      setCustomer(updated);
      setVisitOpen(false);
      setVisitAmount("");
      (e.target as HTMLFormElement).reset();

      const tierAfter = getLoyaltyTier(updated.totalSpent, loyaltyTierThresholds);
      if (loyaltyTierOrder.indexOf(tierAfter) > loyaltyTierOrder.indexOf(tierBefore)) {
        toast.success(`${updated.name} passe au palier ${loyaltyTierLabel[tierAfter]} !`, { icon: "🎉", duration: 5000 });
      }
    } else {
      notifyError("L'enregistrement de la visite a échoué.");
    }
  }

  async function handleRedeem(rewardId: string) {
    const updated = await redeemRewardAction(restaurantId, customer.id, rewardId);
    if (updated) {
      setCustomer(updated);
      toast.success("Récompense échangée.");
    } else {
      notifyError("L'échange a échoué — solde de points insuffisant ?");
    }
  }

  async function handleSendPortalLink() {
    if (!customer.email) return;
    setSendingPortalLink(true);
    try {
      const result = await sendPortalLinkAction(restaurantId, customer.id);
      if (result.ok) {
        toast.success(`Lien envoyé à ${customer.email}.`);
      } else {
        notifyError(result.error ?? "L'envoi du lien a échoué.");
      }
    } finally {
      setSendingPortalLink(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer la fiche client "${customer.name}" ? Son historique de points et de visites sera perdu.`)) {
      return;
    }
    setDeleting(true);
    const ok = await deleteCustomerAction(restaurantId, customer.id);
    if (ok) {
      router.push("/fidelisation");
    } else {
      setDeleting(false);
      notifyError("La suppression a échoué.");
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/fidelisation")}
        className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> Tous les clients
      </button>

      <PageHeader
        eyebrow="Fidélisation"
        title={customer.name}
        description={[customer.email, customer.phone].filter(Boolean).join(" — ") || "Aucune coordonnée"}
        action={
          <div className="flex items-center gap-1.5">
            <Badge tone="green">{customer.loyaltyPoints} points</Badge>
            <LoyaltyTierBadge totalSpent={customer.totalSpent} thresholds={loyaltyTierThresholds} />
            {canManage && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Supprimer le client"
                className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red/10 hover:text-mv-red disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Card>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-mv-cream-soft p-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Visites</p>
                <p className="font-display text-[16px] font-medium text-mv-ink">{customer.visitCount}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Total dépensé</p>
                <p className="font-display text-[16px] font-medium text-mv-ink">{formatCurrency(customer.totalSpent)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Points</p>
                <p className="font-display text-[16px] font-medium text-mv-green-dark">{customer.loyaltyPoints}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {canCreate && (
                <Button size="sm" onClick={() => setVisitOpen(true)} className="flex-1">
                  <Plus size={14} /> Enregistrer une visite
                </Button>
              )}
              {canCreate && customer.email && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSendPortalLink}
                  disabled={sendingPortalLink}
                  className="flex-1"
                  title="Envoie un lien de connexion sans mot de passe directement au courriel du client"
                >
                  <Send size={14} />
                  {sendingPortalLink ? "Envoi…" : "Lien du portail"}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Évolution" title="Solde de points dans le temps" />
            {pointsHistory.length < 2 ? (
              <p className="text-[12.5px] text-mv-ink-faint">Pas encore assez de transactions pour un graphique.</p>
            ) : (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pointsHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--mv-green)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--mv-green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mv-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => formatDate(d)}
                      tick={{ fontSize: 11, fill: "var(--mv-ink-faint)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--mv-ink-faint)" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      domain={[0, "dataMax"]}
                      allowDecimals={false}
                      tickFormatter={(v: number) => `${Math.round(v)}`}
                    />
                    <RechartsTooltip
                      formatter={(value: unknown) => [`${value} pts`, "Solde"]}
                      labelFormatter={(d) => formatDate(d as string)}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--mv-border)",
                        fontSize: 12.5,
                      }}
                    />
                    <Area type="monotone" dataKey="points" stroke="var(--mv-green)" strokeWidth={2} fill="url(#pointsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Récompenses" description={`${rewards.filter((r) => r.active).length} disponible(s)`} />
            {rewards.filter((r) => r.active).length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">Aucune récompense configurée.</p>
            ) : (
              <div className="space-y-2">
                {rewards
                  .filter((r) => r.active)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Gift size={14} className="text-mv-ink-faint" />
                        <span className="text-[13px] font-medium text-mv-ink">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{r.pointsCost} pts</Badge>
                        {canCreate && (
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={customer.loyaltyPoints < r.pointsCost}
                            onClick={() => handleRedeem(r.id)}
                          >
                            Échanger
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card>
            <CardHeader title="Historique" description={`${customer.transactions.length} transaction(s)`} />
            {customer.transactions.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">Aucune transaction pour ce client.</p>
            ) : (
              <div className="space-y-0">
                {customer.transactions.map((t, i) => {
                  const dotTone =
                    t.type === "visite" ? "bg-mv-green" : t.type === "echange" ? "bg-mv-lime-dark" : "bg-mv-ink-faint";
                  const isLast = i === customer.transactions.length - 1;
                  return (
                    <div key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {!isLast && <span className="absolute left-[5px] top-[14px] bottom-0 w-px bg-mv-border-soft" />}
                      <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-mv-surface shadow-sm ${dotTone}`} />
                      <div className="min-w-0 flex-1 rounded-lg bg-mv-cream-soft p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-mv-ink">{txLabel[t.type]}</span>
                          <span className="text-[11px] text-mv-ink-faint">{formatDate(t.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="text-mv-ink-soft">
                            {t.note ?? (t.amountSpent != null ? formatCurrency(t.amountSpent) : "—")}
                          </span>
                          <span className={t.pointsDelta >= 0 ? "font-semibold text-mv-green-dark" : "font-semibold text-mv-red"}>
                            {t.pointsDelta >= 0 ? "+" : ""}
                            {t.pointsDelta} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {canCreate && (
        <Modal
          open={visitOpen}
          onClose={() => {
            setVisitOpen(false);
            setVisitAmount("");
          }}
          title="Enregistrer une visite"
          description={`Pour ${customer.name}`}
        >
          <form onSubmit={handleVisitSubmit} className="space-y-3">
            <Field label="Montant dépensé">
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                autoFocus
                value={visitAmount}
                onChange={(e) => setVisitAmount(e.target.value)}
              />
            </Field>
            {(() => {
              const amount = Number(visitAmount);
              if (!Number.isFinite(amount) || amount <= 0) return null;
              const multiplier = getVisitBonusMultiplier(amount);
              return (
                <p className="text-[12px] text-mv-ink-soft">
                  ~{Math.round(amount * rate * multiplier)} points{" "}
                  {multiplier > 1 && <span className="font-semibold text-mv-green-dark">(×{multiplier} — bonus gros montant)</span>}
                </p>
              );
            })()}
            <Field label="Note" hint="Optionnel">
              <Input name="note" placeholder="Ex : anniversaire, groupe de 6" />
            </Field>
            <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setVisitOpen(false);
                  setVisitAmount("");
                }}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
