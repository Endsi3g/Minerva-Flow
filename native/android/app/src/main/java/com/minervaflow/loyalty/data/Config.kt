package com.minervaflow.loyalty.data

/**
 * Public project URL and publishable key: safe to ship in a client, exactly like the iOS app and
 * the web app's NEXT_PUBLIC_* values. Row Level Security is the trust boundary, not secrecy.
 */
object Config {
    const val SUPABASE_URL = "https://vcfaianbdjowmiqaheee.supabase.co"
    const val SUPABASE_ANON_KEY = "sb_publishable_DqXl75SSLlJL8MUKsdC0Wg_KujBsY8D"

    /** Hosts the bridge routes. Must be www: the apex redirects, and a redirect drops the Authorization header. */
    const val API_BASE = "https://www.minervaflow.app"

    /** Printed on QR codes and shared links; for links only, never for authenticated calls. */
    const val LINK_BASE = "https://minervaflow.app"

    const val SUPPORT_EMAIL = "support@minervaflow.app"
    const val PRIVACY_URL = "$API_BASE/legal/privacy"
    const val TERMS_URL = "$API_BASE/legal/terms"
}
