import type { OrderPaymentStatus } from "@/lib/types";

/** Preparation is blocked only while a real online payment attempt is unresolved. */
export function isOrderPaymentUnresolved(paymentStatus: OrderPaymentStatus, depositPaidAmount: number | null | undefined): boolean {
  if (Number.isFinite(depositPaidAmount) && Number(depositPaidAmount) > 0) return false;
  return paymentStatus === "en_attente" || paymentStatus === "echoue";
}
