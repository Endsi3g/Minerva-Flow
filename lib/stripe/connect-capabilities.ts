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
