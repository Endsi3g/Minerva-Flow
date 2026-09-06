import Foundation

/// Public project URL + publishable (anon) key — safe to embed in a client
/// binary, same as the web app's NEXT_PUBLIC_* env vars. Row Level Security
/// is the actual trust boundary, not secrecy of these values.
enum Config {
    static let supabaseURL = URL(string: "https://vcfaianbdjowmiqaheee.supabase.co")!
    static let supabaseAnonKey = "sb_publishable_DqXl75SSLlJL8MUKsdC0Wg_KujBsY8D"
}
