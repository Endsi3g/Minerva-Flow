import "server-only";
import { PKPass } from "passkit-generator";
import { applePassImageBuffers } from "./apple-pass-images";
import { getLocalPhoneDigits } from "@/lib/phone";

function certificate(value: string): string {
  const normalized = value.replace(/\\n/g, "\n").trim();
  if (normalized.includes("BEGIN")) return normalized;
  return Buffer.from(normalized, "base64").toString("utf8");
}

export function buildAppleLoyaltyPass(input: {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  restaurantName: string;
  points: number;
  tierLabel: string;
  portalUrl: string;
  brandColor?: string;
}) {
  const pass = new PKPass(applePassImageBuffers(), {
    wwdr: certificate(process.env.APPLE_WALLET_WWDR_CERT!),
    signerCert: certificate(process.env.APPLE_WALLET_SIGNER_CERT!),
    signerKey: certificate(process.env.APPLE_WALLET_SIGNER_KEY!),
    signerKeyPassphrase: process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE,
  }, {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID!,
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID!,
    serialNumber: `minerva-${input.customerId}-${process.env.APPLE_WALLET_PASS_TYPE_ID}`,
    organizationName: "Minerva Flow",
    description: `Carte fidélité ${input.restaurantName}`,
    logoText: input.restaurantName,
    backgroundColor: input.brandColor || "rgb(14, 90, 64)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(245, 241, 230)",
    // No webServiceURL / authenticationToken: Apple requires both together and a live
    // registration service behind them, which does not exist. A static pass is valid;
    // adding live point updates means building that service first.
  });

  pass.type = "storeCard";
  pass.primaryFields.push({ key: "points", label: "POINTS", value: String(input.points) });
  pass.secondaryFields.push({ key: "tier", label: "STATUT", value: input.tierLabel });
  pass.auxiliaryFields.push({ key: "member", label: "MEMBRE", value: input.customerName });
  pass.backFields.push({ key: "restaurant", label: "ÉTABLISSEMENT", value: input.restaurantName });
  pass.backFields.push({ key: "portal", label: "VOTRE ESPACE", value: input.portalUrl });
  // The counter identifies a guest by phone number; fall back to the customer id.
  const phoneDigits = getLocalPhoneDigits(input.customerPhone);
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: phoneDigits || input.customerId, messageEncoding: "iso-8859-1" });
  return pass.getAsBuffer();
}
