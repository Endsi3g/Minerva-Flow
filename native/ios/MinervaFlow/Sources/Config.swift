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
    /// Custom domain — DNS now correctly points at Vercel (A record →
    /// 216.198.79.1, www CNAME → cname.vercel-dns.com) and Vercel shows
    /// valid, auto-renewing certificates issued for both minervaflow.app
    /// and www.minervaflow.app. An earlier version of this comment claimed
    /// the domain failed TLS verification "confirmed from outside this
    /// machine's own network" — that "external" check was itself run from
    /// this same sandboxed tool environment, which sits behind a Fortinet
    /// SSL-inspection proxy that re-signs every HTTPS response with its own
    /// CA; every curl/WebFetch check from here is unreliable for judging a
    /// domain's real-world TLS status. Don't repeat that mistake — an
    /// agent's own tool-execution environment is not "outside the network"
    /// just because the request looks like it left the machine.
    static let apiBaseURL = URL(string: "https://minervaflow.app")!

    /// Matches the CFBundleURLSchemes entry in project.yml — where
    /// ASWebAuthenticationSession hands control back to this app once
    /// Google/Facebook redirect the OAuth flow to Supabase and Supabase
    /// redirects it here.
    static let oauthRedirectURL = URL(string: "minervaflow://login-callback")!

    /// Public client DSN for Minerva Flow iOS in the Minerva Sentry org.
    /// DSNs identify an ingest project; they are not authentication tokens.
    static let sentryDSN = "https://31c725e304838cdcd9923c71682ddfd8@o4512147373686784.ingest.us.sentry.io/4512147453116416"

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
