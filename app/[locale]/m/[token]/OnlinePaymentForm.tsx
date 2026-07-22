"use client";

import { useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe/browser";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

function PaymentForm({ total, onPaid }: { total: number; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setStatus("submitting");
    setError(null);

    // redirect:"if_required" — most Canadian card payments confirm inline,
    // no bounce to a bank redirect page needed. If one IS required, Stripe
    // navigates away and back on its own; this branch never runs then.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setStatus("error");
      setError(confirmError.message ?? "Le paiement a échoué. Réessayez.");
      return;
    }

    // The webhook (app/api/stripe/webhook/route.ts) is the authoritative
    // source that flips the order to "payé" — this is UX-only, so the
    // copy stays deliberately cautious rather than claiming success.
    onPaid();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      {error && <p className="text-[12.5px] text-mv-red">{error}</p>}
      <Button type="submit" disabled={!stripe || status === "submitting"} className="w-full">
        {status === "submitting" ? "Traitement…" : `Payer ${formatCurrency(total)}`}
      </Button>
    </form>
  );
}

export function OnlinePaymentForm({
  clientSecret,
  total,
  onPaid,
}: {
  clientSecret: string;
  total: number;
  onPaid: () => void;
}) {
  return (
    <Elements
      options={{ clientSecret, appearance: { theme: "stripe" } }}
      stripe={getStripePromise()}
    >
      <PaymentForm total={total} onPaid={onPaid} />
    </Elements>
  );
}
