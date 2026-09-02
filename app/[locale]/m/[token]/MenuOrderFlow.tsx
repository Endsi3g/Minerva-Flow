"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { requestCustomerMagicLink } from "@/lib/auth/customer-magic-link";
import { submitPublicOrderAction } from "./actions";
import { OnlinePaymentForm } from "./OnlinePaymentForm";
import { formatCurrency, roundToCents, cn } from "@/lib/utils";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { CustomerPushToggle } from "@/components/pwa/CustomerPushToggle";
import type { MenuItem, Offer } from "@/lib/types";
import type { PublicMenuLanding, SiblingLocation } from "@/lib/data/menu-shares";
import { Map as MapView, MapControls, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from "@/components/ui/map";
import Link from "next/link";
import { Plus, Minus, ShoppingCart, Mail, CheckCircle2, Heart, Share2, Sparkles, UtensilsCrossed, X, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateReferralLinkAction } from "@/app/[locale]/portal/actions";

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
  onOrdered,
  shareProgramId,
  restaurantName,
  mentionedOfferTitle,
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
  onlinePaymentEnabled: boolean;
  onOrdered: () => void;
  shareProgramId: string | null;
  restaurantName: string;
  mentionedOfferTitle: string | null;
}) {
  const { subtotal, taxAmount, tipAmount, total } = totals;
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "done" | "paying" | "paid" | "error">(
    "idle"
  );
  const [payOnline, setPayOnline] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

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
  }

  async function handleOrderSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitStatus("submitting");
    const result = await submitPublicOrderAction(
      token,
      referralCode,
      cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
      {
        guestName: String(form.get("guestName") ?? ""),
        guestPhone: String(form.get("guestPhone") ?? "") || null,
        paymentMethod: payOnline ? null : String(form.get("paymentMethod") ?? "") || null,
        tipAmount,
        payOnline,
        mentionedOfferTitle,
      }
    );
    if (!result.ok) {
      setSubmitStatus("error");
      return;
    }
    if (result.clientSecret) {
      setClientSecret(result.clientSecret);
      setSubmitStatus("paying");
    } else {
      onOrdered();
      setSubmitStatus("done");
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
            total={total}
            onPaid={() => {
              onOrdered();
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
            <div className="flex justify-between text-[14px] font-semibold text-mv-ink">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
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
              {onlinePaymentEnabled && (
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-mv-ink-soft">Paiement</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPayOnline(false)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium",
                        !payOnline
                          ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                          : "border-mv-border text-mv-ink-soft"
                      )}
                    >
                      Sur place
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayOnline(true)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium",
                        payOnline
                          ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                          : "border-mv-border text-mv-ink-soft"
                      )}
                    >
                      En ligne maintenant
                    </button>
                  </div>
                </div>
              )}
              {!payOnline && (
                <Field label="Mode de paiement sur place" hint="Optionnel">
                  <Input name="paymentMethod" placeholder="Ex : Carte, comptant" />
                </Field>
              )}
              {submitStatus === "error" && (
                <p className="text-[12.5px] text-mv-red">La commande a échoué. Réessayez.</p>
              )}
              <Button type="submit" disabled={submitStatus === "submitting"} className="w-full">
                {submitStatus === "submitting" ? "Envoi…" : `Envoyer la commande — ${formatCurrency(total)}`}
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
}: {
  item: MenuItem;
  quantity: number;
  onOpen: () => void;
  onQuickAdd: () => void;
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
}: {
  token: string;
  referralCode: string | null;
  landing: PublicMenuLanding;
  offers: Offer[];
  authenticated: boolean;
  shareProgramId: string | null;
  siblingLocations: SiblingLocation[];
}) {
  const { restaurantName, items, taxRate, acceptsTips, onlinePaymentEnabled } = landing;

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
        onOrdered={handleOrdered}
        shareProgramId={shareProgramId}
        restaurantName={restaurantName}
        mentionedOfferTitle={activeOffer}
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
