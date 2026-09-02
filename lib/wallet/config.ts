/**
 * Apple/Google Wallet pass config — same "gracefully absent until
 * configured" pattern as lib/pos/config.ts's QuickBooks/Square setup.
 * Neither platform has real credentials in this environment yet; every
 * caller must check the relevant isXConfigured() before attempting to
 * issue a pass, and degrade to a clear "not available yet" response
 * instead of a broken pass or a crash.
 */

export function isGoogleWalletConfigured() {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_WALLET_PRIVATE_KEY
  );
}

/**
 * Apple Wallet needs a full PKCS#7-signed .pkpass bundle (pass.json +
 * manifest.json with a SHA1 of every file + a detached signature made with
 * an Apple-issued Pass Type ID certificate and the WWDR intermediate
 * certificate). That signing step can't be built or verified without a
 * real Apple Developer Program membership ($99/year) and its certs — there
 * is no way to fake or test it safely, so it's intentionally left as a gate
 * + a documented follow-up rather than hand-rolled, unverifiable crypto.
 * See lib/wallet/apple-wallet.ts.
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
