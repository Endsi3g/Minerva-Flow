package com.minervaflow.loyalty

import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import com.minervaflow.loyalty.data.ApiClient
import com.minervaflow.loyalty.data.EncryptedSessionStore
import com.minervaflow.loyalty.data.Repository
import com.minervaflow.loyalty.data.SessionStore
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

class AppContainer(context: Context) {
    val sessionStore: SessionStore = EncryptedSessionStore(context)
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()
    val api = ApiClient(http, sessionStore)
    val repository = Repository(api, sessionStore)
    val ownerRepository = com.minervaflow.loyalty.data.OwnerRepository(api)
    val prefs: SharedPreferences = context.getSharedPreferences("minerva_prefs", Context.MODE_PRIVATE)
}

class MinervaApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
