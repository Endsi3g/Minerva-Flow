import { getLocalPhoneDigits } from "@/lib/phone";

/**
 * Pure payload shaping for a Google Wallet "save" JWT — no env reads, no
 * secrets, so it's directly unit-testable. google-wallet.ts (server-only)
 * supplies the issuer/service-account identifiers from env and signs it.
 */
/**
 * Public PNG Google fetches for the pass logo. It must be a real, directly
 * reachable image: the apex domain redirects to www and the site has no
 * /icon.png, so this points at the 512px app icon on the canonical host.
 */
export const GOOGLE_WALLET_LOGO_URL = "https://www.minervaflow.app/icon-512.png";

export type WalletLanguage = "fr" | "en";

const WALLET_COPY = {
  fr: {
    points: "Points",
    tier: "Palier",
    howHeader: "Comment ça marche",
    howBody: "Montrez ce code au comptoir à chaque visite pour cumuler des points et obtenir vos récompenses.",
    linkLabel: "Ouvrir mon espace fidélité",
  },
  en: {
    points: "Points",
    tier: "Tier",
    howHeader: "How it works",
    howBody: "Show this code at the counter on every visit to earn points and unlock your rewards.",
    linkLabel: "Open my loyalty account",
  },
} as const;

/** Stable ids: the same customer always maps to the same Wallet object, so a balance update can find it. */
export function googleLoyaltyObjectId(issuerId: string, customerId: string): string {
  return `${issuerId}.customer_${customerId.replace(/-/g, "")}`;
}

/** Fields Wallet shows as the balance; used for the initial pass and for later PATCH updates. */
export function buildGoogleBalanceFields(input: { points: number; tierLabel: string; language?: WalletLanguage }) {
  const copy = WALLET_COPY[input.language ?? "fr"];
  return {
    loyaltyPoints: { label: copy.points, balance: { string: String(Math.max(0, Math.round(input.points))) } },
    secondaryLoyaltyPoints: { label: copy.tier, balance: { string: input.tierLabel } },
  };
}

export function buildGoogleLoyaltyPayload(input: {
  issuerId: string;
  serviceAccountEmail: string;
  appUrl: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  pairingCode?: string | null;
  restaurantId: string;
  restaurantName: string;
  points: number;
  tierLabel: string;
  portalUrl: string;
  brandColorHex: string;
  language?: WalletLanguage;
}) {
  const copy = WALLET_COPY[input.language ?? "fr"];
  const classId = `${input.issuerId}.minerva_${input.restaurantId.replace(/-/g, "")}`;
  const objectId = googleLoyaltyObjectId(input.issuerId, input.customerId);

  const loyaltyClass = {
    id: classId,
    issuerName: "Minerva Flow",
    programName: input.restaurantName,
    programLogo: {
      sourceUri: { uri: GOOGLE_WALLET_LOGO_URL },
    },
    hexBackgroundColor: input.brandColorHex,
    countryCode: "CA",
    reviewStatus: "UNDER_REVIEW",
  };

  // Local digits (10 for North America): what the counter types to find a guest.
  const barcodeValue = input.customerPhone
    ? getLocalPhoneDigits(input.customerPhone)
    : (input.pairingCode || input.portalUrl);

  const barcodeAltText = input.customerPhone
    ? input.customerPhone
    : (input.pairingCode ? `Code : ${input.pairingCode}` : input.restaurantName);

  const loyaltyObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountId: input.customerId,
    accountName: input.customerName,
    ...buildGoogleBalanceFields({ points: input.points, tierLabel: input.tierLabel, language: input.language }),
    textModulesData: [{ id: "how_it_works", header: copy.howHeader, body: copy.howBody }],
    linksModuleData: { uris: [{ id: "portal", uri: input.portalUrl, description: copy.linkLabel }] },
    barcode: { type: "QR_CODE", value: barcodeValue, alternateText: barcodeAltText },
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
