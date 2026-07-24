"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/minerva/PageCard";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatTime, cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Order, OrderStatus, OrderPaymentStatus } from "@/lib/types";
import {
  ClipboardList,
  RefreshCw,
  Trash2,
  Zap,
  TrendingUp,
  DollarSign,
  QrCode,
  Globe,
  Share2,
  CheckCircle2,
  Percent,
} from "lucide-react";
import { useState } from "react";
import { getOrdersForDayAction, updateOrderStatusAction, deleteOrderAction } from "./actions";
import { notifyError } from "@/lib/notify-error";
import { toast } from "sonner";
import Link from "next/link";

const statusLabel: Record<OrderStatus, string> = {
  soumise: "Soumise",
  confirmee: "Confirmée",
  en_preparation: "En préparation",
  prete: "Prête",
  servie: "Servie",
  annulee: "Annulée",
};

const statusTone: Record<OrderStatus, "green" | "amber" | "red" | "neutral"> = {
  soumise: "amber",
  confirmee: "amber",
  en_preparation: "amber",
  prete: "green",
  servie: "green",
  annulee: "neutral",
};

const paymentStatusLabel: Partial<Record<OrderPaymentStatus, string>> = {
  en_attente: "Paiement en attente",
  paye: "Payé en ligne",
  echoue: "Paiement échoué",
};

const paymentStatusTone: Partial<Record<OrderPaymentStatus, "green" | "amber" | "red" | "neutral">> = {
  en_attente: "amber",
  paye: "green",
  echoue: "red",
};

const nextStatus: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  soumise: { status: "confirmee", label: "Confirmer" },
  confirmee: { status: "en_preparation", label: "En préparation" },
  en_preparation: { status: "prete", label: "Prête" },
  prete: { status: "servie", label: "Servie" },
};

export function CommandesView({
  restaurantId,
  initialOrders,
  dayStart,
  dayEnd,
}: {
  restaurantId: string | null;
  initialOrders: Order[];
  dayStart: string;
  dayEnd: string;
}) {
  const { role } = useApp();
  const [orders, setOrders] = useState(initialOrders);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "direct">("all");

  const canManage = role === "owner" || role === "manager" || role === "staff";

  // Calculate 0% commission metrics
  const totalVolume = orders.reduce((acc, o) => (o.status !== "annulee" ? acc + o.total : acc), 0);
  const estimatedPlatformCommission = totalVolume * 0.25; // 25% average saved vs UberEats/DoorDash
  const orderCount = orders.filter((o) => o.status !== "annulee").length;

  async function handleRefresh() {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const rows = await getOrdersForDayAction(restaurantId, dayStart, dayEnd);
      setOrders(rows);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    if (!restaurantId) return;
    const ok = await updateOrderStatusAction(restaurantId, id, status);
    if (ok) setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    else notifyError("La mise à jour du statut a échoué.");
  }

  function handleDelete(id: string, guestName: string) {
    if (!restaurantId) return;
    if (!window.confirm(`Supprimer la commande de "${guestName}" ?`)) return;
    deleteOrderAction(restaurantId, id).then((ok) => {
      if (ok) setOrders((prev) => prev.filter((o) => o.id !== id));
      else notifyError("La suppression a échoué.");
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Opérations"
        title="Commandes & Ventes Directes"
        description="Gérez les commandes en direct sans commission tiers (0% frais Flow)."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-mv-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3 py-1.5 text-[12.5px] font-medium rounded-lg transition-all",
                  activeTab === "all"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                Toutes les commandes ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab("direct")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium rounded-lg transition-all",
                  activeTab === "direct"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                <Zap size={14} className="text-mv-amber fill-mv-amber" />
                Commande Directe 0%
              </button>
            </div>

            <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Rafraîchir
            </Button>
          </div>
        }
      />

      {/* Direct Ordering 0% Commission Impact Header Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-mv-green/10 via-mv-cream/40 to-white border-mv-green/20 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-green-dark">
              Économies de Commission 0%
            </span>
            <div className="h-8 w-8 rounded-full bg-mv-green/20 flex items-center justify-center text-mv-green-dark">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="font-display text-[26px] font-bold text-mv-ink">
            {formatCurrency(estimatedPlatformCommission)}
          </p>
          <p className="text-[12px] text-mv-ink-soft mt-1">
            Préservés par rapport au tarif 25% Uber Eats / DoorDash
          </p>
        </Card>

        <Card className="p-4 bg-mv-surface border-mv-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
              Volume Direct (Aujourd'hui)
            </span>
            <div className="h-8 w-8 rounded-full bg-mv-cream flex items-center justify-center text-mv-ink-soft">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="font-display text-[26px] font-bold text-mv-ink">{formatCurrency(totalVolume)}</p>
          <p className="text-[12px] text-mv-ink-soft mt-1">
            {orderCount} commande{orderCount > 1 ? "s" : ""} validée{orderCount > 1 ? "s" : ""}
          </p>
        </Card>

        <Card className="p-4 bg-mv-surface border-mv-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
              Canaux de Commande Directe
            </span>
            <div className="h-8 w-8 rounded-full bg-mv-cream flex items-center justify-center text-mv-ink-soft">
              <Globe size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Link href="/etablissement">
              <Button size="sm" variant="secondary" className="text-[12px]">
                <QrCode size={13} /> Générer QR Code / Widget
              </Button>
            </Link>
            <Link href="/menu">
              <Button size="sm" variant="ghost" className="text-[12px]">
                Lien de la carte →
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune commande aujourd'hui"
          description="Partagez votre lien de menu ou votre widget web depuis les paramètres pour recevoir des commandes directes."
        />
      ) : (
        <Table>
          <THead>
            <Th>Heure</Th>
            <Th>Client</Th>
            <Th>Articles</Th>
            <Th className="text-right">Total</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </THead>
          <tbody>
            {orders.map((o) => {
              const next = nextStatus[o.status];
              return (
                <Tr key={o.id}>
                  <Td className="text-mv-ink-soft">{formatTime(o.createdAt)}</Td>
                  <Td>
                    <p className="font-semibold text-mv-ink">{o.guestName}</p>
                    {o.guestPhone && <p className="text-[11.5px] text-mv-ink-faint">{o.guestPhone}</p>}
                  </Td>
                  <Td className="text-mv-ink-soft">
                    {o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
                  </Td>
                  <Td className="text-right font-semibold text-mv-ink">{formatCurrency(o.total)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge>
                      {o.paymentStatus !== "non_requis" && (
                        <Badge tone={paymentStatusTone[o.paymentStatus]}>
                          {paymentStatusLabel[o.paymentStatus]}
                        </Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1.5">
                        {next && (
                          <button
                            onClick={() => handleStatusChange(o.id, next.status)}
                            className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10"
                          >
                            {next.label}
                          </button>
                        )}
                        {o.status !== "servie" && o.status !== "annulee" && (
                          <button
                            onClick={() => handleStatusChange(o.id, "annulee")}
                            className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-red hover:bg-mv-red/10"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(o.id, o.guestName)}
                          aria-label="Supprimer"
                          className="rounded-md p-1.5 text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-red"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
