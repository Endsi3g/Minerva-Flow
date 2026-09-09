import { NextResponse } from "next/server";

/**
 * Universal Links config for the native app — fetched by iOS itself
 * (never a browser) over HTTPS at install/update, enabling a /t/{code}
 * touchpoint or /p/{code} referral link to open MinervaFlow directly
 * instead of Safari (see DeepLinkRouter.swift's
 * NSUserActivityTypeBrowsingWeb handling + MinervaFlow.entitlements'
 * applinks:minervaflow.app domain).
 *
 * Lives here, not at app/.well-known/apple-app-site-association/route.ts,
 * because Next.js's own static/App-Router file resolution silently
 * ignores dot-prefixed path segments (confirmed live: that route AND an
 * equivalent public/.well-known/ static file both fell through to the
 * same catch-all that redirects any unmatched path to /login — same
 * behavior as a plain 404). next.config.ts rewrites the public-facing
 * /.well-known/apple-app-site-association URL to this route instead,
 * which is the standard workaround for this exact, well-documented
 * Next.js limitation.
 *
 * "DV9V35452J" is the Apple Developer Team ID (native/ios/project.yml's
 * DEVELOPMENT_TEAM) — required as the appID prefix per Apple's spec, not
 * a secret. Locale-prefixed path variants are included since
 * i18n/routing.ts uses localePrefix "as-needed" (fr unprefixed, en/tr
 * prefixed).
 *
 * Verification requires minervaflow.app's TLS to actually work — until
 * the known cert issue (see project memory) is fixed, iOS can't fetch
 * this file at all and Universal Links silently won't activate; regular
 * links keep working exactly as they do today in the meantime (Universal
 * Links degrade to a plain web link on verification failure, never an
 * error).
 */
const APP_ID = "DV9V35452J.com.minervaflow.loyalty";

export async function GET() {
  return NextResponse.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: APP_ID,
          paths: [
            "/t/*",
            "/p/*",
            "/fr/t/*",
            "/fr/p/*",
            "/en/t/*",
            "/en/p/*",
            "/tr/t/*",
            "/tr/p/*",
          ],
        },
      ],
    },
  });
}
