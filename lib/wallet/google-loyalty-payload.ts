/**
 * Pure payload shaping for a Google Wallet "save" JWT — no env reads, no
 * secrets, so it's directly unit-testable. google-wallet.ts (server-only)
 * supplies the issuer/service-account identifiers from env and signs it.
 */
export function buildGoogleLoyaltyPayload(input: {
  issuerId: string;
  serviceAccountEmail: string;
  appUrl: string;
  customerId: string;
  customerName: string;
  restaurantId: string;
  restaurantName: string;
  points: number;
  tierLabel: string;
  portalUrl: string;
  brandColorHex: string;
}) {
  const classId = `${input.issuerId}.minerva_${input.restaurantId.replace(/-/g, "")}`;
  const objectId = `${input.issuerId}.customer_${input.customerId.replace(/-/g, "")}`;

  const loyaltyClass = {
    id: classId,
    issuerName: "Minerva Flow",
    programName: input.restaurantName,
    programLogo: {
      sourceUri: { uri: "https://minervaflow.app/icon.png" },
    },
    hexBackgroundColor: input.brandColorHex,
    reviewStatus: "UNDER_REVIEW",
  };

  const loyaltyObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountId: input.customerId,
    accountName: input.customerName,
    loyaltyPoints: { label: "Points", balance: { string: String(input.points) } },
    secondaryLoyaltyPoints: { label: "Palier", balance: { string: input.tierLabel } },
    barcode: { type: "QR_CODE", value: input.portalUrl, alternateText: input.restaurantName },
    hexBackgroundColor: input.brandColorHex,
  };

  return {
    iss: input.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [input.appUrl],
    payload: {
      loyaltyClasses: [loyaltyClass],
      loyaltyObjects: [loyaltyObject],
    },
  };
}
