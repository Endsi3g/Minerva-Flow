/**
 * Apple/Google Wallet pass config — same "gracefully absent until
 * configured" pattern as lib/pos/config.ts's QuickBooks/Square setup.
 * Every
 * caller must check the relevant isXConfigured() before attempting to
 * issue a pass, and degrade to a clear "not available yet" response
 * instead of a broken pass or a crash.
 */

export function isGoogleWalletConfigured() {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      (process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_WALLET_CLIENT_EMAIL) &&
      process.env.GOOGLE_WALLET_PRIVATE_KEY
  );
}

/** Apple passes are generated and signed by lib/wallet/apple-wallet.ts.
 * A real Apple Pass Type ID certificate, its matching private key and the
 * WWDR intermediate must be configured before the route can issue passes.
 */
export function isAppleWalletConfigured() {
  return Boolean(
    process.env.APPLE_WALLET_TEAM_ID &&
      process.env.APPLE_WALLET_PASS_TYPE_ID &&
      process.env.APPLE_WALLET_SIGNER_CERT &&
      process.env.APPLE_WALLET_SIGNER_KEY &&
      process.env.APPLE_WALLET_WWDR_CERT
  );
}
