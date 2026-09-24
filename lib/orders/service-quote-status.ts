import type { OrderPaymentStatus } from "@/lib/types";

/** Owner-facing payment label for a converted service quote and its order deposit. */
export function getServiceQuotePaymentLabel(
  paymentStatus: OrderPaymentStatus | null | undefined,
  depositPaidAmount: number | null | undefined,
  totalAmount: number | null | undefined
): string {
  const paid = Number.isFinite(depositPaidAmount) ? Math.max(0, Number(depositPaidAmount)) : 0;
  const total = Number.isFinite(totalAmount) ? Math.max(0, Number(totalAmount)) : 0;

  if (paymentStatus === "echoue") return "Paiement échoué";
  if (paymentStatus === "paye") return total > 0 && paid > 0 && paid < total ? "Acompte reçu" : "Payé";
  if (paymentStatus === "en_attente") return paid > 0 ? "Solde à payer" : "Paiement en attente";
  return "Paiement sur place";
}
