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
    /// Uses the canonical www host directly — the bare domain 308-redirects
    /// here, which URLSession follows transparently for GET but adds a
    /// pointless extra round trip (and one more thing that could misbehave)
    /// on every single bridge call, including POST/DELETE.
    static let apiBaseURL = URL(string: "https://www.minervaflow.app")!

    /// Matches the CFBundleURLSchemes entry in project.yml — where
    /// ASWebAuthenticationSession hands control back to this app once
    /// Google/Facebook redirect the OAuth flow to Supabase and Supabase
    /// redirects it here.
    static let oauthRedirectURL = URL(string: "minervaflow://login-callback")!

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
