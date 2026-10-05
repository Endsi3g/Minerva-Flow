package com.minervaflow.loyalty.data

enum class ApiErrorKind {
    InvalidCredentials,
    EmailNotConfirmed,
    CodeInvalid,
    RateLimited,
    SignedOut,
    NotAvailable,
    Network,
    Unknown,
}

class ApiException(
    val kind: ApiErrorKind,
    val status: Int = 0,
    message: String? = null,
    cause: Throwable? = null,
) : Exception(message ?: kind.name, cause)

object ApiErrors {
    /** Maps an HTTP status and error body to something the UI can word for the person. */
    fun classify(status: Int, body: String): ApiErrorKind {
        val text = body.lowercase()
        return when {
            text.contains("invalid login credentials") -> ApiErrorKind.InvalidCredentials
            text.contains("email not confirmed") -> ApiErrorKind.EmailNotConfirmed
            status == 429 || text.contains("rate limit") || text.contains("over_email_send_rate_limit") -> ApiErrorKind.RateLimited
            text.contains("otp_expired") || text.contains("token has expired") -> ApiErrorKind.CodeInvalid
            status == 503 -> ApiErrorKind.NotAvailable
            status == 401 -> ApiErrorKind.SignedOut
            else -> ApiErrorKind.Unknown
        }
    }
}
