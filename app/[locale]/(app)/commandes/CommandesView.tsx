"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/minerva/PageCard";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { formatCurrency, formatTime, cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Order, OrderStatus, OrderPaymentStatus, MenuItem } from "@/lib/types";
import {
  ClipboardList,
  RefreshCw,
  Trash2,
  Plus,
  Minus,
  TrendingUp,
  DollarSign,
  QrCode,
  Globe,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  List,
  Flame,
  ChefHat,
  PhoneCall,
} from "lucide-react";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { getOrdersForDayAction, updateOrderStatusAction, deleteOrderAction, createOrderAction } from "./actions";
import { notifyError } from "@/lib/notify-error";
import { toast } from "sonner";
import Link from "next/link";
import { useRealtimeBus } from "@/lib/realtime/RealtimeProvider";

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

export function CommandesView({
  restaurantId,
  initialOrders,
  dayStart,
  dayEnd,
  menuItems,
}: {
  restaurantId: string | null;
  initialOrders: Order[];
  dayStart: string;
  dayEnd: string;
  menuItems: MenuItem[];
}) {
  const { role } = useApp();
  const [orders, setOrders] = useState(initialOrders);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"kds" | "table">("kds");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "direct">("all");
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const canManage = role === "owner" || role === "manager" || role === "staff";
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

  // Calculate metrics
  const filteredOrders = orders.filter((o) => (activeFilter === "direct" ? o.isPublicRequest : true));
  const totalVolume = filteredOrders.reduce((acc, o) => (o.status !== "annulee" ? acc + o.total : acc), 0);
  const estimatedPlatformCommission = totalVolume * 0.25;
  const orderCount = filteredOrders.filter((o) => o.status !== "annulee").length;

  // KDS Columns
  const pendingOrders = filteredOrders.filter((o) => o.status === "soumise" || o.status === "confirmee");
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
        title="Commandes & Écran Cuisine (KDS)"
        description="Gestion en direct des tickets de cuisine et commandes directes sans commission (0% frais Flow)."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button size="sm" onClick={() => setNewOrderOpen(true)}>
                <PhoneCall size={14} /> Nouvelle commande
              </Button>
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

            {/* Channel filter — built but never wired to a control until now */}
            <div className="flex items-center gap-1 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-mv-xs">
              <button
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium rounded-lg transition-all",
                  activeFilter === "all"
                    ? "bg-mv-ink text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                Toutes
              </button>
              <button
                onClick={() => setActiveFilter("direct")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium rounded-lg transition-all",
                  activeFilter === "direct"
                    ? "bg-mv-ink text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
                title="Commandes reçues via votre lien de menu ou QR code, sans intermédiaire"
              >
                <Globe size={13} /> Directes
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
            Préservés par rapport aux commissions 25% Uber Eats / DoorDash
          </p>
        </Card>

        <Card className="p-4 bg-mv-surface border-mv-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
              Volume & Commandes (Aujourd&apos;hui)
            </span>
            <div className="h-8 w-8 rounded-full bg-mv-cream flex items-center justify-center text-mv-ink-soft">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="font-display text-[26px] font-bold text-mv-ink">{formatCurrency(totalVolume)}</p>
          <p className="text-[12px] text-mv-ink-soft mt-1">
            {orderCount} commande{orderCount > 1 ? "s" : ""} traitée{orderCount > 1 ? "s" : ""}
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
          <div className="flex flex-wrap items-center gap-2 mt-1">
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

      {/* Orders Content */}
      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune commande aujourd'hui"
          description="Partagez votre lien de menu ou votre widget web depuis les paramètres pour recevoir des commandes directes."
          action={
            <Link href="/etablissement">
              <Button size="sm" variant="secondary" className="text-[12px]">
                <QrCode size={13} /> Générer QR Code / Widget
              </Button>
            </Link>
          }
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
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
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-bold text-[14px] text-mv-ink">{o.guestName}</p>
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
                    {o.notes && (
                      <p className="mt-2 rounded-lg bg-mv-cream px-2 py-1 text-[11.5px] italic text-mv-ink-soft">
                        « {o.notes} »
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
                <span className="flex h-2.5 w-2.5 rounded-full bg-mv-amber-dark animate-pulse" />
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
                    className="group relative rounded-xl border border-mv-amber bg-gradient-to-b from-mv-amber-tint/40 to-mv-surface p-3.5 shadow-mv-sm transition-all hover:shadow-mv"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-bold text-[14px] text-mv-ink">{o.guestName}</p>
                      <ElapsedTimer createdAt={o.createdAt} />
                    </div>
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
                    {o.notes && (
                      <p className="mt-2 rounded-lg bg-mv-cream px-2 py-1 text-[11.5px] italic text-mv-ink-soft">
                        « {o.notes} »
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
                    className="group relative rounded-xl border border-mv-green bg-gradient-to-b from-mv-green-tint/50 to-mv-surface p-3.5 shadow-mv-sm transition-all hover:shadow-mv"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-bold text-[14px] text-mv-ink">{o.guestName}</p>
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
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-mv-border/60">
                      <span className="font-mono text-[12px] font-bold text-mv-ink">{formatCurrency(o.total)}</span>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStatusChange(o.id, "servie")}
                          className="text-[11.5px] h-7 px-2.5 border-mv-green text-mv-green-dark hover:bg-mv-green hover:text-white"
                        >
                          <CheckCircle2 size={12} /> Servir
                        </Button>
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
                  <div className="flex justify-between items-center font-medium text-mv-ink">
                    <span>{o.guestName}</span>
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
            <Th>Client</Th>
            <Th>Articles</Th>
            <Th className="text-right">Total</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </THead>
          <tbody>
            {filteredOrders.map((o) => {
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
