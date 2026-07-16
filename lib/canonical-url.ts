/**
 * The app is reachable through several Vercel domain aliases (the stable
 * one, per-branch, per-deployment previews) — an OAuth redirect_uri built
 * from whichever one the visitor happened to use won't match what's
 * registered with Google/Square, causing redirect_uri_mismatch. Every
 * OAuth authorize/callback pair must agree on ONE fixed origin, so this
 * always wins over the incoming request's actual origin when set.
 */
export function canonicalOrigin(requestOrigin: string): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? requestOrigin;
}
