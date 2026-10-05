package com.minervaflow.loyalty.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.minervaflow.loyalty.MinervaApp
import com.minervaflow.loyalty.data.ApiErrorKind
import com.minervaflow.loyalty.data.ApiException
import com.minervaflow.loyalty.data.BonusAward
import com.minervaflow.loyalty.data.HomeData
import com.minervaflow.loyalty.data.RedeemResult
import com.minervaflow.loyalty.data.WalletResult
import com.minervaflow.loyalty.domain.Phone
import com.minervaflow.loyalty.domain.Validation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class Stage { Intro, Auth, Main }
enum class Tab { Home, Offers, Card, Account }
enum class AuthMode { Code, Password }
enum class AuthValidation { EmailInvalid, PasswordShort, CodeInvalid }

sealed interface HomeState {
    data object Loading : HomeState
    data class Ready(val data: HomeData) : HomeState
    data object Empty : HomeState
    data class Error(val kind: ApiErrorKind) : HomeState
}

data class AuthState(
    val mode: AuthMode = AuthMode.Code,
    val creatingAccount: Boolean = false,
    val busy: Boolean = false,
    val error: ApiErrorKind? = null,
    val validation: AuthValidation? = null,
    val codeSentTo: String? = null,
    val checkInbox: Boolean = false,
)

data class UiState(
    val stage: Stage = Stage.Intro,
    val tab: Tab = Tab.Home,
    val home: HomeState = HomeState.Loading,
    val refreshing: Boolean = false,
    val auth: AuthState = AuthState(),
    val bonus: BonusAward? = null,
    val onboarding: Boolean = false,
)

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val container = (application as MinervaApp).container
    private val repo = container.repository
    private val prefs = container.prefs

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    private var bonusClaimedThisSession = false

    init {
        val session = repo.session
        if (session != null) {
            _state.update { it.copy(stage = Stage.Main, onboarding = !onboardingSeen(session.userId)) }
            loadHome()
        } else {
            _state.update { it.copy(stage = if (prefs.getBoolean(KEY_INTRO_SEEN, false)) Stage.Auth else Stage.Intro) }
        }
    }

    // ---- Navigation ------------------------------------------------------------------------------------

    fun finishIntro() {
        prefs.edit().putBoolean(KEY_INTRO_SEEN, true).apply()
        _state.update { it.copy(stage = Stage.Auth) }
    }

    fun selectTab(tab: Tab) = _state.update { it.copy(tab = tab) }

    fun finishOnboarding() {
        repo.session?.let { prefs.edit().putBoolean(onboardingKey(it.userId), true).apply() }
        _state.update { it.copy(onboarding = false) }
    }

    fun dismissBonus() = _state.update { it.copy(bonus = null) }

    // ---- Auth ------------------------------------------------------------------------------------------

    fun setAuthMode(mode: AuthMode) = _state.update { it.copy(auth = AuthState(mode = mode)) }

    fun toggleCreateAccount() = _state.update { it.copy(auth = it.auth.copy(creatingAccount = !it.auth.creatingAccount, error = null, validation = null, checkInbox = false)) }

    fun changeEmail() = _state.update { it.copy(auth = it.auth.copy(codeSentTo = null, error = null, validation = null)) }

    fun sendCode(email: String, marketingOptIn: Boolean) {
        val clean = email.trim()
        if (!Validation.isEmail(clean)) return setAuthValidation(AuthValidation.EmailInvalid)
        runAuth {
            repo.sendCode(clean, marketingOptIn)
            _state.update { it.copy(auth = it.auth.copy(codeSentTo = clean)) }
        }
    }

    fun verifyCode(code: String) {
        val email = _state.value.auth.codeSentTo ?: return
        if (!Validation.isSixDigitCode(code)) return setAuthValidation(AuthValidation.CodeInvalid)
        runAuth {
            repo.verifyCode(email, code)
            enterMain()
        }
    }

    fun submitPassword(email: String, password: String, marketingOptIn: Boolean) {
        val clean = email.trim()
        if (!Validation.isEmail(clean)) return setAuthValidation(AuthValidation.EmailInvalid)
        val creating = _state.value.auth.creatingAccount
        if (creating && !Validation.isStrongEnoughPassword(password)) return setAuthValidation(AuthValidation.PasswordShort)
        runAuth {
            if (creating) {
                val session = repo.signUpWithPassword(clean, password, marketingOptIn)
                if (session == null) {
                    _state.update { it.copy(auth = it.auth.copy(creatingAccount = false, checkInbox = true)) }
                } else {
                    enterMain()
                }
            } else {
                repo.signInWithPassword(clean, password)
                enterMain()
            }
        }
    }

    private fun setAuthValidation(v: AuthValidation) =
        _state.update { it.copy(auth = it.auth.copy(validation = v, error = null, checkInbox = false)) }

    private fun runAuth(block: suspend () -> Unit) {
        _state.update { it.copy(auth = it.auth.copy(busy = true, error = null, validation = null, checkInbox = false)) }
        viewModelScope.launch {
            try {
                block()
            } catch (e: ApiException) {
                _state.update { it.copy(auth = it.auth.copy(error = e.kind)) }
            } catch (_: Exception) {
                _state.update { it.copy(auth = it.auth.copy(error = ApiErrorKind.Unknown)) }
            } finally {
                _state.update { it.copy(auth = it.auth.copy(busy = false)) }
            }
        }
    }

    private fun enterMain() {
        val userId = repo.session?.userId
        bonusClaimedThisSession = false
        _state.update {
            it.copy(
                stage = Stage.Main, tab = Tab.Home, home = HomeState.Loading, auth = AuthState(),
                onboarding = userId != null && !onboardingSeen(userId),
            )
        }
        loadHome()
    }

    // ---- Data ------------------------------------------------------------------------------------------

    fun loadHome(refreshing: Boolean = false) {
        if (refreshing) _state.update { it.copy(refreshing = true) } else _state.update { it.copy(home = HomeState.Loading) }
        viewModelScope.launch {
            try {
                val data = repo.loadHome()
                _state.update { it.copy(home = if (data == null) HomeState.Empty else HomeState.Ready(data)) }
                if (data != null) claimBonusOnce()
            } catch (e: ApiException) {
                if (e.kind == ApiErrorKind.SignedOut) {
                    signOut()
                } else if (!refreshing || _state.value.home !is HomeState.Ready) {
                    _state.update { it.copy(home = HomeState.Error(e.kind)) }
                }
            } catch (_: Exception) {
                if (!refreshing || _state.value.home !is HomeState.Ready) {
                    _state.update { it.copy(home = HomeState.Error(ApiErrorKind.Unknown)) }
                }
            } finally {
                _state.update { it.copy(refreshing = false) }
            }
        }
    }

    private suspend fun claimBonusOnce() {
        if (bonusClaimedThisSession) return
        bonusClaimedThisSession = true
        val award = repo.claimAppInstallBonus().firstOrNull { it.points > 0 } ?: return
        _state.update { it.copy(bonus = award) }
        // The balance changed on the server: show the new total.
        runCatching { repo.loadHome() }.getOrNull()?.let { data ->
            _state.update { it.copy(home = HomeState.Ready(data)) }
        }
    }

    suspend fun redeem(rewardId: String): RedeemResult {
        val result = repo.redeem(rewardId)
        if (result is RedeemResult.Code) loadHome(refreshing = true)
        return result
    }

    /** Returns true when the number is valid and saved. */
    suspend fun savePhone(raw: String, customerId: String): PhoneSave {
        val normalized = Phone.normalize(raw) ?: return PhoneSave.Invalid
        if (!repo.updatePhone(customerId, normalized)) return PhoneSave.Failed
        loadHome(refreshing = true)
        return PhoneSave.Saved
    }

    suspend fun walletLink(customerId: String): WalletResult = repo.googleWalletLink(customerId)

    suspend fun deleteAccount(): Boolean {
        val ok = repo.deleteAccount()
        if (ok) resetToSignedOut()
        return ok
    }

    fun signOut() {
        viewModelScope.launch {
            repo.signOut()
            resetToSignedOut()
        }
    }

    private fun resetToSignedOut() {
        bonusClaimedThisSession = false
        _state.value = UiState(stage = Stage.Auth)
    }

    private fun onboardingSeen(userId: String) = prefs.getBoolean(onboardingKey(userId), false)
    private fun onboardingKey(userId: String) = "onboarding_seen_$userId"

    private companion object {
        const val KEY_INTRO_SEEN = "intro_seen"
    }
}

enum class PhoneSave { Saved, Invalid, Failed }
