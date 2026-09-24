"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/minerva/PageCard";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { formatCurrency, cn } from "@/lib/utils";
import { formatRestaurantTime } from "@/lib/orders/scheduling";
import { useApp, useCurrentRestaurant } from "@/lib/app-context";
import { planTierAtLeast, type PlanTier } from "@/lib/plan-tier";
import { PlanTierLockedState } from "@/components/ui/PlanTierLockedState";
import { isOrderPaymentUnresolved } from "@/lib/orders/payment-gate";
import type { Order, OrderStatus, OrderPaymentStatus, MenuItem, OrderSource } from "@/lib/types";
import {
  ClipboardList,
  RefreshCw,
  Trash2,
  Plus,
  Minus,
  TrendingUp,
  DollarSign,
  Globe,
  Smartphone,
  Eye,
  Timer,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  List,
  Flame,
  ChefHat,
  PhoneCall,
  Bell,
  BellRing,
} from "lucide-react";
import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  getOrdersForDayAction,
  updateOrderStatusAction,
  deleteOrderAction,
  createOrderAction,
  notifyOrderReadyAction,
  setBusyModeManualAction,
  updateOrderEtaAction,
} from "./actions";
import { notifyError } from "@/lib/notify-error";
import { toast } from "sonner";
import { useRealtimeBus } from "@/lib/realtime/RealtimeProvider";
import { ServiceQuotesPanel } from "./ServiceQuotesPanel";
import type { ServiceQuoteRow } from "@/lib/data/service-quotes";

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

/**
 * Payment state, not the pickup/delivery choice, is the authority: a delivery
 * can be paid at the door and a pickup can be paid online.
 */
function isAwaitingPayment(o: Order): boolean {
  return isOrderPaymentUnresolved(o.paymentStatus, o.depositPaidAmount);
}

function cleanNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(/\[(web|mobile|telephone|pos)\]/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function SourceBadge({ source }: { source?: OrderSource }) {
  if (source === "mobile") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-purple-700 border border-purple-200">
        <Smartphone size={10.5} /> App Mobile
      </span>
    );
  }
  if (source === "web") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200">
        <Globe size={10.5} /> Web
      </span>
    );
  }
  if (source === "pos") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700 border border-slate-200">
        Caisse
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-800 border border-amber-200">
      <PhoneCall size={10.5} /> Manuel
    </span>
  );
}

function DeliveryMeta({ order }: { order: Order }) {
  if (order.fulfillmentMode !== "livraison") return null;
  return (
    <div className="mt-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1.5 text-[11px] text-blue-900">
      <div className="font-semibold">Livraison{order.deliveryEtaMinutes ? ` · ~${order.deliveryEtaMinutes} min` : ""}</div>
      {order.deliveryAddress && <div className="truncate" title={order.deliveryAddress}>{order.deliveryAddress}</div>}
      {order.deliveryFee > 0 && <div className="font-mono text-[10px]">Frais : {formatCurrency(order.deliveryFee)}</div>}
    </div>
  );
}

function ScheduledOrderBadge({ order, timeZone }: { order: Order; timeZone: string }) {
  if (!order.requestedReadyAt) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-violet-800">
      <Clock size={10.5} /> Précommande · {formatRestaurantTime(order.requestedReadyAt, timeZone)}
    </span>
  );
}

/**
 * Inline "prêt vers HH:MM" — staff override for one order's estimate (see
 * updateOrderEstimatedReadyAt). Shows nothing for a non-manager when no
 * estimate is set (there's nothing to show or edit), but always shows the
 * time once one exists, editable or not.
 */
function OrderEtaEditor({
  order,
  restaurantId,
  canManage,
  timeZone,
  onSaved,
}: {
  order: Order;
  restaurantId: string;
  canManage: boolean;
  timeZone: string;
  onSaved: (estimatedReadyAt: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = minutes.trim() === "" ? null : Number(minutes);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) return;
    setSaving(true);
    const ok = await updateOrderEtaAction(restaurantId, order.id, parsed);
    setSaving(false);
    if (ok) {
      onSaved(parsed !== null ? new Date(Date.now() + parsed * 60_000).toISOString() : null);
      setEditing(false);
      setMinutes("");
    } else {
      notifyError("La mise à jour du délai a échoué.");
    }
  }

  if (editing) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          autoFocus
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="min"
          className="w-14 rounded-md border border-mv-border px-1.5 py-0.5 text-[11px]"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-[11px] font-semibold text-mv-green-dark"
        >
          {saving ? "…" : "OK"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-mv-ink-faint">
          Annuler
        </button>
      </div>
    );
  }

  if (!order.estimatedReadyAt && !canManage) return null;

  return (
    <button
      type="button"
      onClick={() => canManage && setEditing(true)}
      disabled={!canManage}
      className="mt-1 flex items-center gap-1 text-[11px] font-medium text-mv-ink-faint transition-colors hover:text-mv-ink-soft disabled:cursor-default"
    >
      <Clock size={11} />
      {order.estimatedReadyAt ? `Prêt vers ${formatRestaurantTime(order.estimatedReadyAt, timeZone)}` : "Ajouter un délai"}
    </button>
  );
}

/** Web Audio synthesis for KDS notification chime — 100% offline, zero network latency */
function playKdsChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch {
    // AudioContext blocked before user interaction
  }
}

/**
 * Ticking Elapsed Time Badge for KDS Tickets. Starts at 0 on both server and
 * client — computing the real elapsed time in the useState initializer would
 * read Date.now() during SSR and again a moment later at hydration, and
 * those two reads never match (real wall-clock time passes in between),
 * triggering a hydration-mismatch warning and a wasted client re-render of
 * the whole ticket tree on every page load. The true value lands a tick
 * later via the effect below, which only ever runs client-side.
 */
function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    function tick() {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)));
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isUrgent = minutes >= 20;
  const isWarning = minutes >= 10 && minutes < 20;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md",
        isUrgent
          ? "bg-mv-red/15 text-mv-red border border-mv-red/30 animate-pulse"
          : isWarning
          ? "bg-mv-amber/15 text-mv-amber-dark border border-mv-amber/30"
          : "bg-mv-green/15 text-mv-green-dark border border-mv-green/30"
      )}
    >
      <Clock size={11} className={cn(isUrgent && "text-mv-red")} />
      {formatted}
      {isUrgent && <span className="text-[10px] uppercase font-bold ml-0.5">Retard</span>}
    </span>
  );
}

/**
 * Manual order entry — phone/walk-in/counter orders. Before this, the only
 * way an order row could ever exist was customer self-service (portal or
 * QR/menu-link), leaving staff with nothing to do here for a customer who
 * just calls in or orders at the counter. Same pricing engine
 * (computeOrderPricing via createOrder) as the self-service paths, so a
 * $12 dish costs $12 no matter which door it came through.
 */
function NewManualOrderModal({
  restaurantId,
  menuItems,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  menuItems: MenuItem[];
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartItems = menuItems
    .map((m) => ({ menuItem: m, quantity: quantities[m.id] ?? 0 }))
    .filter((l) => l.quantity > 0);
  const estimatedSubtotal = cartItems.reduce((sum, l) => sum + l.menuItem.price * l.quantity, 0);

  function adjustQuantity(id: string, delta: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }

  function reset() {
    setQuantities({});
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cartItems.length === 0) {
      notifyError("Ajoutez au moins un article.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const order = await createOrderAction(restaurantId, {
        guestName: String(form.get("guestName") ?? ""),
        guestPhone: String(form.get("guestPhone") ?? "") || null,
        notes: String(form.get("notes") ?? "") || null,
        items: cartItems.map((l) => ({ menuItemId: l.menuItem.id, quantity: l.quantity })),
      });
      if (order) {
        onCreated(order);
        onClose();
        reset();
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError("La création de la commande a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Nouvelle commande"
      description="Téléphone, comptoir ou walk-in — envoyée directement en cuisine."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom du client">
            <Input name="guestName" placeholder="Ex : Famille Tremblay" required />
          </Field>
          <Field label="Téléphone" hint="Optionnel">
            <Input name="guestPhone" type="tel" placeholder="Ex : 514-555-1234" />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-mv-ink-soft">Articles</p>
          {menuItems.length === 0 ? (
            <p className="text-[12.5px] text-mv-ink-faint">Aucun plat actif au menu.</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-mv-border">
              {menuItems.map((m) => {
                const qty = quantities[m.id] ?? 0;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-center justify-between gap-2 px-2.5 py-2",
                      qty > 0 && "bg-mv-green-tint"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-mv-ink">{m.name}</p>
                      <p className="text-[11.5px] text-mv-ink-faint">{formatCurrency(m.price)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjustQuantity(m.id, -1)}
                        disabled={qty === 0}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-mv-border text-mv-ink-soft hover:bg-mv-ink/5 disabled:opacity-40"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-4 text-center text-[13px] font-semibold text-mv-ink">{qty}</span>
                      <button
                        type="button"
                        onClick={() => adjustQuantity(m.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-mv-border text-mv-ink-soft hover:bg-mv-ink/5"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Field label="Notes" hint="Optionnel">
          <Textarea name="notes" placeholder="Ex : allergie aux arachides" rows={2} />
        </Field>

        <div className="flex items-center justify-between border-t border-mv-border-soft pt-4">
          <p className="text-[12.5px] text-mv-ink-soft">
            Sous-total estimé : <span className="font-semibold text-mv-ink">{formatCurrency(estimatedSubtotal)}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || cartItems.length === 0}>
              {isSubmitting ? "Création…" : "Envoyer en cuisine"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

type ChannelFilter = "all" | "direct" | "web" | "mobile" | "manual";

export function CommandesView({
  restaurantId,
  initialOrders,
  dayStart,
  dayEnd,
  menuItems,
  planTier,
  todayMenuViews = 0,
  initialServiceQuotes,
  initialServiceQuotesError,
  taxRate,
  restaurantTimezone,
  initialNowMs,
}: {
  restaurantId: string | null;
  initialOrders: Order[];
  dayStart: string;
  dayEnd: string;
  menuItems: MenuItem[];
  planTier: PlanTier;
  todayMenuViews?: number;
  initialServiceQuotes: ServiceQuoteRow[];
  initialServiceQuotesError: boolean;
  taxRate: number;
  restaurantTimezone: string;
  initialNowMs: number;
}) {
  const { role } = useApp();
  const restaurant = useCurrentRestaurant();
  // Local + optimistic: the AppContext's `restaurants` array is seeded once
  // at page load and has no live refresh path, so it wouldn't reflect a
  // toggle flipped here without this.
  const [busyModeLocal, setBusyModeLocal] = useState(() => restaurant?.busyModeManual ?? false);
  const [busyPending, setBusyPending] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [orders, setOrders] = useState(initialOrders);
  const [loading, setLoading] = useState(false);

  const [clockNowMs, setClockNowMs] = useState(initialNowMs);
  useEffect(() => {
    const timer = setInterval(() => setClockNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [viewMode, setViewMode] = useState<"kds" | "table">("kds");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ChannelFilter>("all");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const hasChannelInsights = planTierAtLeast(planTier, "croissance");

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const canManage = role === "owner" || role === "manager" || role === "staff";
  const canManageQuotes = role === "owner" || role === "manager";
  const { subscribeOrders } = useRealtimeBus();

  // Handle incoming real-time orders via unified bus
  useEffect(() => {
    return subscribeOrders(() => {
      if (soundEnabledRef.current) {
        playKdsChime();
        toast.info("Nouvelle commande reçue en cuisine !", { icon: "🔔" });
      }
      if (restaurantId) {
        getOrdersForDayAction(restaurantId, dayStart, dayEnd).then((rows) => {
          setOrders(rows);
        });
      }
    });
  }, [subscribeOrders, restaurantId, dayStart, dayEnd]);

  // Calculate channel-specific counts across all non-cancelled orders today
  const webOrderCount = orders.filter((o) => o.status !== "annulee" && o.source === "web").length;
  const mobileOrderCount = orders.filter((o) => o.status !== "annulee" && o.source === "mobile").length;
  const manualOrderCount = orders.filter(
    (o) => o.status !== "annulee" && (o.source === "telephone" || o.source === "pos" || (!o.isPublicRequest && !o.source))
  ).length;
  const directOrderCount = webOrderCount + mobileOrderCount;

  // Inter-order interval calculation (cadence between consecutive orders today)
  const chronologicalActiveOrders = [...orders]
    .filter((o) => o.status !== "annulee")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const orderIntervals = new Map<string, number>();
  let totalIntervalMinutes = 0;
  let intervalPairs = 0;

  for (let i = 1; i < chronologicalActiveOrders.length; i++) {
    const prevTime = new Date(chronologicalActiveOrders[i - 1].createdAt).getTime();
    const currTime = new Date(chronologicalActiveOrders[i].createdAt).getTime();
    const diffMin = Math.max(0, Math.round((currTime - prevTime) / 60_000));
    orderIntervals.set(chronologicalActiveOrders[i].id, diffMin);
    totalIntervalMinutes += diffMin;
    intervalPairs++;
  }

  const averageDelayMinutes = intervalPairs > 0 ? Math.round(totalIntervalMinutes / intervalPairs) : null;
  const latestOrder = chronologicalActiveOrders[chronologicalActiveOrders.length - 1];
  const minutesSinceLatestOrder = latestOrder
    ? Math.max(0, Math.round((clockNowMs - new Date(latestOrder.createdAt).getTime()) / 60_000))
    : null;

  // Menu visits & Conversion rate
  const menuViews = todayMenuViews ?? 0;
  const conversionRate =
    menuViews > 0 ? Math.min(100, Math.round((directOrderCount / menuViews) * 1000) / 10) : null;

  // Filter orders according to active channel filter
  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "direct") return o.isPublicRequest || o.source === "web" || o.source === "mobile";
    if (activeFilter === "web") return o.source === "web";
    if (activeFilter === "mobile") return o.source === "mobile";
    if (activeFilter === "manual") {
      return o.source === "telephone" || o.source === "pos" || (!o.isPublicRequest && !o.source);
    }
    return true;
  });

  const totalVolume = filteredOrders.reduce((acc, o) => (o.status !== "annulee" ? acc + o.total : acc), 0);
  const estimatedPlatformCommission = totalVolume * 0.25;
  const orderCount = filteredOrders.filter((o) => o.status !== "annulee").length;

  // KDS Columns
  const awaitingPaymentOrders = filteredOrders.filter(
    (o) => o.status !== "annulee" && o.status !== "servie" && isAwaitingPayment(o)
  );
  const pendingOrders = filteredOrders.filter(
    (o) => (o.status === "soumise" || o.status === "confirmee") && !isAwaitingPayment(o)
  );
  const preparingOrders = filteredOrders.filter((o) => o.status === "en_preparation");
  const readyOrders = filteredOrders.filter((o) => o.status === "prete");
  const servedOrders = filteredOrders.filter((o) => o.status === "servie");

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
    // Optimistic UI update
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const ok = await updateOrderStatusAction(restaurantId, id, status);
    if (!ok) {
      notifyError("La mise à jour du statut a échoué.");
      handleRefresh();
    }
  }

  async function handleNotifyReady(id: string) {
    if (!restaurantId) return;
    setNotifyingId(id);
    const { ok } = await notifyOrderReadyAction(restaurantId, id);
    setNotifyingId(null);
    if (ok) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, readyNotifiedAt: new Date().toISOString() } : o)));
      toast.success("Client notifié.");
    } else {
      notifyError("Impossible de joindre ce client (aucun courriel, notification ou téléphone valide).");
    }
  }

  function handleEtaSaved(id: string, estimatedReadyAt: string | null) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estimatedReadyAt } : o)));
  }

  async function handleToggleBusy() {
    if (!restaurantId) return;
    const next = !busyModeLocal;
    setBusyModeLocal(next);
    setBusyPending(true);
    const ok = await setBusyModeManualAction(restaurantId, next);
    setBusyPending(false);
    if (!ok) {
      setBusyModeLocal(!next);
      notifyError("La mise à jour du mode occupé a échoué.");
    }
  }

  function handleDelete(id: string, guestName: string) {
    if (!restaurantId) return;
    if (!window.confirm(`Supprimer la commande de "${guestName}" ?`)) return;
    deleteOrderAction(restaurantId, id).then((ok) => {
      if (ok) setOrders((prev) => prev.filter((o) => o.id !== id));
      else notifyError("La suppression a échoué.");
    });
  }

  function handleOrderCreated(order: Order) {
    setOrders((prev) => [order, ...prev]);
    toast.success(`Commande créée pour ${order.guestName}.`);
  }

  return (
    <div className="space-y-5">
      {restaurantId && (
        <NewManualOrderModal
          restaurantId={restaurantId}
          menuItems={menuItems}
          open={newOrderOpen}
          onClose={() => setNewOrderOpen(false)}
          onCreated={handleOrderCreated}
        />
      )}
      <PageHeader
        eyebrow="Opérations"
        title="Commandes en direct"
        description="Suivez la file de préparation, les paiements et les commandes du restaurant depuis une vue de cuisine ou une liste détaillée."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button size="sm" onClick={() => setNewOrderOpen(true)}>
                <PhoneCall size={14} /> Nouvelle commande
              </Button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={handleToggleBusy}
                disabled={busyPending}
                title="Affiche un message d'attente aux clients sur le menu en ligne"
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-medium transition-all disabled:opacity-60",
                  busyModeLocal
                    ? "border-mv-amber bg-mv-amber-tint text-mv-amber-dark"
                    : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
                )}
              >
                <Clock size={14} /> {busyModeLocal ? "On est débordés (actif)" : "On est débordés"}
              </button>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-mv-xs">
              <button
                onClick={() => setViewMode("kds")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium rounded-lg transition-all",
                  viewMode === "kds"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                <ChefHat size={14} />
                Écran Cuisine (KDS)
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium rounded-lg transition-all",
                  viewMode === "table"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                <List size={14} />
                Liste
              </button>
            </div>

            {/* Channel filter (All, Direct, Web, Mobile, Manuel) */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-mv-xs">
              <button
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg transition-all",
                  activeFilter === "all"
                    ? "bg-mv-ink text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                Toutes ({orders.length})
              </button>
              <button
                onClick={() => setActiveFilter("direct")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg transition-all",
                  activeFilter === "direct"
                    ? "bg-mv-ink text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
                title="Toutes commandes directes sans intermédiaire (Web & Mobile)"
              >
                <Globe size={12} /> Directes ({directOrderCount})
              </button>
              <button
                onClick={() => setActiveFilter("web")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg transition-all",
                  activeFilter === "web"
                    ? "bg-mv-green-dark text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
                title="Commandes via le menu web / QR code"
              >
                <Globe size={12} /> Web ({webOrderCount})
              </button>
              <button
                onClick={() => setActiveFilter("mobile")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg transition-all",
                  activeFilter === "mobile"
                    ? "bg-mv-ink text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
                title="Commandes issues de l'application mobile iOS"
              >
                <Smartphone size={12} /> Mobile ({mobileOrderCount})
              </button>
              <button
                onClick={() => setActiveFilter("manual")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg transition-all",
                  activeFilter === "manual"
                    ? "bg-amber-800 text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
                title="Commandes manuelles au comptoir ou par téléphone"
              >
                <PhoneCall size={12} /> Manuel ({manualOrderCount})
              </button>
            </div>

            {/* Audio chime toggle */}
            <Button
              size="sm"
              variant={soundEnabled ? "secondary" : "ghost"}
              onClick={() => {
                setSoundEnabled((prev) => {
                  const next = !prev;
                  if (next) playKdsChime();
                  return next;
                });
              }}
              title={soundEnabled ? "Son KDS activé" : "Son KDS coupé"}
              className="text-[12px]"
            >
              {soundEnabled ? <Volume2 size={14} className="text-mv-green-dark" /> : <VolumeX size={14} className="text-mv-ink-faint" />}
              <span className="hidden sm:inline">{soundEnabled ? "Son activé" : "Son muet"}</span>
            </Button>

            <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Rafraîchir
            </Button>
          </div>
        }
      />

      {restaurantId && canManageQuotes && (
        <ServiceQuotesPanel restaurantId={restaurantId} initialQuotes={initialServiceQuotes} initialLoadFailed={initialServiceQuotesError} taxRate={taxRate} restaurantTimezone={restaurantTimezone} initialDay={dayStart} />
      )}

      {/* Metrics Header Grid — 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Volume & Commandes */}
        <Card className="p-4 bg-mv-surface border-mv-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                Volume & Commandes
              </span>
              <div className="h-8 w-8 rounded-full bg-mv-cream flex items-center justify-center text-mv-ink-soft">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="font-display text-[26px] font-bold text-mv-ink">{formatCurrency(totalVolume)}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-mv-border-soft flex flex-wrap items-center gap-1.5 text-[11.5px] text-mv-ink-soft">
            <span className="font-semibold text-mv-ink">{orderCount}</span> commande{orderCount > 1 ? "s" : ""} :
            <span className="inline-flex items-center gap-1 text-mv-ink-soft font-medium bg-mv-cream-soft px-1.5 py-0.5 rounded">
              <Smartphone size={11} aria-hidden="true" /> {mobileOrderCount}
            </span>
            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
              <Globe size={11} aria-hidden="true" /> {webOrderCount}
            </span>
            <span className="inline-flex items-center gap-0.5 text-amber-800 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
              <PhoneCall size={11} aria-hidden="true" /> {manualOrderCount}
            </span>
          </div>
        </Card>

        {/* 2. Rythme & Délai entre Commandes */}
        <Card className="p-4 bg-mv-surface border-mv-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                Rythme & Délai
              </span>
              <div className="h-8 w-8 rounded-full bg-mv-cream flex items-center justify-center text-mv-ink-soft">
                <Timer size={16} />
              </div>
            </div>
            <p className="font-display text-[26px] font-bold text-mv-ink">
              {averageDelayMinutes !== null ? `~${averageDelayMinutes} min` : "—"}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-mv-border-soft text-[11.5px] text-mv-ink-soft">
            {minutesSinceLatestOrder !== null ? (
              <p>
                Dernière commande : <span className="font-semibold text-mv-ink font-mono">{minutesSinceLatestOrder === 0 ? "À l'instant" : `Il y a ${minutesSinceLatestOrder} min`}</span>
              </p>
            ) : (
            <p className="text-mv-ink-faint italic">Aucune commande pour le moment aujourd’hui</p>
            )}
          </div>
        </Card>

        {/* 3. Visites du Menu & Conversion */}
        <Card className="p-4 bg-mv-surface border-mv-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                Visites Menu & Conversion
              </span>
              <div className="h-8 w-8 rounded-full bg-mv-cream flex items-center justify-center text-mv-ink-soft">
                <Eye size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-[26px] font-bold text-mv-ink">{menuViews}</p>
              <span className="text-[12px] text-mv-ink-faint">visites</span>
              {conversionRate !== null && (
                <Badge tone="green" className="ml-auto font-mono text-[11px]">
                  {conversionRate}% conv.
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-mv-border-soft text-[11.5px] text-mv-ink-soft">
            {menuViews > 0 ? (
              <p>
                <span className="font-semibold text-mv-ink">{directOrderCount}</span> commande{directOrderCount > 1 ? "s" : ""} directe{directOrderCount > 1 ? "s" : ""} issue{directOrderCount > 1 ? "s" : ""} du menu
              </p>
            ) : (
              <p className="text-mv-ink-faint">Suivi en direct actif</p>
            )}
          </div>
        </Card>

        {/* 4. Économies de Commission 0% */}
        {hasChannelInsights ? (
          <Card className="p-4 bg-mv-surface border-mv-green/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-green-dark">
                  Économies Commission 0%
                </span>
                <div className="h-8 w-8 rounded-full bg-mv-green/15 flex items-center justify-center text-mv-green-dark">
                  <DollarSign size={16} />
                </div>
              </div>
              <p className="font-display text-[26px] font-bold text-mv-ink">
                {formatCurrency(estimatedPlatformCommission)}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-mv-border-soft text-[11.5px] text-mv-ink-soft">
              Préservés vs. frais 25% Uber Eats / DoorDash
            </div>
          </Card>
        ) : (
          <PlanTierLockedState
            minimumTier="croissance"
            featureName="Suivi des économies de commission"
            description="Filtrez vos commandes par canal et suivez vos économies vs. Uber Eats/DoorDash."
            size="sm"
          />
        )}
      </div>

      {/* Orders Content */}
      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune commande aujourd'hui"
          description="Les nouvelles commandes reçues apparaîtront ici."
          secondaryAction={
            canManage && (
              <Button size="sm" variant="ghost" className="text-[12px]" onClick={() => setNewOrderOpen(true)}>
                <PhoneCall size={13} /> Ou entrez une commande par téléphone
              </Button>
            )
          }
        />
      ) : viewMode === "kds" ? (
        /* ── KDS KANBAN BOARD ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
          {/* 0. En attente de paiement */}
          {awaitingPaymentOrders.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-mv-border bg-mv-surface/70 p-3.5 shadow-mv-sm">
              <div className="flex items-center justify-between pb-2 border-b border-mv-border">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-mv-red" />
                  <h3 className="font-display text-[15px] font-bold text-mv-ink">Attente paiement</h3>
                </div>
                <Badge tone="red">{awaitingPaymentOrders.length}</Badge>
              </div>
              <div className="space-y-3 min-h-[300px]">
                {awaitingPaymentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="group relative rounded-xl border border-mv-red/30 bg-mv-surface p-3.5 shadow-mv-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-[14px] text-mv-ink">{o.guestName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <SourceBadge source={o.source} />
                          <ScheduledOrderBadge order={o} timeZone={restaurantTimezone} />
                          <DeliveryMeta order={o} />
                          {orderIntervals.has(o.id) && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-md bg-mv-cream px-1.5 py-0.5 text-[10px] font-mono text-mv-ink-soft border border-mv-border/80"
                              title="Délai après la commande précédente"
                            >
                              +{orderIntervals.get(o.id)}m
                            </span>
                          )}
                        </div>
                      </div>
                      <ElapsedTimer createdAt={o.createdAt} />
                    </div>
                    <ul className="space-y-1.5 border-t border-mv-border/60 pt-2 text-[13px] text-mv-ink">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between items-center">
                          <span className="font-semibold text-mv-ink">
                            <span className="text-mv-green-dark font-mono font-bold mr-1.5">{i.quantity}×</span>
                            {i.itemName}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {cleanNotes(o.notes) && (
                      <p className="mt-2 rounded-lg bg-mv-cream px-2 py-1 text-[11.5px] italic text-mv-ink-soft">
                        « {cleanNotes(o.notes)} »
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-mv-border/60">
                      <span className="font-mono text-[12px] font-bold text-mv-ink">{formatCurrency(o.total)}</span>
                      <Badge tone={paymentStatusTone[o.paymentStatus] ?? "red"}>
                        {o.depositPaidAmount && o.depositPaidAmount > 0 && o.paymentStatus !== "paye"
                          ? `Acompte reçu · solde ${formatCurrency(Math.max(0, o.total - o.depositPaidAmount))}`
                          : paymentStatusLabel[o.paymentStatus] ?? "Paiement en attente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1. À Préparer */}
          <div className="flex flex-col gap-3 rounded-2xl border border-mv-border bg-mv-surface/70 p-3.5 shadow-mv-sm">
            <div className="flex items-center justify-between pb-2 border-b border-mv-border">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-mv-amber" />
                <h3 className="font-display text-[15px] font-bold text-mv-ink">À Préparer</h3>
              </div>
              <Badge tone="amber">{pendingOrders.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {pendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-mv-ink-faint text-[12.5px]">
                  <CheckCircle2 size={24} className="mb-2 text-mv-ink-faint/60" />
                  Aucun ticket en attente
                </div>
              ) : (
                pendingOrders.map((o) => (
                  <div
                    key={o.id}
                    className="group relative rounded-xl border border-mv-amber/40 bg-mv-surface p-3.5 shadow-mv-sm transition-all hover:shadow-mv hover:border-mv-amber"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-[14px] text-mv-ink">{o.guestName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <SourceBadge source={o.source} />
                          <ScheduledOrderBadge order={o} timeZone={restaurantTimezone} />
                          <DeliveryMeta order={o} />
                          {orderIntervals.has(o.id) && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-md bg-mv-cream px-1.5 py-0.5 text-[10px] font-mono text-mv-ink-soft border border-mv-border/80"
                              title="Délai après la commande précédente"
                            >
                              +{orderIntervals.get(o.id)}m
                            </span>
                          )}
                        </div>
                      </div>
                      <ElapsedTimer createdAt={o.createdAt} />
                    </div>
                    {canManage && (
                      <OrderEtaEditor
                        order={o}
                        restaurantId={restaurantId!}
                        canManage={canManage}
                        timeZone={restaurantTimezone}
                        onSaved={(eta) => handleEtaSaved(o.id, eta)}
                      />
                    )}
                    <ul className="space-y-1.5 border-t border-mv-border/60 pt-2 text-[13px] text-mv-ink">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between items-center">
                          <span className="font-semibold text-mv-ink">
                            <span className="text-mv-green-dark font-mono font-bold mr-1.5">{i.quantity}×</span>
                            {i.itemName}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {cleanNotes(o.notes) && (
                      <p className="mt-2 rounded-lg bg-mv-cream px-2 py-1 text-[11.5px] italic text-mv-ink-soft">
                        « {cleanNotes(o.notes)} »
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-mv-border/60">
                      <span className="font-mono text-[12px] font-bold text-mv-ink">{formatCurrency(o.total)}</span>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleStatusChange(o.id, "en_preparation")}
                          className="text-[11.5px] h-7 px-2.5 bg-mv-amber-dark hover:bg-mv-amber text-white"
                        >
                          <Flame size={12} /> Lancer la prépa
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. En Préparation */}
          <div className="flex flex-col gap-3 rounded-2xl border border-mv-border bg-mv-surface/70 p-3.5 shadow-mv-sm">
            <div className="flex items-center justify-between pb-2 border-b border-mv-border">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-mv-amber-dark" />
                <h3 className="font-display text-[15px] font-bold text-mv-ink">En Cuisine</h3>
              </div>
              <Badge tone="amber">{preparingOrders.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {preparingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-mv-ink-faint text-[12.5px]">
                  <ChefHat size={24} className="mb-2 text-mv-ink-faint/60" />
                  Cuisine libre
                </div>
              ) : (
                preparingOrders.map((o) => (
                  <div
                    key={o.id}
                    className="group relative rounded-xl border border-mv-amber bg-mv-surface p-3.5 shadow-mv-sm transition-all hover:shadow-mv"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-[14px] text-mv-ink">{o.guestName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <SourceBadge source={o.source} />
                          <ScheduledOrderBadge order={o} timeZone={restaurantTimezone} />
                          <DeliveryMeta order={o} />
                          {orderIntervals.has(o.id) && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-md bg-mv-cream px-1.5 py-0.5 text-[10px] font-mono text-mv-ink-soft border border-mv-border/80"
                              title="Délai après la commande précédente"
                            >
                              +{orderIntervals.get(o.id)}m
                            </span>
                          )}
                        </div>
                      </div>
                      <ElapsedTimer createdAt={o.createdAt} />
                    </div>
                    {canManage && (
                      <OrderEtaEditor
                        order={o}
                        restaurantId={restaurantId!}
                        canManage={canManage}
                        timeZone={restaurantTimezone}
                        onSaved={(eta) => handleEtaSaved(o.id, eta)}
                      />
                    )}
                    <ul className="space-y-1.5 border-t border-mv-border/60 pt-2 text-[13px] text-mv-ink">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between items-center">
                          <span className="font-semibold text-mv-ink">
                            <span className="text-mv-amber-dark font-mono font-bold mr-1.5">{i.quantity}×</span>
                            {i.itemName}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {cleanNotes(o.notes) && (
                      <p className="mt-2 rounded-lg bg-mv-cream px-2 py-1 text-[11.5px] italic text-mv-ink-soft">
                        « {cleanNotes(o.notes)} »
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-mv-border/60">
                      <span className="font-mono text-[12px] font-bold text-mv-ink">{formatCurrency(o.total)}</span>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleStatusChange(o.id, "prete")}
                          className="text-[11.5px] h-7 px-2.5 bg-mv-green-dark hover:bg-mv-green text-white"
                        >
                          <CheckCircle2 size={12} /> Prête
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Prête au Comptoir */}
          <div className="flex flex-col gap-3 rounded-2xl border border-mv-border bg-mv-surface/70 p-3.5 shadow-mv-sm">
            <div className="flex items-center justify-between pb-2 border-b border-mv-border">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-mv-green" />
                <h3 className="font-display text-[15px] font-bold text-mv-ink">Prête au Service</h3>
              </div>
              <Badge tone="green">{readyOrders.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {readyOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-mv-ink-faint text-[12.5px]">
                  <CheckCircle2 size={24} className="mb-2 text-mv-ink-faint/60" />
                  Aucun plat en attente de service
                </div>
              ) : (
                readyOrders.map((o) => (
                  <div
                    key={o.id}
                    className="group relative rounded-xl border border-mv-green bg-mv-surface p-3.5 shadow-mv-sm transition-all hover:shadow-mv"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-[14px] text-mv-ink">{o.guestName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <SourceBadge source={o.source} />
                          <ScheduledOrderBadge order={o} timeZone={restaurantTimezone} />
                          <DeliveryMeta order={o} />
                          {orderIntervals.has(o.id) && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-md bg-mv-cream px-1.5 py-0.5 text-[10px] font-mono text-mv-ink-soft border border-mv-border/80"
                              title="Délai après la commande précédente"
                            >
                              +{orderIntervals.get(o.id)}m
                            </span>
                          )}
                        </div>
                      </div>
                      <ElapsedTimer createdAt={o.createdAt} />
                    </div>
                    <ul className="space-y-1.5 border-t border-mv-border/60 pt-2 text-[13px] text-mv-ink">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between items-center">
                          <span className="font-semibold text-mv-ink">
                            <span className="text-mv-green-dark font-mono font-bold mr-1.5">{i.quantity}×</span>
                            {i.itemName}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {cleanNotes(o.notes) && (
                      <p className="mt-2 rounded-lg bg-mv-cream px-2 py-1 text-[11.5px] italic text-mv-ink-soft">
                        « {cleanNotes(o.notes)} »
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-1.5 pt-2 border-t border-mv-border/60">
                      <span className="font-mono text-[12px] font-bold text-mv-ink">{formatCurrency(o.total)}</span>
                      {canManage && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleNotifyReady(o.id)}
                            disabled={notifyingId === o.id}
                            className="text-[11.5px] h-7 px-2 text-mv-ink-soft hover:text-mv-ink"
                            title={o.readyNotifiedAt ? `Notifié à ${formatRestaurantTime(o.readyNotifiedAt, restaurantTimezone)}` : "Notifier le client par courriel/push/SMS"}
                          >
                            {o.readyNotifiedAt ? <BellRing size={12} /> : <Bell size={12} />}
                            {o.readyNotifiedAt ? "Renvoyer" : "Notifier"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(o.id, "servie")}
                            className="text-[11.5px] h-7 px-2.5 border-mv-green text-mv-green-dark hover:bg-mv-green hover:text-white"
                          >
                            <CheckCircle2 size={12} /> Servir
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Servie / Clôturée */}
          <div className="flex flex-col gap-3 rounded-2xl border border-mv-border bg-mv-surface/50 p-3.5 shadow-mv-sm opacity-90">
            <div className="flex items-center justify-between pb-2 border-b border-mv-border">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-mv-ink-faint" />
                <h3 className="font-display text-[15px] font-bold text-mv-ink-soft">Servies</h3>
              </div>
              <Badge tone="neutral">{servedOrders.length}</Badge>
            </div>
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {servedOrders.slice(0, 8).map((o) => (
                <div key={o.id} className="rounded-xl border border-mv-border bg-mv-surface p-2.5 text-[12px]">
                  <div className="flex justify-between items-start font-medium text-mv-ink">
                    <div>
                      <span>{o.guestName}</span>
                      <div className="mt-0.5 flex items-center gap-1">
                        <SourceBadge source={o.source} />
                        <ScheduledOrderBadge order={o} timeZone={restaurantTimezone} />
                        <DeliveryMeta order={o} />
                        {orderIntervals.has(o.id) && (
                          <span className="text-[10px] font-mono text-mv-ink-faint">+{orderIntervals.get(o.id)}m</span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono">{formatCurrency(o.total)}</span>
                  </div>
                  <p className="text-[11px] text-mv-ink-faint mt-0.5">
                    {o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <Table>
          <THead>
            <Th>Heure</Th>
            <Th>Canal</Th>
            <Th>Client</Th>
            <Th>Articles</Th>
            <Th className="text-right">Total</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </THead>
          <tbody>
            {filteredOrders.map((o) => {
              const next = nextStatus[o.status];
              const nextBlockedByPayment = next?.status === "en_preparation" && isAwaitingPayment(o);
              return (
                <Tr key={o.id}>
                  <Td className="text-mv-ink-soft">{formatRestaurantTime(o.createdAt, restaurantTimezone)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <SourceBadge source={o.source} />
                      <ScheduledOrderBadge order={o} timeZone={restaurantTimezone} />
                      <DeliveryMeta order={o} />
                      {orderIntervals.has(o.id) && (
                        <span className="text-[10px] font-mono text-mv-ink-faint" title="Délai par rapport à la commande précédente">
                          +{orderIntervals.get(o.id)}m
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <p className="font-semibold text-mv-ink">{o.guestName}</p>
                    {o.guestPhone && <p className="text-[11.5px] text-mv-ink-faint">{o.guestPhone}</p>}
                    {cleanNotes(o.notes) && (
                      <p className="text-[11px] text-mv-ink-soft italic">« {cleanNotes(o.notes)} »</p>
                    )}
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
                          {o.depositPaidAmount && o.depositPaidAmount > 0 && o.paymentStatus !== "paye"
                            ? `Acompte ${formatCurrency(o.depositPaidAmount)} · solde ${formatCurrency(Math.max(0, o.total - o.depositPaidAmount))}`
                            : paymentStatusLabel[o.paymentStatus]}
                        </Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1.5">
                        {next && nextBlockedByPayment ? (
                          <span className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-red" title="En attente de confirmation du paiement">
                            Attente paiement
                          </span>
                        ) : (
                          next && (
                            <button
                              onClick={() => handleStatusChange(o.id, next.status)}
                              className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10"
                            >
                              {next.label}
                            </button>
                          )
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
