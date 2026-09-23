import type { OrderFulfillmentMode } from "@/lib/types";

export type PublicFulfillmentMode = "sur_place" | "livraison";

export type PublicCheckoutOptions = {
  fulfillmentModes: PublicFulfillmentMode[];
  canPayAtReceipt: boolean;
  canPayOnline: boolean;
};

/** Quotes can use pickup anywhere, but must never promise delivery a restaurant disabled. */
export function isQuoteFulfillmentAvailable(
  fulfillmentMode: PublicFulfillmentMode,
  deliveryEnabled: boolean
): boolean {
  return fulfillmentMode === "sur_place" || (fulfillmentMode === "livraison" && deliveryEnabled);
}

/**
 * Legacy restaurant settings store pickup, online preparation, and delivery
 * in one array. Normalize that setting into independent choices for the
 * customer, while never offering online payment unless Stripe Connect is live.
 */
export function getPublicCheckoutOptions(
  configuredModes: OrderFulfillmentMode[],
  onlinePaymentEnabled: boolean,
  deliveryEnabled: boolean
): PublicCheckoutOptions {
  const canPickup = configuredModes.some((mode) =>
    mode === "sur_place" || mode === "immediat" || mode === "prep_apres_paiement"
  );
  const canDeliver = configuredModes.includes("livraison") && deliveryEnabled;
  const fulfillmentModes: PublicFulfillmentMode[] = [];
  if (canPickup) fulfillmentModes.push("sur_place");
  if (canDeliver) fulfillmentModes.push("livraison");

  const canPayAtReceipt = (canPickup && configuredModes.includes("sur_place")) || canDeliver;
  const canPayOnline = onlinePaymentEnabled && configuredModes.some((mode) =>
    mode === "immediat" || mode === "prep_apres_paiement" || mode === "livraison"
  );

  return { fulfillmentModes, canPayAtReceipt, canPayOnline };
}
