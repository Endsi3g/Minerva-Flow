"use client";


import { useTranslations, useLocale } from "next-intl";
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
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { LoyaltyTierBadge } from "@/components/minerva/LoyaltyTierBadge";
import { getLoyaltyTier, getVisitBonusMultiplier, loyaltyTierLabel, loyaltyTierOrder, type LoyaltyTierThresholds } from "@/lib/loyalty-tiers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { usePresenceDetail } from "@/lib/presence/context";
import { notifyError } from "@/lib/notify-error";
import { logVisitAction, redeemRewardAction, sendPortalLinkAction, deleteCustomerAction, saveCustomerStaffNoteAction } from "@/app/[locale]/(app)/fidelisation/actions";
import type { Customer, LoyaltyReward, LoyaltyTransactionType } from "@/lib/types";
import { ArrowLeft, Gift, Plus, Send, Trash2 } from "lucide-react";

const txLabelKey: Record<LoyaltyTransactionType, string> = {
  visite: "txVisit",
  echange: "txRedemption",
  ajustement: "txAdjustment",
};

export function CustomerDetailView({
  restaurantId,
  initialCustomer,
  initialStaffNote,
  rewards,
  loyaltyPointsPerDollar,
  loyaltyTierThresholds,
}: {
  restaurantId: string;
  initialCustomer: Customer;
  initialStaffNote: string;
  rewards: LoyaltyReward[];
  loyaltyPointsPerDollar: number;
  loyaltyTierThresholds: LoyaltyTierThresholds;
}) {
  const locale = useLocale();
  const tv = useTranslations("customerDetail");
  const router = useRouter();
  const { role } = useApp();
  const canManage = role === "owner" || role === "manager";
  const canCreate = role === "owner" || role === "manager" || role === "staff";

  const [customer, setCustomer] = useState(initialCustomer);

  usePresenceDetail(`Client : ${customer.name}`);

  const [visitOpen, setVisitOpen] = useState(false);
  const [visitAmount, setVisitAmount] = useState("");
  const [sendingPortalLink, setSendingPortalLink] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [staffNote, setStaffNote] = useState(initialStaffNote);
  const [savedStaffNote, setSavedStaffNote] = useState(initialStaffNote);
  const [savingNote, setSavingNote] = useState(false);

  async function handleSaveStaffNote() {
    setSavingNote(true);
    const ok = await saveCustomerStaffNoteAction(restaurantId, customer.id, staffNote);
    setSavingNote(false);
    if (!ok) {
      notifyError(tv("couldNotSaveThe"));
      return;
    }
    setSavedStaffNote(staffNote);
    toast.success(tv("noteSaved"));
  }

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
      notifyError(tv("couldNotRecordThe"));
    }
  }

  async function handleRedeem(rewardId: string) {
    const updated = await redeemRewardAction(restaurantId, customer.id, rewardId);
    if (updated) {
      setCustomer(updated);
      toast.success(tv("rewardRedeemed"));
    } else {
      notifyError(tv("theRedemptionFailedNot"));
    }
  }

  async function handleSendPortalLink() {
    if (!customer.email) return;
    setSendingPortalLink(true);
    try {
      const result = await sendPortalLinkAction(restaurantId, customer.id);
      if (result.ok) {
        toast.success(tv("linkSentTo", { email: customer.email }));
      } else {
        notifyError(result.error ?? tv("couldNotSendThe"));
      }
    } finally {
      setSendingPortalLink(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(tv("confirmDeleteCustomer", { name: customer.name }))) {
      return;
    }
    setDeleting(true);
    const ok = await deleteCustomerAction(restaurantId, customer.id);
    if (ok) {
      router.push("/fidelisation");
    } else {
      setDeleting(false);
      notifyError(tv("deletionFailed"));
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/fidelisation")}
        className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> {tv("allCustomers")}
      </button>

      <PageHeader
        eyebrow={tv("loyalty")}
        title={customer.name}
        description={[customer.email, customer.phone].filter(Boolean).join(" — ") || tv("noContactDetails")}
        action={
          <div className="flex items-center gap-1.5">
            <Badge tone="green">{customer.loyaltyPoints} points</Badge>
            <LoyaltyTierBadge totalSpent={customer.totalSpent} thresholds={loyaltyTierThresholds} />
            {canManage && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                aria-label={tv("deleteTheCustomer")}
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
          {canCreate && (
            <Card>
              <CardHeader
                eyebrow={tv("service")}
                title={tv("teamNotes")}
                description={tv("allergiesPreferredTableAnd")}
              />
              <Field label={tv("noteAboutThisGuest")}>
                <Textarea
                  id="customer-staff-note"
                  rows={4}
                  maxLength={2000}
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  placeholder={tv("eGNutAllergy")}
                />
              </Field>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[12px] text-mv-ink-faint">{staffNote.length} / 2000</span>
                <Button
                  size="sm"
                  onClick={handleSaveStaffNote}
                  loading={savingNote}
                  disabled={savingNote || staffNote === savedStaffNote}
                >
                  {tv("saveTheNote")}
                </Button>
              </div>
            </Card>
          )}
          <Card>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-mv-cream-soft p-3">
              <div>
                <p className="text-[12px] font-semibold uppercase text-mv-ink-faint">{tv("visits")}</p>
                <p className="font-display text-[16px] font-medium text-mv-ink">{customer.visitCount}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase text-mv-ink-faint">{tv("totalSpent")}</p>
                <p className="font-display text-[16px] font-medium text-mv-ink">{formatCurrency(customer.totalSpent, locale)}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase text-mv-ink-faint">{tv("points")}</p>
                <p className="font-display text-[16px] font-medium text-mv-green-dark">{customer.loyaltyPoints}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {canCreate && (
                <Button size="sm" onClick={() => setVisitOpen(true)} className="flex-1">
                  <Plus size={14} /> {tv("recordAVisit")}
                </Button>
              )}
              {canCreate && customer.email && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSendPortalLink}
                  disabled={sendingPortalLink}
                  className="flex-1"
                  title={tv("sendsAPasswordlessSign")}
                >
                  <Send size={14} />
                  {sendingPortalLink ? tv("sending") : tv("portalLink")}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow={tv("trend")} title={tv("pointsBalanceOverTime")} />
            {pointsHistory.length < 2 ? (
              <p className="text-[12.5px] text-mv-ink-faint">{tv("notEnoughTransactionsYet")}</p>
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
                      tickFormatter={(d) => formatDate(d, locale)}
                      tick={{ fontSize: 12, fill: "var(--mv-ink-faint)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "var(--mv-ink-faint)" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      domain={[0, "dataMax"]}
                      allowDecimals={false}
                      tickFormatter={(v: number) => `${Math.round(v)}`}
                    />
                    <RechartsTooltip
                      formatter={(value: unknown) => [`${value} pts`, "Solde"]}
                      labelFormatter={(d) => formatDate(d as string, locale)}
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
            <CardHeader title={tv("rewards")} description={`${rewards.filter((r) => r.active).length} disponible(s)`} />
            {rewards.filter((r) => r.active).length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">{tv("noRewardsSetUp")}</p>
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
                            {tv("redeem")}
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
            <CardHeader title={tv("history")} description={`${customer.transactions.length} transaction(s)`} />
            {customer.transactions.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">{tv("noTransactionsForThis")}</p>
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
                          <span className="text-[12px] font-semibold text-mv-ink">{tv(txLabelKey[t.type])}</span>
                          <span className="text-[12px] text-mv-ink-faint">{formatDate(t.createdAt, locale)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="text-mv-ink-soft">
                            {t.note ?? (t.amountSpent != null ? formatCurrency(t.amountSpent, locale) : "—")}
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
          title={tv("recordAVisit")}
          description={`Pour ${customer.name}`}
        >
          <form onSubmit={handleVisitSubmit} className="space-y-3">
            <Field label={tv("amountSpent")}>
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
            <Field label={tv("note")} hint={tv("optional")}>
              <Input name="note" placeholder={tv("eGBirthdayGroup")} />
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
              <Button type="submit">{tv("save")}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
