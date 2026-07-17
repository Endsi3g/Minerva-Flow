"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { requestCustomerMagicLink } from "@/lib/auth/customer-magic-link";
import { submitPublicOrderAction } from "./actions";
import { formatCurrency, roundToCents, cn } from "@/lib/utils";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { CustomerPushToggle } from "@/components/pwa/CustomerPushToggle";
import type { MenuItem, Offer } from "@/lib/types";
import type { PublicMenuLanding } from "@/lib/data/menu-shares";
import Link from "next/link";
import { Plus, Minus, ShoppingCart, Mail, CheckCircle2, Heart } from "lucide-react";

type CartLine = { item: MenuItem; quantity: number };
type OrderTotals = { subtotal: number; taxAmount: number; tipAmount: number; total: number };

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
  onOrdered,
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
  onOrdered: () => void;
}) {
  const { subtotal, taxAmount, tipAmount, total } = totals;
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

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
    const ok = await submitPublicOrderAction(
      token,
      referralCode,
      cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
      {
        guestName: String(form.get("guestName") ?? ""),
        guestPhone: String(form.get("guestPhone") ?? "") || null,
        paymentMethod: String(form.get("paymentMethod") ?? "") || null,
        tipAmount,
      }
    );
    if (ok) onOrdered();
    setSubmitStatus(ok ? "done" : "error");
  }

  return (
    <Modal open={open} onClose={onClose} title="Votre commande" width={480}>
      {submitStatus === "done" ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
            <CheckCircle2 size={18} />
          </div>
          <p className="font-display text-[17px] font-medium text-mv-ink">Commande envoyée</p>
          <p className="mt-1.5 text-[13px] text-mv-ink-soft">
            Vous paierez sur place. Le restaurant confirmera sous peu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
              <Field label="Mode de paiement sur place" hint="Optionnel">
                <Input name="paymentMethod" placeholder="Ex : Carte, comptant" />
              </Field>
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

export function MenuOrderFlow({
  token,
  referralCode,
  landing,
  offers,
  authenticated,
}: {
  token: string;
  referralCode: string | null;
  landing: PublicMenuLanding;
  offers: Offer[];
  authenticated: boolean;
}) {
  const { restaurantName, items, taxRate, acceptsTips } = landing;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tipPct, setTipPct] = useState<number | null>(acceptsTips ? 0.15 : null);

  // Cart survives the magic-link round trip (a full page reload) via
  // localStorage — otherwise a customer who clicks the emailed link would
  // come back to find their cart empty. Re-opens checkout automatically
  // once authenticated if there's still something in the cart.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mv-cart-${token}`);
      const parsed = saved ? (JSON.parse(saved) as Record<string, number>) : {};
      setCart(parsed);
      if (authenticated && Object.values(parsed).some((q) => q > 0)) {
        setCheckoutOpen(true);
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Link
            href="/portal"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3.5 py-2 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft hover:text-mv-ink"
          >
            <Heart size={14} className="text-mv-green-dark" /> Mes points
          </Link>
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
                </Card>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-[13px] text-mv-ink-faint">Aucun plat disponible pour l&apos;instant.</p>
        ) : (
          categories.map(([category, catItems]) => (
            <div key={category} className="mb-6">
              <p className="mb-2 text-[13px] font-semibold text-mv-ink">{category}</p>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <Card key={item.id} className="flex items-center gap-3">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-mv-ink">{item.name}</p>
                      {item.description && (
                        <p className="line-clamp-2 text-[11.5px] text-mv-ink-faint">{item.description}</p>
                      )}
                      <p className="mt-0.5 text-[12.5px] font-semibold text-mv-green-dark">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {(cart[item.id] ?? 0) > 0 && (
                        <>
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            aria-label="Retirer un"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-mv-border text-mv-ink-soft"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-4 text-center text-[13px] font-medium">{cart[item.id]}</span>
                        </>
                      )}
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        aria-label="Ajouter un"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-mv-green text-mv-cream-soft"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
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
        onOrdered={handleOrdered}
      />
    </div>
  );
}
