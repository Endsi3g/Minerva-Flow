import "server-only";
import { signJwtRS256 } from "./jwt";
import { buildGoogleLoyaltyPayload } from "./google-loyalty-payload";

/**
 * Builds the "Save to Google Wallet" link for a customer's loyalty pass.
 * Google's flow needs no binary file (unlike Apple's .pkpass): a signed JWT
 * that embeds the loyalty class + object definitions inline, redirected to
 * via https://pay.google.com/gp/v/save/<jwt>. The private key comes from a
 * Google Cloud service account with the Wallet Object Issuer role — see
 * isGoogleWalletConfigured() in lib/wallet/config.ts for the required env
 * vars, none of which exist in this environment yet.
 */
export function buildGoogleWalletSaveUrl(input: {
  customerId: string;
  customerName: string;
  restaurantId: string;
  restaurantName: string;
  points: number;
  tierLabel: string;
  portalUrl: string;
  brandColorHex: string;
}): string {
  const payload = buildGoogleLoyaltyPayload({
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID!,
    serviceAccountEmail: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL!,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app",
    ...input,
  });

  const privateKey = (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return `https://pay.google.com/gp/v/save/${signJwtRS256(payload, privateKey)}`;
}
