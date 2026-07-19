import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlProxy from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlProxy(routing);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");

  // Locale detection/redirect/rewrite only applies to page routes — API
  // routes are never locale-prefixed.
  const response = isApiRoute ? NextResponse.next({ request }) : handleI18nRouting(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Strip a leading /tr (or any other non-default locale) so route checks
  // below match against the same paths regardless of locale prefix.
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
  const localeMatch = isApiRoute ? null : pathname.match(localePattern);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
  const pathWithoutLocale = isApiRoute
    ? pathname
    : (localeMatch ? pathname.slice(localeMatch[0].length) : pathname) || "/";

  const publicRoutes = [
    "/login",
    "/sign-up",
    "/sign-up-success",
    "/forgot-password",
    "/update-password",
    "/onboarding",
  ];
  // skipTrailingSlashRedirect (next.config.ts) means "/login" and "/login/"
  // are both live, distinct paths — strip the trailing slash before matching
  // so a request to either form is recognized as the same public route.
  const isAuthRoute =
    publicRoutes.includes(pathWithoutLocale) ||
    pathWithoutLocale.startsWith("/auth/") ||
    // Invite links and shared report links must be viewable before login —
    // the page itself checks auth state and prompts to sign in when needed.
    pathWithoutLocale.startsWith("/invite/") ||
    pathWithoutLocale.startsWith("/r/") ||
    pathWithoutLocale.startsWith("/h/") ||
    pathWithoutLocale.startsWith("/e/") ||
    pathWithoutLocale.startsWith("/legal/") ||
    // Customer portal (magic-link login) and public referral links — never
    // restaurant_members, so they must be reachable before any session
    // exists; the pages themselves gate on their own auth state.
    pathWithoutLocale.startsWith("/portal") ||
    pathWithoutLocale.startsWith("/p/") ||
    pathWithoutLocale.startsWith("/m/");

  // Server-to-server callers (Vercel Cron, Stripe, Square) never carry a
  // Supabase session cookie — redirecting them to /login silently turns
  // their request into an HTML page and the route handler's own auth check
  // (CRON_SECRET, webhook signature) never even runs. These verify
  // themselves; the rest of /api/* still relies on the session check below.
  const isServerCallbackRoute =
    pathWithoutLocale.startsWith("/api/cron/") ||
    pathWithoutLocale.startsWith("/api/webhooks/") ||
    pathWithoutLocale === "/api/stripe/webhook";

  if (!user && !isAuthRoute && !isServerCallbackRoute && pathWithoutLocale !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = locale === routing.defaultLocale ? "/login" : `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!monitoring|ingest|manifest\\.webmanifest|client-manifest\\.webmanifest|sw\\.js|offline\\.html|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
