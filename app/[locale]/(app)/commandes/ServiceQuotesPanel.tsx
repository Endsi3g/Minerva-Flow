"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { formatCurrency } from "@/lib/utils";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCopy, Clock3, CookingPot, MapPin, Plus, RefreshCw, Send, Trash2, Utensils, Users } from "lucide-react";
import { toast } from "sonner";
import type { ServiceQuoteLineInput, ServiceQuoteRow } from "@/lib/data/service-quotes";
import { addCalendarDays, formatCalendarDay, formatCalendarTime, getRestaurantDateKey } from "@/lib/orders/production-calendar";
import type { OrderStatus } from "@/lib/types";
import { getServiceQuotesAction, issueServiceQuoteAction, updateOrderStatusAction } from "./actions";

const STATUS: Record<ServiceQuoteRow["status"], string> = {
  requested: "À chiffrer", quoted: "Devis envoyé", accepted: "Accepté", declined: "Refusé",
  expired: "Expiré", converted: "Commande créée", cancelled: "Annulé",
};

export function ServiceQuotesPanel({
  restaurantId,
  initialQuotes,
  initialLoadFailed,
  taxRate,
  restaurantTimezone,
  initialDay,
}: {
  restaurantId: string;
  initialQuotes: ServiceQuoteRow[];
  initialLoadFailed: boolean;
  taxRate: number;
  restaurantTimezone: string;
  initialDay: string;
}) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [loadFailed, setLoadFailed] = useState(initialLoadFailed);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => getRestaurantDateKey(initialDay, restaurantTimezone) ?? initialDay.slice(0, 10));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lines, setLines] = useState<ServiceQuoteLineInput[]>([{ name: "", quantity: 1, unitPrice: 0, description: "" }]);
  const [taxPercent, setTaxPercent] = useState(String(Math.min(30, Math.max(0, taxRate * 100))));
  const [depositPercent, setDepositPercent] = useState("30");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});

  async function refreshQuotes() {
    setRefreshing(true);
    try {
      const result = await getServiceQuotesAction(restaurantId);
      if (result.ok) {
        setQuotes(result.quotes);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  function openQuote(id: string) {
    setExpandedId((current) => current === id ? null : id);
    setOwnerNotes("");
    const quote = quotes.find((item) => item.id === id);
    if (quote?.service_quote_lines?.length) setLines(quote.service_quote_lines);
    else setLines([{ name: "", quantity: 1, unitPrice: 0, description: "" }]);
  }

  function patchLine(index: number, patch: Partial<ServiceQuoteLineInput>) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  }

  async function issue(quote: ServiceQuoteRow) {
    setBusyId(quote.id);
    const result = await issueServiceQuoteAction(
      restaurantId, quote.id, lines, Number(taxPercent) / 100, Number(depositPercent), ownerNotes || null,
    );
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.reason === "stripe_not_ready"
        ? "Activez les paiements Stripe Connect du restaurant avant d’envoyer un devis."
        : "Le devis n’a pas pu être envoyé. Vérifiez les montants et réessayez.");
      return;
    }
    setLinks((current) => ({ ...current, [quote.id]: result.checkoutUrl }));
    setQuotes((current) => current.map((item) => item.id === quote.id
      ? { ...item, status: "quoted", checkout_url: result.checkoutUrl }
      : item));
    setExpandedId(null);
    if (result.emailSent) toast.success("Devis envoyé par courriel avec le lien de paiement sécurisé.");
    else toast.info("Le lien de paiement est prêt, mais le courriel n’a pas été envoyé. Copiez le lien dans l’historique.");
  }

  async function copyLink(url: string) {
    try { await navigator.clipboard.writeText(url); toast.success("Lien copié."); }
    catch { toast.error("Copie impossible. Ouvrez le lien pour le copier."); }
  }

  const canIssue = (quote: ServiceQuoteRow) => quote.status === "requested" || quote.status === "expired" || (quote.status === "quoted" && !quote.checkout_url);
  const pending = quotes.filter(canIssue);
  const active = quotes.filter((quote) => !canIssue(quote));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addCalendarDays(selectedDay, index)).filter((day): day is string => day !== null), [selectedDay]);
  const productionQuotes = quotes.filter((quote) => quote.event_at && !["declined", "cancelled", "expired"].includes(quote.status));
  const selectedDayQuotes = productionQuotes.filter((quote) => getRestaurantDateKey(quote.event_at!, restaurantTimezone) === selectedDay)
    .sort((a, b) => Date.parse(a.event_at!) - Date.parse(b.event_at!));
  const initialToday = getRestaurantDateKey(initialDay, restaurantTimezone) ?? initialDay.slice(0, 10);

  function shiftCalendar(days: number) {
    const next = addCalendarDays(selectedDay, days);
    if (next) setSelectedDay(next);
  }

  async function advanceProduction(quote: ServiceQuoteRow) {
    if (!quote.converted_order_id || !quote.order_status) return;
    const next: Partial<Record<NonNullable<ServiceQuoteRow["order_status"]>, OrderStatus>> = {
      confirmee: "en_preparation",
      en_preparation: "prete",
      prete: "servie",
    };
    const nextStatus = next[quote.order_status];
    if (!nextStatus) return;
    setStatusBusyId(quote.id);
    let ok = false;
    try {
      ok = await updateOrderStatusAction(restaurantId, quote.converted_order_id, nextStatus);
    } catch {
      ok = false;
    } finally {
      setStatusBusyId(null);
    }
    if (!ok) {
      toast.error("Le statut n’a pas changé. Vérifiez le paiement requis et réessayez.");
      return;
    }
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, order_status: nextStatus } : item));
    toast.success(nextStatus === "en_preparation" ? "Production démarrée." : nextStatus === "prete" ? "Commande marquée prête." : "Commande marquée servie.");
  }

  return (
    <Card className="overflow-hidden border-mv-green/20">
      <div className="flex items-start justify-between gap-3 border-b border-mv-border-soft bg-mv-cream-soft/60 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-mv-green/10 p-2 text-mv-green-dark"><Utensils size={17} /></span>
          <div>
            <h2 className="font-serif text-[17px] text-mv-ink">Demandes sur mesure & traiteur</h2>
            <p className="mt-0.5 text-[11.5px] text-mv-ink-soft">Chiffrez, demandez un acompte et planifiez la production.</p>
          </div>
        </div>
        <Badge tone={loadFailed ? "red" : pending.length ? "amber" : "neutral"}>{loadFailed ? "Chargement indisponible" : `${pending.length} à traiter`}</Badge>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {loadFailed && <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>Les demandes sur mesure ne sont pas disponibles pour le moment. Vos données ne sont pas supprimées; réessayez dans un instant.</p>
          <Button type="button" size="sm" variant="secondary" disabled={refreshing} onClick={() => void refreshQuotes()}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Actualisation…" : "Réessayer"}
          </Button>
        </div>}
        <section aria-label="Calendrier de production traiteur" className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/40 p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-white p-2 text-mv-green-dark"><CalendarDays size={16} /></span>
              <div>
                <h3 className="text-[13px] font-semibold text-mv-ink">Calendrier de production</h3>
                <p className="text-[11px] text-mv-ink-faint">Événements à venir · fuseau {restaurantTimezone}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="ghost" size="sm" aria-label="Semaine précédente" onClick={() => shiftCalendar(-7)}><ChevronLeft size={15} /></Button>
              <span className="min-w-[118px] text-center text-[11.5px] font-medium text-mv-ink-soft">
                {formatCalendarDay(weekDays[0] ?? selectedDay, restaurantTimezone, { day: "numeric", month: "short" })} – {formatCalendarDay(weekDays[6] ?? selectedDay, restaurantTimezone, { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <Button type="button" variant="ghost" size="sm" aria-label="Semaine suivante" onClick={() => shiftCalendar(7)}><ChevronRight size={15} /></Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDay(initialToday)}>Aujourd’hui</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Choisir une journée de production">
            {weekDays.map((day) => {
              const count = productionQuotes.filter((quote) => getRestaurantDateKey(quote.event_at!, restaurantTimezone) === day).length;
              const selected = day === selectedDay;
              return <button key={day} type="button" aria-pressed={selected} onClick={() => setSelectedDay(day)} className={`min-w-0 rounded-lg border px-1 py-2 text-center transition-colors ${selected ? "border-mv-green bg-mv-green text-white" : "border-mv-border-soft bg-white text-mv-ink-soft hover:border-mv-green/50"}`}>
                <span className="block text-[9px] uppercase tracking-wide opacity-75">{formatCalendarDay(day, restaurantTimezone, { weekday: "short" }).replace(".", "")}</span>
                <span className="mt-0.5 block text-[14px] font-semibold">{Number(day.slice(-2))}</span>
                <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${count ? selected ? "bg-white" : "bg-mv-green" : "bg-transparent"}`} aria-label={count ? `${count} événement${count > 1 ? "s" : ""}` : undefined} />
              </button>;
            })}
          </div>
          <div className="mt-3 border-t border-mv-border-soft pt-3">
            <p className="mb-2 text-[11px] font-semibold text-mv-ink">{formatCalendarDay(selectedDay, restaurantTimezone, { weekday: "long", day: "numeric", month: "long" })}</p>
            {selectedDayQuotes.length === 0 ? <p className="rounded-lg bg-white/70 px-3 py-3 text-center text-[11.5px] text-mv-ink-faint">{loadFailed ? "Calendrier indisponible tant que les demandes ne sont pas chargées." : "Aucune production planifiée cette journée."}</p> : <div className="space-y-2">
              {selectedDayQuotes.map((quote) => {
                const orderStatus = quote.order_status;
                const statusLabel = orderStatus === "en_preparation" ? "En préparation" : orderStatus === "prete" ? "Prête" : orderStatus === "servie" ? "Servie" : orderStatus === "annulee" ? "Commande annulée" : orderStatus === "confirmee" ? "Confirmée" : STATUS[quote.status];
                const tone = orderStatus === "servie" || orderStatus === "prete" ? "green" : quote.status === "requested" || quote.status === "quoted" ? "amber" : "neutral";
                const nextProductionLabel = orderStatus === "confirmee" ? "Démarrer" : orderStatus === "en_preparation" ? "Marquer prête" : orderStatus === "prete" ? "Terminer" : null;
                return <article key={quote.id} className="flex flex-col gap-2 rounded-lg border border-mv-border-soft bg-white p-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-mv-cream-soft px-2 py-1 text-[11px] font-semibold tabular-nums text-mv-ink"><Clock3 size={12} />{formatCalendarTime(quote.event_at!, restaurantTimezone)}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5"><span className="truncate text-[12px] font-semibold text-mv-ink">{quote.guest_name}</span><Badge tone={quote.quote_type === "catering" ? "green" : "neutral"}>{quote.quote_type === "catering" ? "Traiteur" : "Sur mesure"}</Badge></div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-mv-ink-faint">
                        {quote.guest_count && <span className="inline-flex items-center gap-1"><Users size={11} />{quote.guest_count} convives</span>}
                        <span className="inline-flex items-center gap-1"><MapPin size={11} />{quote.fulfillment_mode === "livraison" ? "Livraison" : "Cueillette"}</span>
                        {quote.delivery_address && <span className="max-w-full truncate">{quote.delivery_address}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <Badge tone={tone}>{statusLabel}</Badge>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <span className="text-[10.5px] text-mv-ink-faint">{quote.order_payment_status === "paye" ? "Acompte reçu" : quote.order_payment_status === "en_attente" ? "Paiement en attente" : quote.order_payment_status === "echoue" ? "Paiement échoué" : "Paiement sur place"}{quote.order_deposit_paid_amount ? ` · ${formatCurrency(quote.order_deposit_paid_amount)} versé` : ""}</span>
                    {quote.total != null && <span className="text-[11px] font-mono text-mv-ink-soft">{formatCurrency(quote.total)}</span>}
                    {nextProductionLabel && <Button type="button" size="sm" variant="secondary" disabled={statusBusyId === quote.id} onClick={() => void advanceProduction(quote)}>{orderStatus === "confirmee" ? <CookingPot size={13} /> : <Check size={13} />}{statusBusyId === quote.id ? "Mise à jour…" : nextProductionLabel}</Button>}
                  </div>
                </article>;
              })}
            </div>}
          </div>
        </section>
        {loadFailed ? null : quotes.length === 0 ? <p className="py-3 text-center text-[12.5px] text-mv-ink-faint">Aucune demande de devis pour le moment.</p> : <>
          {pending.map((quote) => (
            <div key={quote.id} className="rounded-xl border border-mv-border-soft bg-white p-3.5 sm:p-4">
              <button type="button" onClick={() => openQuote(quote.id)} className="flex w-full items-start justify-between gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-mv-ink">{quote.guest_name}</p>
                    <Badge tone="amber">{quote.quote_type === "catering" ? "Traiteur" : "Repas sur mesure"}</Badge>
                  </div>
                  <p className="mt-1 text-[11.5px] text-mv-ink-soft">{quote.guest_email} · {quote.guest_phone ?? "Téléphone non fourni"}</p>
                  <p className="mt-1 text-[11.5px] text-mv-ink-soft">{quote.event_at ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: restaurantTimezone }).format(new Date(quote.event_at)) : "Date à confirmer"} · {quote.guest_count ? `${quote.guest_count} convives · ` : ""}{quote.fulfillment_mode === "livraison" ? "Livraison" : "Cueillette"}</p>
                  <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-mv-ink">{quote.description}</p>
                  {quote.client_notes && <p className="mt-1 text-[11.5px] text-mv-ink-faint">Note du client : {quote.client_notes}</p>}
                  {quote.delivery_address && <p className="mt-1 text-[11.5px] text-mv-ink-faint">Adresse : {quote.delivery_address}</p>}
                </div>
                    <span className="shrink-0 text-[11px] font-semibold text-mv-green-dark">{expandedId === quote.id ? "Fermer" : quote.status === "requested" ? "Chiffrer" : "Renvoyer"}</span>
              </button>
              {expandedId === quote.id && (
                <div className="mt-4 space-y-3 border-t border-mv-border-soft pt-4">
                  <p className="text-[12px] font-semibold text-mv-ink">Détail du devis</p>
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 rounded-lg bg-mv-cream-soft/60 p-2.5">
                      <div className="col-span-12 sm:col-span-5"><Input aria-label="Description du poste" placeholder="Plat, main-d’œuvre, livraison…" value={line.name} onChange={(e) => patchLine(index, { name: e.target.value })} /></div>
                      <div className="col-span-4 sm:col-span-2"><Input aria-label="Quantité" type="number" min="1" step="1" value={line.quantity} onChange={(e) => patchLine(index, { quantity: Number(e.target.value) })} /></div>
                      <div className="col-span-6 sm:col-span-4"><Input aria-label="Prix unitaire" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => patchLine(index, { unitPrice: Number(e.target.value) })} /></div>
                      <button type="button" aria-label="Retirer ce poste" disabled={lines.length < 2} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="col-span-2 flex items-center justify-center text-mv-ink-faint hover:text-mv-red disabled:opacity-30 sm:col-span-1"><Trash2 size={15} /></button>
                      <div className="col-span-12"><Input aria-label="Précision sur le poste" placeholder="Détails facultatifs" value={line.description ?? ""} onChange={(e) => patchLine(index, { description: e.target.value })} /></div>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLines((current) => [...current, { name: "", quantity: 1, unitPrice: 0, description: "" }])}><Plus size={13} /> Ajouter un poste</Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Taxe (%)"><Input type="number" min="0" max="30" step="0.001" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></Field>
                    <Field label="Acompte (%)"><Input type="number" min="1" max="100" step="1" value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} /></Field>
                  </div>
                  <Field label="Note au client"><Textarea rows={2} maxLength={1000} value={ownerNotes} onChange={(e) => setOwnerNotes(e.target.value)} placeholder="Modalités, inclusions ou conditions…" /></Field>
                  <div className="rounded-lg bg-mv-cream-soft px-3 py-2 text-[12px] text-mv-ink-soft">
                    Total estimé : <strong className="text-mv-ink">{formatCurrency(lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice), 0) * (1 + Number(taxPercent) / 100))}</strong>
                    <span className="ml-3">Acompte : <strong className="text-mv-green-dark">{formatCurrency(lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice), 0) * (1 + Number(taxPercent) / 100) * Number(depositPercent) / 100)}</strong></span>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" onClick={() => void issue(quote)} disabled={busyId === quote.id || lines.some((line) => !line.name.trim() || line.quantity < 1 || line.unitPrice < 0)}>
                      <Send size={14} /> {busyId === quote.id ? "Envoi…" : "Envoyer le devis et le lien d’acompte"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {active.length > 0 && <div className="space-y-2 border-t border-mv-border-soft pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Historique</p>
            {active.slice(0, 8).map((quote) => {
              const link = links[quote.id] ?? quote.checkout_url;
              return <div key={quote.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-mv-cream-soft/60 px-3 py-2 text-[12px]">
                <span className="min-w-0 flex-1 truncate font-medium text-mv-ink">{quote.guest_name} · {quote.quote_type === "catering" ? "Traiteur" : "Sur mesure"}</span>
                <Badge tone={quote.status === "converted" ? "green" : "neutral"}>{STATUS[quote.status]}</Badge>
                {quote.total != null && <span className="font-mono text-mv-ink-soft">{formatCurrency(quote.total)}</span>}
                {link && <button type="button" aria-label="Copier le lien de paiement" onClick={() => void copyLink(link)} className="rounded-md p-1.5 text-mv-ink-faint hover:bg-white hover:text-mv-green-dark"><ClipboardCopy size={14} /></button>}
              </div>;
            })}
          </div>}
        </>}
      </div>
    </Card>
  );
}
