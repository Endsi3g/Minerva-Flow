import "server-only";
import crypto from "node:crypto";
import { signJwtRS256 } from "./jwt";
import { buildGoogleBalanceFields, googleLoyaltyObjectId, type WalletLanguage } from "./google-loyalty-payload";
import { isGoogleWalletConfigured } from "./config";

/**
 * Keeps a saved Google Wallet pass up to date. The "save" JWT only freezes the
 * balance at the moment the pass is added; afterwards the Wallet Objects API
 * must be called with the service account to change it. A customer who never
 * added the pass has no object, which Google answers with 404: that is a
 * normal "nothing to update", not an error.
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const OBJECT_URL = "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_WALLET_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !privateKey) return null;

  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwtRS256({ iss: email, scope: WALLET_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600, jti: crypto.randomUUID() }, privateKey);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) {
    console.error("[Google Wallet] token request failed:", response.status);
    return null;
  }
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

export type WalletSyncResult = "updated" | "not_saved" | "skipped" | "error";

export async function syncGoogleWalletBalance(input: {
  customerId: string;
  points: number;
  tierLabel: string;
  language?: WalletLanguage;
}): Promise<WalletSyncResult> {
  if (!isGoogleWalletConfigured()) return "skipped";
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  try {
    const token = await getAccessToken();
    if (!token) return "error";
    const objectId = googleLoyaltyObjectId(issuerId, input.customerId);
    const response = await fetch(`${OBJECT_URL}/${encodeURIComponent(objectId)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildGoogleBalanceFields(input)),
    });
    if (response.ok) return "updated";
    if (response.status === 404) return "not_saved";
    console.error("[Google Wallet] balance update failed:", response.status);
    return "error";
  } catch (error) {
    console.error("[Google Wallet] balance update threw:", error);
    return "error";
  }
}
