"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatTime } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Order, OrderStatus, OrderPaymentStatus } from "@/lib/types";
import { ClipboardList, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { getOrdersForDayAction, updateOrderStatusAction, deleteOrderAction } from "./actions";
import { notifyError } from "@/lib/notify-error";

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

// Only "non_requis" (pay-on-site, today's default) never renders a badge —
// the other three only apply once a guest chooses "Payer en ligne".
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

  const canManage = role === "owner" || role === "manager" || role === "staff";

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
    <div>
      <PageHeader
        eyebrow="Opérations"
        title="Commandes"
        description="Les commandes envoyées depuis votre menu en ligne — jamais confirmées automatiquement."
        action={
          <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Rafraîchir
          </Button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune commande aujourd'hui"
          description="Partagez votre lien de menu depuis la page Menu pour commencer à recevoir des commandes."
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
