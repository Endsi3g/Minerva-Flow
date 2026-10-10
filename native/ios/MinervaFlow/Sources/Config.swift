import Foundation

/// Public project URL + publishable (anon) key — safe to embed in a client
/// binary, same as the web app's NEXT_PUBLIC_* env vars. Row Level Security
/// is the actual trust boundary, not secrecy of these values.
enum Config {
    static let supabaseURL = URL(string: testOverride("MV_TEST_SUPABASE_URL") ?? "https://vcfaianbdjowmiqaheee.supabase.co")!
    static let supabaseAnonKey = testOverride("MV_TEST_SUPABASE_ANON_KEY") ?? "sb_publishable_DqXl75SSLlJL8MUKsdC0Wg_KujBsY8D"

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
    /// Must be the `www` host. The apex (minervaflow.app) answers every request
    /// with a 308 redirect to www, and URLSession drops the Authorization
    /// header when a redirect changes host, so every authenticated bridge call
    /// (menu, restaurant name, referrals, discovery) arrived unauthenticated
    /// and failed with 401. Pointing straight at www avoids the redirect.
    static let apiBaseURL = URL(string: testOverride("MV_TEST_API_URL") ?? "https://www.minervaflow.app")!

    /// The address printed on QR codes, programmed on NFC tags and shared as
    /// referral links. It stays on the apex because that is the host declared
    /// in the app's associated domains (applinks:minervaflow.app), so a tap can
    /// open the app, and it matches the QR codes the web already prints. It is
    /// for links only: never send authenticated API requests through it.
    static let publicLinkBaseURL = URL(string: "https://minervaflow.app")!

    /// Published privacy policy (app/[locale]/legal/privacy) — the same URL
    /// declared in App Store Connect; reachable in-app from sign-up and Aide.
    static let privacyPolicyURL = apiBaseURL.appending(path: "/legal/privacy")
    static let termsURL = apiBaseURL.appending(path: "/legal/terms")

    /// Customer support address, shown in Aide and the owner Support section.
    static let supportEmail = "support@minervaflow.app"

    /// PostHog public project token (write-only, safe to ship; same project as the web app).
    static let posthogToken = "phc_BeCxC7r935Jgwmbw3oWz7iNZZGp6y4xbFkCoBqoy3t4j"
    static let posthogHost = "https://us.i.posthog.com"

    /// Matches the CFBundleURLSchemes entry in project.yml — where
    /// ASWebAuthenticationSession hands control back to this app once
    /// Google/Facebook redirect the OAuth flow to Supabase and Supabase
    /// redirects it here.
    static let oauthRedirectURL = URL(string: "minervaflow://login-callback")!

    /// Public client DSN for Minerva Flow iOS in the Minerva Sentry org.
    /// DSNs identify an ingest project; they are not authentication tokens.
    static let sentryDSN = "https://31c725e304838cdcd9923c71682ddfd8@o4512147373686784.ingest.us.sentry.io/4512147453116416"

    private static func testOverride(_ name: String) -> String? {
        #if DEBUG
        guard ProcessInfo.processInfo.arguments.contains("-minervaUITestAuth") || ProcessInfo.processInfo.arguments.contains("-minervaUITestStaging") else { return nil }
        return ProcessInfo.processInfo.environment[name]
        #else
        return nil
        #endif
    }

    #if DEBUG
    static var devTestEmail: String { ProcessInfo.processInfo.environment["MV_TEST_EMAIL"] ?? "" }
    static var devTestPassword: String { ProcessInfo.processInfo.environment["MV_TEST_PASSWORD"] ?? "" }
    #endif

}

enum SupportContact {
    /// Opens the user's mail app addressed to support (contact only — account
    /// deletion is done in-app from Compte › Sécurité, never by email).
    static var emailURL: URL {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = Config.supportEmail
        return components.url ?? Config.apiBaseURL
    }
}
