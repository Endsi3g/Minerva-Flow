package com.minervaflow.loyalty.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

interface SessionStore {
    fun load(): Session?
    fun save(session: Session)
    fun clear()
}

/** Tokens live in Keystore-backed encrypted preferences. If the device cannot provide them, the session is memory-only. */
class EncryptedSessionStore(context: Context) : SessionStore {
    private val prefs: SharedPreferences? = try {
        val key = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        EncryptedSharedPreferences.create(
            context,
            "minerva_session",
            key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    } catch (_: Exception) {
        null
    }
    private var memory: Session? = null

    override fun load(): Session? {
        val p = prefs ?: return memory
        val access = p.getString("access", null) ?: return null
        val refresh = p.getString("refresh", null) ?: return null
        val userId = p.getString("user", null) ?: return null
        return Session(access, refresh, p.getLong("expires", 0L), userId, p.getString("email", null))
    }

    override fun save(session: Session) {
        memory = session
        prefs?.edit()
            ?.putString("access", session.accessToken)
            ?.putString("refresh", session.refreshToken)
            ?.putLong("expires", session.expiresAtMs)
            ?.putString("user", session.userId)
            ?.putString("email", session.email)
            ?.apply()
    }

    override fun clear() {
        memory = null
        prefs?.edit()?.clear()?.apply()
    }
}

class MemorySessionStore : SessionStore {
    private var session: Session? = null
    override fun load() = session
    override fun save(session: Session) { this.session = session }
    override fun clear() { session = null }
}
