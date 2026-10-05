package com.minervaflow.loyalty.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/** HTTP result: status code and raw body. */
data class HttpResult(val status: Int, val body: String) {
    val ok: Boolean get() = status in 200..299
}

/**
 * Talks to Supabase Auth, PostgREST and the web app's bridge routes. Every authenticated call uses the
 * signed-in person's own token (Row Level Security applies), renews it shortly before it expires, and
 * retries once if the server still answers 401.
 */
class ApiClient(
    private val http: OkHttpClient,
    private val store: SessionStore,
    val json: Json = AppJson,
) {
    private val refreshLock = Mutex()
    private val jsonMedia = "application/json".toMediaType()

    // ---- Auth -------------------------------------------------------------------------------------------

    suspend fun signInWithPassword(email: String, password: String): Session {
        val res = send(authRequest("token", "?grant_type=password", buildJsonObject {
            put("email", email)
            put("password", password)
        }))
        if (!res.ok) throw ApiException(ApiErrors.classify(res.status, res.body), res.status)
        return persist(json.decodeFromString<AuthResponse>(res.body))
    }

    /** Returns the session, or null when the project asks the person to confirm their email first. */
    suspend fun signUpWithPassword(email: String, password: String, marketingOptIn: Boolean): Session? {
        val res = send(authRequest("signup", "", buildJsonObject {
            put("email", email)
            put("password", password)
            put("data", customerMetadata(marketingOptIn))
        }))
        if (!res.ok) throw ApiException(ApiErrors.classify(res.status, res.body), res.status)
        val parsed = json.decodeFromString<AuthResponse>(res.body)
        return if (parsed.accessToken != null) persist(parsed) else null
    }

    /** Step 1 of the code login: emails a one-time code. Same customer flags as the iOS and web flows. */
    suspend fun sendCode(email: String, marketingOptIn: Boolean) {
        val res = send(authRequest("otp", "", buildJsonObject {
            put("email", email)
            put("create_user", true)
            put("data", customerMetadata(marketingOptIn))
        }))
        if (!res.ok) throw ApiException(ApiErrors.classify(res.status, res.body), res.status)
    }

    /** Step 2: checks the 6-digit code. The server issues a magic-link-type code; "email" is the fallback type. */
    suspend fun verifyCode(email: String, code: String): Session {
        var last: HttpResult? = null
        for (type in listOf("magiclink", "email")) {
            val res = send(authRequest("verify", "", buildJsonObject {
                put("type", type)
                put("email", email)
                put("token", code.trim())
            }))
            if (res.ok) return persist(json.decodeFromString<AuthResponse>(res.body))
            last = res
            if (res.status == 429) break
        }
        val status = last?.status ?: 0
        val kind = if (status == 429) ApiErrorKind.RateLimited else ApiErrorKind.CodeInvalid
        throw ApiException(kind, status)
    }

    suspend fun signOut() {
        val session = store.load()
        store.clear()
        if (session != null) {
            runCatching {
                send(
                    Request.Builder()
                        .url("${Config.SUPABASE_URL}/auth/v1/logout")
                        .header("apikey", Config.SUPABASE_ANON_KEY)
                        .header("Authorization", "Bearer ${session.accessToken}")
                        .post("{}".toRequestBody(jsonMedia))
                        .build()
                )
            }
        }
    }

    private fun customerMetadata(marketingOptIn: Boolean): JsonObject = buildJsonObject {
        put("is_customer", true)
        put("marketing_opt_in", marketingOptIn)
    }

    private fun authRequest(path: String, query: String, body: JsonObject): Request =
        Request.Builder()
            .url("${Config.SUPABASE_URL}/auth/v1/$path$query")
            .header("apikey", Config.SUPABASE_ANON_KEY)
            .post(body.toString().toRequestBody(jsonMedia))
            .build()

    private fun persist(response: AuthResponse): Session {
        val access = response.accessToken
        val refresh = response.refreshToken
        val user = response.user
        if (access == null || refresh == null || user == null) throw ApiException(ApiErrorKind.Unknown)
        val session = Session(access, refresh, System.currentTimeMillis() + response.expiresIn * 1000, user.id, user.email)
        store.save(session)
        return session
    }

    private suspend fun validSession(): Session {
        val session = store.load() ?: throw ApiException(ApiErrorKind.SignedOut)
        return if (session.isExpiringSoon()) refresh(session) else session
    }

    private suspend fun refresh(stale: Session): Session = refreshLock.withLock {
        val current = store.load() ?: throw ApiException(ApiErrorKind.SignedOut)
        // Another call may already have renewed it while this one waited for the lock.
        if (current.refreshToken != stale.refreshToken && !current.isExpiringSoon()) return current
        val res = send(authRequest("token", "?grant_type=refresh_token", buildJsonObject {
            put("refresh_token", current.refreshToken)
        }))
        if (!res.ok) {
            if (res.status in 400..499) store.clear()
            throw ApiException(if (res.status in 400..499) ApiErrorKind.SignedOut else ApiErrorKind.Network, res.status)
        }
        persist(json.decodeFromString<AuthResponse>(res.body))
    }

    // ---- Authenticated calls ----------------------------------------------------------------------------

    suspend fun authorized(url: String, method: String = "GET", body: String? = null, prefer: String? = null): HttpResult {
        var session = validSession()
        var result = send(buildAuthorized(url, method, body, prefer, session))
        if (result.status == 401) {
            session = refresh(session)
            result = send(buildAuthorized(url, method, body, prefer, session))
        }
        return result
    }

    private fun buildAuthorized(url: String, method: String, body: String?, prefer: String?, session: Session): Request {
        val builder = Request.Builder().url(url)
            .header("Authorization", "Bearer ${session.accessToken}")
            .header("Accept", "application/json")
        if (url.startsWith(Config.SUPABASE_URL)) builder.header("apikey", Config.SUPABASE_ANON_KEY)
        if (prefer != null) builder.header("Prefer", prefer)
        val requestBody = (body ?: "").toRequestBody(jsonMedia)
        when (method) {
            "GET" -> builder.get()
            "POST" -> builder.post(requestBody)
            "PATCH" -> builder.patch(requestBody)
            "DELETE" -> if (body != null) builder.delete(requestBody) else builder.delete()
            else -> error("Unsupported method $method")
        }
        return builder.build()
    }

    /** GET on PostgREST (`query` is the part after `?`), decoded with [serializer]. */
    suspend fun <T> select(table: String, query: String, serializer: KSerializer<T>): T {
        val res = authorized("${Config.SUPABASE_URL}/rest/v1/$table?$query")
        if (!res.ok) throw ApiException(ApiErrors.classify(res.status, res.body), res.status)
        return json.decodeFromString(serializer, res.body)
    }

    /** GET on a web bridge route. */
    suspend fun <T> bridge(path: String, serializer: KSerializer<T>): T {
        val res = authorized("${Config.API_BASE}$path")
        if (!res.ok) throw ApiException(ApiErrors.classify(res.status, res.body), res.status)
        return json.decodeFromString(serializer, res.body)
    }

    private suspend fun send(request: Request): HttpResult = withContext(Dispatchers.IO) {
        try {
            http.newCall(request).execute().use { HttpResult(it.code, it.body?.string().orEmpty()) }
        } catch (e: IOException) {
            throw ApiException(ApiErrorKind.Network, cause = e)
        }
    }
}
