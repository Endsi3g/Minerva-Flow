import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  const isAuthRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/auth/") ||
    // Invite links and shared report links must be viewable before login —
    // the page itself checks auth state and prompts to sign in when needed.
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/legal/");

  // Server-to-server callers (Vercel Cron, Stripe, Square) never carry a
  // Supabase session cookie — redirecting them to /login silently turns
  // their request into an HTML page and the route handler's own auth check
  // (CRON_SECRET, webhook signature) never even runs. These verify
  // themselves; the rest of /api/* still relies on the session check below.
  const isServerCallbackRoute =
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname === "/api/stripe/webhook";

  if (!user && !isAuthRoute && !isServerCallbackRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!monitoring|ingest|manifest\\.webmanifest|sw\\.js|offline\\.html|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
