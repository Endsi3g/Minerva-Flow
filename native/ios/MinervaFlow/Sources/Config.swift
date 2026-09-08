import Foundation

/// Public project URL + publishable (anon) key — safe to embed in a client
/// binary, same as the web app's NEXT_PUBLIC_* env vars. Row Level Security
/// is the actual trust boundary, not secrecy of these values.
enum Config {
    static let supabaseURL = URL(string: "https://vcfaianbdjowmiqaheee.supabase.co")!
    static let supabaseAnonKey = "sb_publishable_DqXl75SSLlJL8MUKsdC0Wg_KujBsY8D"

    /// The web app itself, hosting the native bridge routes (Server
    /// Actions aren't callable from native, see app/api/portal/*) — a
    /// customer's own Supabase session token is sent as a Bearer header
    /// to these, same trust boundary as the web portal's RLS-scoped
    /// requests, just presented differently (see lib/auth/native-bearer.ts).
    ///
    /// TEMPORARY: pointed at the Vercel-issued domain, not the custom
    /// minervaflow.app/www.minervaflow.app domain — both of those currently
    /// fail TLS certificate verification ("unable to verify the first
    /// certificate"), confirmed from outside this machine's own network,
    /// which is what was actually causing Commander/menu, the restaurant
    /// map, and restaurant-name lookups to come back empty in the native
    /// app for every user, not a local network quirk. Check Vercel →
    /// Settings → Domains for minervaflow.app once this is fixed there,
    /// then switch this back to the custom domain.
    static let apiBaseURL = URL(string: "https://minerva-flow.vercel.app")!

    /// Matches the CFBundleURLSchemes entry in project.yml — where
    /// ASWebAuthenticationSession hands control back to this app once
    /// Google/Facebook redirect the OAuth flow to Supabase and Supabase
    /// redirects it here.
    static let oauthRedirectURL = URL(string: "minervaflow://login-callback")!

    /// The web app already has a real, active Sentry organization
    /// (sentry.server.config.ts) — this is deliberately empty, not
    /// missing infrastructure: SentrySDK.start() is only called when this
    /// is non-empty (see MinervaFlowApp.swift), so crash reporting stays a
    /// harmless no-op until it's filled in. To finish this, create a new
    /// "iOS" project inside that SAME existing Sentry organization
    /// (Settings → Projects → Create Project — a few clicks, not a new
    /// account) and paste its DSN here.
    static let sentryDSN = ""

    #if DEBUG
    /// A real customers row + linked auth user created for local testing
    /// (see supabase/migrations' handle_new_user linking logic) — lets the
    /// simulator/device skip the email round-trip while OTP delivery is
    /// being debugged, without faking RLS: this still authenticates a real
    /// Supabase session via password grant, so every screen behind it
    /// exercises the actual RLS policies. Never compiled into a Release
    /// build.
    static let devTestEmail = "dev-test@minervaflow.app"
    static let devTestPassword = "MinervaDevTest2026!"
    #endif
}
