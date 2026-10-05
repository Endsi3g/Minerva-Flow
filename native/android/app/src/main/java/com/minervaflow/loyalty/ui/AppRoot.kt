package com.minervaflow.loyalty.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.minervaflow.loyalty.R
import com.minervaflow.loyalty.ui.components.StatusBarIcons
import com.minervaflow.loyalty.ui.screens.AccountScreen
import com.minervaflow.loyalty.ui.screens.AuthScreen
import com.minervaflow.loyalty.ui.screens.CardScreen
import com.minervaflow.loyalty.ui.screens.DataScreen
import com.minervaflow.loyalty.ui.screens.HomeScreen
import com.minervaflow.loyalty.ui.screens.IntroScreen
import com.minervaflow.loyalty.ui.screens.LocalRedeem
import com.minervaflow.loyalty.ui.screens.OffersScreen
import com.minervaflow.loyalty.ui.screens.OnboardingScreen
import com.minervaflow.loyalty.ui.theme.Mv

@Composable
fun AppRoot(vm: AppViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    if (state.stage != Stage.Intro) StatusBarIcons(lightIcons = androidx.compose.foundation.isSystemInDarkTheme())
    when (state.stage) {
        Stage.Intro -> IntroScreen(onStart = vm::finishIntro)
        Stage.Auth -> AuthScreen(
            state = state.auth,
            onMode = vm::setAuthMode,
            onToggleCreate = vm::toggleCreateAccount,
            onSendCode = vm::sendCode,
            onVerify = vm::verifyCode,
            onSubmitPassword = vm::submitPassword,
            onChangeEmail = vm::changeEmail,
        )
        Stage.Main -> if (state.onboarding) OnboardingScreen(onFinish = vm::finishOnboarding) else MainScaffold(state, vm)
    }
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun MainScaffold(state: UiState, vm: AppViewModel) {
    val c = Mv.colors
    // The tab bar would sit behind the keyboard and its inset would be counted twice, leaving a gap.
    val keyboardOpen = WindowInsets.isImeVisible
    Scaffold(
        containerColor = c.cream,
        bottomBar = {
            if (!keyboardOpen) NavigationBar(containerColor = c.creamSoft) {
                TabItem(Tab.Home, state.tab, Icons.Filled.Home, R.string.tab_home, vm)
                TabItem(Tab.Offers, state.tab, Icons.Filled.CardGiftcard, R.string.tab_offers, vm)
                TabItem(Tab.Card, state.tab, Icons.Filled.QrCode2, R.string.tab_card, vm)
                TabItem(Tab.Account, state.tab, Icons.Filled.Person, R.string.tab_account, vm)
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().background(c.cream).padding(padding).consumeWindowInsets(padding)) {
            CompositionLocalProvider(LocalRedeem provides { id -> vm.redeem(id) }) {
                DataScreen(
                    state = state.home,
                    refreshing = state.refreshing,
                    onRefresh = { vm.loadHome(refreshing = true) },
                    onRetry = { vm.loadHome() },
                ) { data ->
                    when (state.tab) {
                        Tab.Home -> HomeScreen(data, state.bonus, vm::dismissBonus, onSeeOffers = { vm.selectTab(Tab.Offers) })
                        Tab.Offers -> OffersScreen(data)
                        Tab.Card -> CardScreen(
                            data,
                            onSavePhone = { phone -> vm.savePhone(phone, data.customer.id) },
                            onWalletLink = { vm.walletLink(data.customer.id) },
                            onMintCode = { vm.mintPairingCode() },
                        )
                        Tab.Account -> AccountScreen(data, onSignOut = vm::signOut, onDelete = { vm.deleteAccount() })
                    }
                }
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.TabItem(
    tab: Tab,
    selected: Tab,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: Int,
    vm: AppViewModel,
) {
    val c = Mv.colors
    NavigationBarItem(
        selected = tab == selected,
        onClick = { vm.selectTab(tab) },
        icon = { Icon(icon, contentDescription = null) },
        label = { Text(stringResource(label)) },
        colors = NavigationBarItemDefaults.colors(
            selectedIconColor = c.emeraldDark,
            selectedTextColor = c.emeraldDark,
            indicatorColor = c.emerald.copy(alpha = 0.16f),
            unselectedIconColor = c.inkSoft,
            unselectedTextColor = c.inkSoft,
        ),
    )
}
