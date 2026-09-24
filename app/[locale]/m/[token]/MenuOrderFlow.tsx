"use client";

import { startTransition, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { requestCustomerMagicLink } from "@/lib/auth/customer-magic-link";
import { getPublicOrderDeliveryQuoteAction, resumePublicOrderAction, submitPublicOrderAction } from "./actions";
import { OnlinePaymentForm } from "./OnlinePaymentForm";
import { MealSuggestionsPanel } from "./MealSuggestionsPanel";
import { ServiceQuoteRequest } from "./ServiceQuoteRequest";
import { formatCurrency, roundToCents, cn } from "@/lib/utils";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { CustomerPushToggle } from "@/components/pwa/CustomerPushToggle";
import type { MenuItem, Offer, OrderFulfillmentMode } from "@/lib/types";
import type { DeliveryPricingConfig, DeliveryQuote } from "@/lib/orders/delivery-pricing";
import { getPublicCheckoutOptions } from "@/lib/orders/checkout-options";
import { formatRestaurantTime } from "@/lib/orders/scheduling";
import type { PublicMenuLanding, SiblingLocation } from "@/lib/data/menu-shares";
import { Map as MapView, MapControls, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from "@/components/ui/map";
import Link from "next/link";
import { Plus, Minus, ShoppingCart, Mail, CheckCircle2, Heart, Share2, Sparkles, UtensilsCrossed, X, MapPin, ArrowRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateReferralLinkAction, toggleFavoriteAction } from "@/app/[locale]/portal/actions";

type CartLine = { item: MenuItem; quantity: number };
type OrderTotals = { subtotal: number; taxAmount: number; tipAmount: number; total: number };

/** Category names can hold spaces/accents/punctuation — not safe as a raw
 * DOM id or anchor fragment, so scrolling-to-category uses a slug instead. */
function categorySlug(category: string, index: number): string {
  const slug = category
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `cat-${index}`;
}

const TIP_PRESETS = [0, 0.1, 0.15, 0.2];

function CheckoutModal({
  open,
  onClose,
  cartLines,
  totals,
  acceptsTips,
  tipPct,
  setTipPct,
  authenticated,
  token,
  referralCode,
  onlinePaymentEnabled,
  orderModesEnabled,
  onOrdered,
  shareProgramId,
  restaurantName,
  restaurantTimezone,
  mentionedOfferTitle,
  delivery,
}: {
  open: boolean;
  onClose: () => void;
  cartLines: CartLine[];
  totals: OrderTotals;
  acceptsTips: boolean;
  tipPct: number | null;
  setTipPct: (v: number | null) => void;
  authenticated: boolean;
  token: string;
  referralCode: string | null;
  orderModesEnabled: OrderFulfillmentMode[];
  onlinePaymentEnabled: boolean;
  onOrdered: () => void;
  shareProgramId: string | null;
  restaurantName: string;
  restaurantTimezone: string;
  mentionedOfferTitle: string | null;
  delivery: { config: DeliveryPricingConfig; restaurantLat: number | null; restaurantLng: number | null };
}) {
  const { subtotal, taxAmount, tipAmount, total } = totals;
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "done" | "paying" | "paid" | "error">(
    "idle"
  );
  const checkoutOptions = getPublicCheckoutOptions(orderModesEnabled, onlinePaymentEnabled, delivery.config.enabled);
  const [fulfillmentMode, setFulfillmentMode] = useState<OrderFulfillmentMode>(
    checkoutOptions.fulfillmentModes.includes("sur_place") ? "sur_place" : (checkoutOptions.fulfillmentModes[0] ?? "sur_place")
  );
  const [payOnline, setPayOnline] = useState(!checkoutOptions.canPayAtReceipt);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [serverDeliveryQuote, setServerDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [quotedDeliveryAddress, setQuotedDeliveryAddress] = useState("");
  const normalizedDeliveryAddress = deliveryAddress.trim();
  const deliveryQuoteLoading = fulfillmentMode === "livraison"
    && normalizedDeliveryAddress.length >= 6
    && quotedDeliveryAddress !== normalizedDeliveryAddress;
  const deliveryQuote: DeliveryQuote = fulfillmentMode !== "livraison"
    ? { fee: 0, distanceKm: null, etaMinutes: null, available: true }
    : normalizedDeliveryAddress.length < 6
      ? { fee: 0, distanceKm: null, etaMinutes: null, available: false, reason: "missing_location" }
      : quotedDeliveryAddress === normalizedDeliveryAddress && serverDeliveryQuote
        ? serverDeliveryQuote
        : { fee: 0, distanceKm: null, etaMinutes: null, available: false, reason: "missing_location" };

  useEffect(() => {
    if (fulfillmentMode !== "livraison" || normalizedDeliveryAddress.length < 6 || quotedDeliveryAddress === normalizedDeliveryAddress) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      startTransition(async () => {
        const quote = await getPublicOrderDeliveryQuoteAction(token, deliveryAddress);
        if (!cancelled) {
          setServerDeliveryQuote(quote);
          setQuotedDeliveryAddress(normalizedDeliveryAddress);
        }
      });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deliveryAddress, fulfillmentMode, normalizedDeliveryAddress, quotedDeliveryAddress, token]);
  const displayTotal = total + deliveryQuote.fee;
  // Unchecked by default (CASL/LCAP) — only applied if this order creates a
  // brand-new customer row; a returning customer's existing consent choice
  // is never overwritten by a later order that didn't re-tick this box.
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [estimatedReadyAt, setEstimatedReadyAt] = useState<string | null>(null);
  const [checkoutAttemptId, setCheckoutAttemptId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`mv-order-attempt-${token}`);
    } catch {
      return null;
    }
  });
  const [checkoutTotal, setCheckoutTotal] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const cartFingerprint = JSON.stringify(cartLines.map((line) => [line.item.id, line.quantity]));
  const lastCartFingerprint = useRef(cartFingerprint);

  useEffect(() => {
    if (lastCartFingerprint.current === cartFingerprint) return;
    lastCartFingerprint.current = cartFingerprint;
    setCheckoutAttemptId(null);
    try {
      localStorage.removeItem(`mv-order-attempt-${token}`);
    } catch {
      // ignore storage failures; the order action still has a server key
    }
  }, [cartFingerprint, token]);

  function getCheckoutAttemptId(): string {
    if (checkoutAttemptId) return checkoutAttemptId;
    const key = crypto.randomUUID();
    setCheckoutAttemptId(key);
    try {
      localStorage.setItem(`mv-order-attempt-${token}`, key);
    } catch {
      // The in-memory key still protects retries until this page closes.
    }
    return key;
  }

  function finishOrder() {
    setCheckoutAttemptId(null);
    try {
      localStorage.removeItem(`mv-order-attempt-${token}`);
    } catch {
      // ignore
    }
    onOrdered();
  }

  async function handleShareOrder() {
    if (!shareProgramId) return;
    setShareLoading(true);
    try {
      const link = await getOrCreateReferralLinkAction(shareProgramId);
      if (!link) {
        toast.error("Impossible de créer votre lien pour l'instant.");
        return;
      }
      const url = `${window.location.origin}/m/${token}?ref=${link.code}`;
      setShareLink(url);
      const dishName = cartLines[0]?.item.name;
      const shareText = dishName
        ? `Je viens de commander ${dishName} chez ${restaurantName} — passe voir le menu !`
        : `Je viens de commander chez ${restaurantName} — passe voir le menu !`;
      if (navigator.share) {
        await navigator.share({ title: restaurantName, text: shareText, url }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        toast.success("Lien copié — partagez-le pour gagner une récompense.");
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailStatus("sending");
    setEmailError(null);
    try {
      const result = await requestCustomerMagicLink(
        email,
        `/m/${token}${referralCode ? `?ref=${referralCode}` : ""}`
      );
      if (result.ok) {
        setEmailStatus("sent");
      } else {
        setEmailStatus("error");
        setEmailError(result.error ?? "Une erreur est survenue.");
      }
    } catch {
      setEmailStatus("error");
      setEmailError("Impossible d’envoyer le lien maintenant. Vérifiez votre connexion et réessayez.");
    }
  }

  async function handleOrderSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitStatus("submitting");
    try {
      const idempotencyKey = getCheckoutAttemptId();
      const result = await submitPublicOrderAction(
        token,
        referralCode,
        cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
        {
          guestName: String(form.get("guestName") ?? ""),
          guestPhone: String(form.get("guestPhone") ?? "") || null,
          paymentMethod: payOnline ? null : String(form.get("paymentMethod") ?? "") || null,
          tipAmount,
          fulfillmentMode,
          deliveryAddress: fulfillmentMode === "livraison" ? deliveryAddress : null,
          payOnline,
          requestedReadyAtLocal: String(form.get("requestedReadyAtLocal") ?? "") || null,
          marketingConsent,
          mentionedOfferTitle,
        },
        idempotencyKey
      );
      if (!result.ok) {
        setSubmitStatus("error");
        return;
      }
      setEstimatedReadyAt(result.estimatedReadyAt);
      setCheckoutTotal(result.total);
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setSubmitStatus("paying");
      } else {
        finishOrder();
        setSubmitStatus(result.paymentConfirmed ? "paid" : "done");
      }
    } catch {
      setSubmitStatus("error");
    }
  }

  async function handleResumeOrder() {
    if (!checkoutAttemptId) return;
    setSubmitStatus("submitting");
    try {
      const result = await resumePublicOrderAction(token, checkoutAttemptId);
      if (!result.ok) {
        setSubmitStatus("error");
        return;
      }
      setEstimatedReadyAt(result.estimatedReadyAt);
      setCheckoutTotal(result.total);
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setSubmitStatus("paying");
      } else {
        finishOrder();
        setSubmitStatus(result.paymentConfirmed ? "paid" : "done");
      }
    } catch {
      setSubmitStatus("error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Votre commande" width={480}>
      {submitStatus === "paying" && clientSecret ? (
        <div className="py-2">
          <p className="mb-3 text-[13px] text-mv-ink-soft">
            Votre commande a été transmise au restaurant. Complétez le paiement pour confirmer.
          </p>
          <OnlinePaymentForm
            clientSecret={clientSecret}
            total={checkoutTotal ?? displayTotal}
            onPaid={() => {
              finishOrder();
              setSubmitStatus("paid");
            }}
          />
        </div>
      ) : submitStatus === "paid" ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
            <CheckCircle2 size={18} />
          </div>
          <p className="font-display text-[17px] font-medium text-mv-ink">Paiement envoyé</p>
          <p className="mt-1.5 text-[13px] text-mv-ink-soft">
            Nous confirmons avec votre banque. Votre commande est déjà transmise au restaurant.
          </p>
          {estimatedReadyAt && (
            <p className="mt-2 text-[12.5px] font-medium text-mv-green-dark">
              Prêt vers {formatRestaurantTime(estimatedReadyAt, restaurantTimezone)}
            </p>
          )}
          {shareProgramId && (
            <div className="mt-4 border-t border-mv-border-soft pt-4">
              {shareLink ? (
                <p className="mv-check-pop text-[12.5px] text-mv-green-dark">Merci d&apos;avoir partagé !</p>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleShareOrder} disabled={shareLoading}>
                  <Sparkles size={14} /> Partager ce plat et gagner une récompense
                </Button>
              )}
            </div>
          )}
        </div>
      ) : submitStatus === "done" ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
            <CheckCircle2 size={18} />
          </div>
          <p className="font-display text-[17px] font-medium text-mv-ink">Commande envoyée</p>
          <p className="mt-1.5 text-[13px] text-mv-ink-soft">
            Vous paierez sur place. Le restaurant confirmera sous peu.
          </p>
          {estimatedReadyAt && (
            <p className="mt-2 text-[12.5px] font-medium text-mv-green-dark">
              Prêt vers {formatRestaurantTime(estimatedReadyAt, restaurantTimezone)}
            </p>
          )}
          {shareProgramId && (
            <div className="mt-4 border-t border-mv-border-soft pt-4">
              {shareLink ? (
                <p className="mv-check-pop text-[12.5px] text-mv-green-dark">Merci d&apos;avoir partagé !</p>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleShareOrder} disabled={shareLoading}>
                  <Sparkles size={14} /> Partager ce plat et gagner une récompense
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {authenticated && checkoutAttemptId && submitStatus !== "submitting" && (
            <div className="rounded-xl border border-mv-green/20 bg-mv-green-tint/40 p-3">
              <p className="mb-2 text-[12px] text-mv-ink-soft">
                Une tentative précédente a peut-être déjà été reçue. Reprenez-la pour retrouver la même commande et le même paiement, sans en créer une autre.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={handleResumeOrder} className="w-full">
                Reprendre ma commande
              </Button>
            </div>
          )}
          {mentionedOfferTitle && (
            <div className="flex items-center gap-1.5 rounded-lg bg-mv-lime-tint px-3 py-2 text-[12px] font-medium text-mv-green-darker">
              <Sparkles size={13} /> Offre mentionnée : {mentionedOfferTitle}
            </div>
          )}
          <div className="space-y-1.5">
            {cartLines.map((l) => (
              <div key={l.item.id} className="flex items-center justify-between text-[12.5px]">
                <span className="text-mv-ink-soft">
                  {l.quantity}× {l.item.name}
                </span>
                <span className="font-medium text-mv-ink">{formatCurrency(l.item.price * l.quantity)}</span>
              </div>
            ))}
          </div>

          {acceptsTips && (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-mv-ink-soft">Pourboire</p>
              <div className="flex gap-1.5">
                {TIP_PRESETS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTipPct(pct)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium",
                      tipPct === pct
                        ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                        : "border-mv-border text-mv-ink-soft"
                    )}
                  >
                    {pct === 0 ? "Aucun" : `${Math.round(pct * 100)}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1 border-t border-mv-border-soft pt-3 text-[12.5px]">
            <div className="flex justify-between text-mv-ink-soft">
              <span>Sous-total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-mv-ink-soft">
              <span>Taxes</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            {acceptsTips && (
              <div className="flex justify-between text-mv-ink-soft">
                <span>Pourboire</span>
                <span>{formatCurrency(tipAmount)}</span>
              </div>
            )}
            {fulfillmentMode === "livraison" && (
              <div className="flex justify-between text-mv-ink-soft">
                <span>Livraison{deliveryQuote.distanceKm != null ? ` · ${deliveryQuote.distanceKm} km` : ""}</span>
                <span>{formatCurrency(deliveryQuote.fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-semibold text-mv-ink">
              <span>Total</span>
              <span>{formatCurrency(displayTotal)}</span>
            </div>
          </div>

          {authenticated ? (
            <form onSubmit={handleOrderSubmit} className="space-y-3 border-t border-mv-border-soft pt-3">
              <Field label="Nom">
                <Input name="guestName" required autoFocus />
              </Field>
              <Field label="Téléphone" hint="Optionnel">
                <Input name="guestPhone" type="tel" />
              </Field>
              <Field label="Heure souhaitée (facultatif)" hint={`Heure locale du restaurant (${restaurantTimezone}) · créneaux de 15 min · jusqu’à 30 jours`}>
                <Input name="requestedReadyAtLocal" type="datetime-local" step={900} />
              </Field>
              {checkoutOptions.fulfillmentModes.length > 1 && (
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-mv-ink-soft">Mode de réception</p>
                  <div className="flex gap-1.5">
                    {checkoutOptions.fulfillmentModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setFulfillmentMode(mode)}
                        className={cn(
                          "flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium",
                          fulfillmentMode === mode
                            ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                            : "border-mv-border text-mv-ink-soft"
                        )}
                      >
                          {mode === "livraison" ? "Livraison" : "Cueillette"}
                      </button>
                    ))}
                  </div>
                  {fulfillmentMode === "prep_apres_paiement" && (
                    <p className="mt-1.5 text-[11.5px] text-mv-ink-faint">
                      Le restaurant commence la préparation dès que votre paiement est confirmé.
                    </p>
                  )}
                </div>
              )}
              {fulfillmentMode === "livraison" && (
                <div className="space-y-2 rounded-xl border border-mv-green/20 bg-mv-green-tint/40 p-3">
                  <Field label="Adresse de livraison" hint="Rue, ville et code postal — le tarif est calculé par le restaurant">
                    <Input value={deliveryAddress} onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                    }} required autoComplete="street-address" />
                  </Field>
                  {deliveryQuoteLoading && <p className="text-[11.5px] text-mv-ink-faint">Calcul des frais…</p>}
                  {!deliveryQuoteLoading && !deliveryQuote.available && (
                    <p className="text-[12px] text-mv-red">{deliveryQuote.reason === "outside_radius" ? "Cette adresse est hors du rayon de livraison configuré." : "Entrez une adresse complète pour calculer les frais."}</p>
                  )}
                  {deliveryQuote.available && deliveryQuote.etaMinutes != null && (
                    <p className="text-[11.5px] text-mv-ink-faint">Frais : {formatCurrency(deliveryQuote.fee)} · Temps estimé : {deliveryQuote.etaMinutes} min</p>
                  )}
                </div>
              )}
              {checkoutOptions.canPayOnline && checkoutOptions.canPayAtReceipt && (
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-mv-ink-soft">Paiement</p>
                  <div className="flex gap-1.5">
                    {[
                      { value: false, label: fulfillmentMode === "livraison" ? "À la livraison" : "À la cueillette" },
                      { value: true, label: "En ligne" },
                    ].map((choice) => (
                      <button
                        key={String(choice.value)}
                        type="button"
                        onClick={() => setPayOnline(choice.value)}
                        className={cn("flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium", payOnline === choice.value ? "border-mv-green bg-mv-green-tint text-mv-green-dark" : "border-mv-border text-mv-ink-soft")}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!payOnline && (
                <Field label="Mode de paiement sur place" hint="Optionnel">
                  <Input name="paymentMethod" placeholder="Ex : Carte, comptant" />
                </Field>
              )}
              <label className="flex items-start gap-2 text-[12px] text-mv-ink-soft">
                <Checkbox
                  checked={marketingConsent}
                  onCheckedChange={(checked) => setMarketingConsent(Boolean(checked))}
                  className="mt-0.5"
                />
                <span>J&apos;accepte de recevoir des offres et rappels par courriel ou SMS de {restaurantName}.</span>
              </label>
              {submitStatus === "error" && (
                <p className="text-[12.5px] text-mv-red">La commande a échoué. Réessayez.</p>
              )}
              <Button type="submit" disabled={submitStatus === "submitting" || (fulfillmentMode === "livraison" && (deliveryQuoteLoading || !deliveryQuote.available))} className="w-full">
                {submitStatus === "submitting" ? "Envoi…" : `Envoyer la commande — ${formatCurrency(displayTotal)}`}
              </Button>
            </form>
          ) : emailStatus === "sent" ? (
            <div className="border-t border-mv-border-soft pt-3 text-center">
              <Mail size={18} className="mx-auto mb-2 text-mv-green-dark" />
              <p className="text-[13px] text-mv-ink-soft">
                Cliquez le lien reçu à {email} pour confirmer votre commande.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3 border-t border-mv-border-soft pt-3">
              <Field label="Courriel" hint="Pour confirmer votre commande">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </Field>
              {emailStatus === "error" && <p className="text-[12.5px] text-mv-red">{emailError}</p>}
              <Button type="submit" disabled={emailStatus === "sending"} className="w-full">
                {emailStatus === "sending" ? "Envoi…" : "Continuer"}
              </Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Grid tile for one menu item — image up top so the menu reads as a real
 * ordering app instead of a plain price list, quick-add without opening
 * the detail view for the common case. */
function MenuItemGridCard({
  item,
  quantity,
  onOpen,
  onQuickAdd,
  isFavorite,
  onToggleFavorite,
}: {
  item: MenuItem;
  quantity: number;
  onOpen: () => void;
  onQuickAdd: () => void;
  isFavorite: boolean;
  onToggleFavorite?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-mv-border bg-mv-surface text-left shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-mv-cream-soft">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed size={26} className="text-mv-ink-faint" />
          </div>
        )}
        <span
          role="button"
          tabIndex={0}
          aria-label={`Ajouter ${item.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd();
            }
          }}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-mv-green text-mv-cream-soft shadow-mv-md transition-transform hover:scale-110"
        >
          <Plus size={15} />
        </span>
        {quantity > 0 && (
          <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-mv-ink px-1.5 text-[11px] font-bold text-white shadow-mv-md">
            {quantity}
          </span>
        )}
        {onToggleFavorite && (
          <span
            role="button"
            tabIndex={0}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
              }
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-mv-surface/90 text-mv-ink-faint shadow-mv-sm transition-colors hover:text-mv-red"
          >
            <Heart size={14} className={isFavorite ? "fill-mv-red text-mv-red" : undefined} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-[13.5px] font-medium text-mv-ink">{item.name}</p>
        {item.description && (
          <p className="line-clamp-2 text-[11.5px] leading-snug text-mv-ink-faint">{item.description}</p>
        )}
        <p className="mt-auto pt-1 text-[13px] font-semibold text-mv-green-dark">{formatCurrency(item.price)}</p>
      </div>
    </button>
  );
}

/** Full item detail — the McDonald's-style "tap a tile, see the big
 * picture + description + a quantity stepper" pattern. */
function MenuItemDetailModal({
  item,
  quantity,
  onClose,
  onQtyChange,
  onConfirm,
}: {
  item: MenuItem | null;
  quantity: number;
  onClose: () => void;
  onQtyChange: (delta: number) => void;
  onConfirm: () => void;
}) {
  if (!item) return null;
  const displayQty = Math.max(1, quantity);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-mv-surface sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-mv-cream-soft">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UtensilsCrossed size={40} className="text-mv-ink-faint" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-mv-surface/90 text-mv-ink shadow-mv-md backdrop-blur-sm"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="font-display text-[20px] font-medium text-mv-ink">{item.name}</h3>
          <p className="mt-1 text-[15px] font-semibold text-mv-green-dark">{formatCurrency(item.price)}</p>
          {item.description && (
            <p className="mt-3 text-[13.5px] leading-relaxed text-mv-ink-soft">{item.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-mv-border-soft p-4">
          <div className="flex shrink-0 items-center gap-3 rounded-full border border-mv-border px-2 py-1.5">
            <button
              type="button"
              onClick={() => onQtyChange(-1)}
              disabled={displayQty <= 1}
              aria-label="Retirer un"
              className="flex h-7 w-7 items-center justify-center rounded-full text-mv-ink-soft disabled:opacity-30"
            >
              <Minus size={14} />
            </button>
            <span className="w-5 text-center text-[14px] font-semibold text-mv-ink">{displayQty}</span>
            <button
              type="button"
              onClick={() => onQtyChange(1)}
              aria-label="Ajouter un"
              className="flex h-7 w-7 items-center justify-center rounded-full text-mv-ink-soft"
            >
              <Plus size={14} />
            </button>
          </div>
          <Button onClick={onConfirm} className="flex-1">
            Ajouter — {formatCurrency(item.price * displayQty)}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Concept/demo scope: lets a customer switch to another location of the
 * same franchise/workspace — real coordinates and a real menu link per
 * sibling (see getSiblingLocationsForPublicMenu), not a mocked list. */
function LocationPickerModal({
  open,
  onClose,
  currentRestaurantName,
  locations,
}: {
  open: boolean;
  onClose: () => void;
  currentRestaurantName: string;
  locations: SiblingLocation[];
}) {
  if (!open) return null;
  const center: [number, number] = [
    locations.reduce((sum, l) => sum + l.lng, 0) / locations.length,
    locations.reduce((sum, l) => sum + l.lat, 0) / locations.length,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-mv-surface sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-mv-border-soft p-4">
          <div>
            <p className="font-display text-[16px] font-medium text-mv-ink">Choisir un établissement</p>
            <p className="text-[12px] text-mv-ink-faint">Vous consultez actuellement {currentRestaurantName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mv-ink-faint hover:bg-mv-cream-soft"
          >
            <X size={16} />
          </button>
        </div>
        <div className="h-56 shrink-0">
          <MapView center={center} zoom={locations.length > 1 ? 9 : 12} theme="light" className="h-full w-full">
            <MapControls position="bottom-right" showZoom />
            {locations.map((loc) => (
              <MapMarker key={loc.id} longitude={loc.lng} latitude={loc.lat}>
                <MarkerContent>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-mv-green text-white shadow-mv-md">
                    <MapPin size={13} />
                  </span>
                  <MarkerLabel position="bottom">{loc.name}</MarkerLabel>
                </MarkerContent>
                <MarkerPopup className="w-56 p-3">
                  <p className="text-[13px] font-medium text-mv-ink">{loc.name}</p>
                  <p className="text-[11.5px] text-mv-ink-faint">{loc.address}</p>
                </MarkerPopup>
              </MapMarker>
            ))}
          </MapView>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {locations.map((loc) => (
            <a
              key={loc.id}
              href={`/m/${loc.token}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-mv-border-soft px-3.5 py-3 transition-colors hover:bg-mv-cream-soft"
            >
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-mv-ink">{loc.name}</p>
                <p className="truncate text-[11.5px] text-mv-ink-faint">
                  {loc.address}
                  {loc.city ? `, ${loc.city}` : ""}
                </p>
              </div>
              <ArrowRight size={14} className="shrink-0 text-mv-ink-faint" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MenuOrderFlow({
  token,
  referralCode,
  landing,
  offers,
  authenticated,
  shareProgramId,
  siblingLocations,
  customerId,
  favoriteMenuItemIds,
  favoriteOfferIds,
}: {
  token: string;
  referralCode: string | null;
  landing: PublicMenuLanding;
  offers: Offer[];
  authenticated: boolean;
  shareProgramId: string | null;
  siblingLocations: SiblingLocation[];
  customerId: string | null;
  favoriteMenuItemIds: string[];
  favoriteOfferIds: string[];
}) {
  const { restaurantName, restaurantTimezone, items, taxRate, acceptsTips, onlinePaymentEnabled, orderModesEnabled, delivery } = landing;
  const [favMenuItems, setFavMenuItems] = useState(new Set(favoriteMenuItemIds));
  const [favOffers, setFavOffers] = useState(new Set(favoriteOfferIds));

  async function handleToggleFavorite(kind: "menu_item" | "offer", itemId: string) {
    if (!customerId) return;
    const set = kind === "menu_item" ? favMenuItems : favOffers;
    const setter = kind === "menu_item" ? setFavMenuItems : setFavOffers;
    const next = new Set(set);
    const wasFavorite = next.has(itemId);
    if (wasFavorite) next.delete(itemId);
    else next.add(itemId);
    setter(next);
    const ok = await toggleFavoriteAction(customerId, kind, itemId, !wasFavorite);
    if (!ok) {
      // Revert on failure
      const reverted = new Set(next);
      if (wasFavorite) reverted.add(itemId);
      else reverted.delete(itemId);
      setter(reverted);
    }
  }

  // Cart survives the magic-link round trip (a full page reload) via
  // localStorage — otherwise a customer who clicks the emailed link would
  // come back to find their cart empty. Read as lazy initial state (not an
  // effect) so it's ready on first render instead of popping in a tick
  // later; the try/catch also makes this safe during SSR, where
  // `localStorage` doesn't exist.
  function readSavedCart(): Record<string, number> {
    try {
      const saved = localStorage.getItem(`mv-cart-${token}`);
      return saved ? (JSON.parse(saved) as Record<string, number>) : {};
    } catch {
      return {};
    }
  }

  const [cart, setCart] = useState<Record<string, number>>(readSavedCart);
  // Re-opens checkout automatically once authenticated if there's still
  // something in the cart from before the magic-link round trip.
  const [checkoutOpen, setCheckoutOpen] = useState(
    () => authenticated && Object.values(readSavedCart()).some((q) => q > 0)
  );
  const [tipPct, setTipPct] = useState<number | null>(acceptsTips ? 0.15 : null);
  const [activeOffer, setActiveOffer] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const menuSectionRef = useRef<HTMLDivElement | null>(null);

  function handleClaimOffer(title: string) {
    setActiveOffer(title);
    menuSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast.success("Mentionnez cette offre à la commande — ajoutée à votre commande.");
  }

  useEffect(() => {
    try {
      const nonZero = Object.fromEntries(Object.entries(cart).filter(([, qty]) => qty > 0));
      localStorage.setItem(`mv-cart-${token}`, JSON.stringify(nonZero));
    } catch {
      // ignore
    }
  }, [cart, token]);

  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const cat = item.category ?? "Autres";
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const cartLines: CartLine[] = items
    .filter((i) => (cart[i.id] ?? 0) > 0)
    .map((i) => ({ item: i, quantity: cart[i.id] }));

  const subtotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const taxAmount = roundToCents(subtotal * taxRate);
  const tipAmount = tipPct != null ? roundToCents(subtotal * tipPct) : 0;
  const total = subtotal + taxAmount + tipAmount;
  const totals: OrderTotals = { subtotal, taxAmount, tipAmount, total };
  const itemCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  function updateQty(itemId: string, delta: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta) }));
  }

  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  function openDetail(item: MenuItem) {
    setDetailItem(item);
    setDetailQty(Math.max(1, cart[item.id] ?? 1));
  }

  function confirmDetailAdd() {
    if (!detailItem) return;
    setCart((prev) => ({ ...prev, [detailItem.id]: detailQty }));
    setDetailItem(null);
  }

  function handleOrdered() {
    setCart({});
    try {
      localStorage.removeItem(`mv-cart-${token}`);
      localStorage.removeItem(`mv-order-attempt-${token}`);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-mv-cream pb-28">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="font-sans text-[15px] font-medium text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
          </span>
        </div>
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-mv-green-dark">
          {landing.share.title}
        </p>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-[26px] font-medium text-mv-ink">{restaurantName}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {siblingLocations.length > 0 && (
              <button
                type="button"
                onClick={() => setLocationPickerOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3.5 py-2 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft hover:text-mv-ink"
              >
                <MapPin size={14} className="text-mv-green-dark" /> Autres établissements
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                if (navigator.share) {
                  navigator.share({ title: `Le menu de ${restaurantName}`, url }).catch(() => {});
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(url);
                  toast.success("Lien du menu copié.");
                }
              }}
              className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3.5 py-2 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft hover:text-mv-ink"
            >
              <Share2 size={14} className="text-mv-green-dark" /> Partager
            </button>
            <Link
              href="/portal"
              className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3.5 py-2 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft hover:text-mv-ink"
            >
              <Heart size={14} className="text-mv-green-dark" /> Mes points
            </Link>
          </div>
        </div>

        <InstallAppPrompt />
        {authenticated && <CustomerPushToggle restaurantId={landing.restaurantId} />}

        {landing.isBusy && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-mv-amber/40 bg-mv-amber-tint px-3.5 py-3 text-[12.5px] text-mv-amber-dark">
            <Clock size={15} className="mt-0.5 shrink-0" />
            <span>
              {restaurantName} est présentement très occupé — les délais de préparation peuvent être plus longs que
              d&apos;habitude.
            </span>
          </div>
        )}

        {offers.length > 0 && (
          <div className="mb-8">
            <p className="mb-2 text-[13px] font-semibold text-mv-ink">Offres en ce moment</p>
            <div className="space-y-2">
              {offers.map((offer) => (
                <Card key={offer.id} className="flex items-center gap-3 border-mv-lime-dark/30 bg-mv-lime-tint">
                  {offer.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={offer.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-mv-ink">{offer.title}</p>
                    {offer.description && (
                      <p className="text-[12px] leading-relaxed text-mv-ink-soft">{offer.description}</p>
                    )}
                  </div>
                  {customerId && (
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite("offer", offer.id)}
                      aria-label={favOffers.has(offer.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      className="shrink-0 text-mv-ink-faint transition-colors hover:text-mv-red"
                    >
                      <Heart size={16} className={favOffers.has(offer.id) ? "fill-mv-red text-mv-red" : undefined} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleClaimOffer(offer.title)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      activeOffer === offer.title
                        ? "bg-mv-green-dark text-mv-cream-soft"
                        : "bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark"
                    )}
                  >
                    {activeOffer === offer.title ? "Ajoutée ✓" : "J'en profite"}
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {customerId && <MealSuggestionsPanel key={landing.restaurantId} restaurantId={landing.restaurantId} />}
        <ServiceQuoteRequest token={token} restaurantTimezone={restaurantTimezone} deliveryEnabled={delivery.config.enabled} />

        {items.length === 0 ? (
          <p className="text-[13px] text-mv-ink-faint">Aucun plat disponible pour l&apos;instant.</p>
        ) : (
          <div ref={menuSectionRef}>
            {categories.length > 1 && (
              <div className="sticky top-0 z-10 -mx-6 mb-6 flex gap-2 overflow-x-auto bg-mv-cream/95 px-6 py-2.5 backdrop-blur-sm">
                {categories.map(([category], i) => (
                  <a
                    key={category}
                    href={`#${categorySlug(category, i)}`}
                    className="shrink-0 rounded-full border border-mv-border bg-mv-surface px-3.5 py-1.5 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:border-mv-green hover:text-mv-ink"
                  >
                    {category}
                  </a>
                ))}
              </div>
            )}
            {categories.map(([category, catItems], i) => (
              <div key={category} id={categorySlug(category, i)} className="mb-8 scroll-mt-16">
                <p className="mb-3 text-[13px] font-semibold text-mv-ink">{category}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {catItems.map((item) => (
                    <MenuItemGridCard
                      key={item.id}
                      item={item}
                      quantity={cart[item.id] ?? 0}
                      onOpen={() => openDetail(item)}
                      onQuickAdd={() => updateQty(item.id, 1)}
                      isFavorite={favMenuItems.has(item.id)}
                      onToggleFavorite={customerId ? () => handleToggleFavorite("menu_item", item.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-mv-border bg-mv-surface px-6 py-3 shadow-mv-lg">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div className="text-[12.5px] text-mv-ink-soft">
              {itemCount} article{itemCount > 1 ? "s" : ""} — {formatCurrency(subtotal)}
            </div>
            <Button size="sm" onClick={() => setCheckoutOpen(true)}>
              <ShoppingCart size={14} /> Voir la commande
            </Button>
          </div>
        </div>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartLines={cartLines}
        totals={totals}
        acceptsTips={acceptsTips}
        tipPct={tipPct}
        setTipPct={setTipPct}
        authenticated={authenticated}
        token={token}
        referralCode={referralCode}
        onlinePaymentEnabled={onlinePaymentEnabled}
        orderModesEnabled={orderModesEnabled}
        onOrdered={handleOrdered}
        shareProgramId={shareProgramId}
        restaurantName={restaurantName}
        restaurantTimezone={restaurantTimezone}
        mentionedOfferTitle={activeOffer}
        delivery={delivery}
      />

      <MenuItemDetailModal
        item={detailItem}
        quantity={detailQty}
        onClose={() => setDetailItem(null)}
        onQtyChange={(delta) => setDetailQty((q) => Math.max(1, q + delta))}
        onConfirm={confirmDetailAdd}
      />

      <LocationPickerModal
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        currentRestaurantName={restaurantName}
        locations={siblingLocations}
      />
    </div>
  );
}
