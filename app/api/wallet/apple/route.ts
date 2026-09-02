import { NextResponse } from "next/server";
import { isAppleWalletConfigured } from "@/lib/wallet/config";

/**
 * Apple Wallet passes need a full PKCS#7-signed .pkpass bundle, which needs
 * an Apple Developer Program membership and its Pass Type ID certificate —
 * see the comment on isAppleWalletConfigured() in lib/wallet/config.ts for
 * why that signing step is a documented follow-up rather than code here.
 * This route is real and ready to build the pass from once those certs
 * exist; until then it degrades to a clear "not available yet" response
 * instead of a broken pass.
 */
export async function GET() {
  if (!isAppleWalletConfigured()) {
    return NextResponse.json(
      {
        error:
          "Apple Wallet n'est pas encore configuré. Un compte Apple Developer Program et un certificat Pass Type ID sont requis — voir lib/wallet/config.ts.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: "Génération du pass Apple Wallet pas encore implémentée." }, { status: 501 });
}
