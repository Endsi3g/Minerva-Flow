export type ConnectCapabilityStatus = "active" | "pending" | "restricted" | "unsupported" | "unrequested";
export type RestaurantConnectApiVersion = "v1" | "v2";

export function isRestaurantConnectReady(input: {
  apiVersion: RestaurantConnectApiVersion;
  legacyChargesEnabled: boolean;
  transfersStatus: ConnectCapabilityStatus;
  payoutsStatus: ConnectCapabilityStatus;
}): boolean {
  if (input.apiVersion === "v2") {
    return input.transfersStatus === "active" && input.payoutsStatus === "active";
  }

  // Keep existing V1-linked restaurants functional while they remain on
  // their original hosted onboarding and capability model.
  return input.legacyChargesEnabled;
}

/** Platform-level configuration and restaurant-level capabilities are both
 * required before the app may offer or create an online payment. */
export function canAcceptRestaurantOnlinePayments(input: {
  platformConfigured: boolean;
  accountId: string | null | undefined;
  apiVersion: RestaurantConnectApiVersion | null | undefined;
  legacyChargesEnabled: boolean;
  transfersStatus: ConnectCapabilityStatus;
  payoutsStatus: ConnectCapabilityStatus;
}): boolean {
  if (!input.platformConfigured || !input.accountId || !input.apiVersion) return false;
  return isRestaurantConnectReady({
    apiVersion: input.apiVersion,
    legacyChargesEnabled: input.legacyChargesEnabled,
    transfersStatus: input.transfersStatus,
    payoutsStatus: input.payoutsStatus,
  });
}
