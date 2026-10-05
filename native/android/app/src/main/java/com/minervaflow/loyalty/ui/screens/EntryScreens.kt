package com.minervaflow.loyalty.ui.screens

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.minervaflow.loyalty.R
import com.minervaflow.loyalty.data.ApiErrorKind
import com.minervaflow.loyalty.data.Config
import com.minervaflow.loyalty.ui.AuthMode
import com.minervaflow.loyalty.ui.AuthState
import com.minervaflow.loyalty.ui.AuthValidation
import com.minervaflow.loyalty.ui.components.PrimaryButton
import com.minervaflow.loyalty.ui.components.ProgressBar
import com.minervaflow.loyalty.ui.components.SecondaryButton
import com.minervaflow.loyalty.ui.components.StatusBarIcons
import com.minervaflow.loyalty.ui.theme.Mv
import com.minervaflow.loyalty.ui.theme.MvType

@Composable
fun IntroScreen(onStart: () -> Unit) {
    val c = Mv.colors
    StatusBarIcons(lightIcons = true)
    Box(Modifier.fillMaxSize().background(c.emeraldDeep).systemBarsPadding().padding(28.dp)) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("MINERVA FLOW", style = MvType.caption, color = Color.White, letterSpacing = androidx.compose.ui.unit.TextUnit(3f, androidx.compose.ui.unit.TextUnitType.Sp))
                Text(stringResource(R.string.intro_title), style = MvType.display, color = Color.White, textAlign = TextAlign.Center)
                Text(stringResource(R.string.intro_body), style = MvType.body, color = Color.White.copy(alpha = 0.85f), textAlign = TextAlign.Center)
            }
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                PrimaryButton(stringResource(R.string.intro_start), onStart, container = Color.White, content = c.emeraldDeep)
                SecondaryButton(stringResource(R.string.intro_signin), onStart, content = Color.White, borderColor = Color.White.copy(alpha = 0.6f))
            }
        }
    }
}

@Composable
private fun authErrorText(kind: ApiErrorKind): String = stringResource(
    when (kind) {
        ApiErrorKind.InvalidCredentials -> R.string.err_invalid_credentials
        ApiErrorKind.EmailNotConfirmed -> R.string.err_email_not_confirmed
        ApiErrorKind.CodeInvalid -> R.string.err_code_invalid
        ApiErrorKind.RateLimited -> R.string.err_rate_limited
        ApiErrorKind.Network -> R.string.err_network
        ApiErrorKind.SignedOut -> R.string.err_signed_out
        else -> R.string.err_unknown
    }
)

@Composable
fun AuthScreen(
    state: AuthState,
    onMode: (AuthMode) -> Unit,
    onToggleCreate: () -> Unit,
    onSendCode: (String, Boolean) -> Unit,
    onVerify: (String) -> Unit,
    onSubmitPassword: (String, String, Boolean) -> Unit,
    onChangeEmail: () -> Unit,
) {
    val c = Mv.colors
    val uriHandler = LocalUriHandler.current
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var optIn by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().background(c.cream).systemBarsPadding().imePadding()
            .verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(8.dp))
        Text(stringResource(R.string.auth_title), style = MvType.h1, color = c.ink)
        Text(stringResource(R.string.auth_subtitle), style = MvType.body, color = c.inkSoft)

        ModeSwitch(selected = state.mode, onSelect = onMode)

        if (state.checkInbox) {
            Text(stringResource(R.string.auth_check_inbox), style = MvType.small, color = c.emeraldDark)
        }

        val codeStep = state.mode == AuthMode.Code && state.codeSentTo != null
        if (codeStep) {
            Text(stringResource(R.string.auth_code_sent, state.codeSentTo.orEmpty()), style = MvType.body, color = c.ink)
            OutlinedTextField(
                value = code,
                onValueChange = { code = it.filter(Char::isDigit).take(6) },
                label = { Text(stringResource(R.string.auth_code_label)) },
                singleLine = true,
                isError = state.validation == AuthValidation.CodeInvalid,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { onVerify(code) }),
                modifier = Modifier.fillMaxWidth(),
            )
            Feedback(state)
            PrimaryButton(stringResource(R.string.auth_verify), { onVerify(code) }, loading = state.busy)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = { onSendCode(state.codeSentTo.orEmpty(), optIn) }, enabled = !state.busy, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(stringResource(R.string.auth_resend))
                }
                TextButton(onClick = { code = ""; onChangeEmail() }, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(stringResource(R.string.auth_change_email))
                }
            }
        } else {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text(stringResource(R.string.auth_email)) },
                singleLine = true,
                isError = state.validation == AuthValidation.EmailInvalid,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = if (state.mode == AuthMode.Password) ImeAction.Next else ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = { if (state.mode == AuthMode.Code) onSendCode(email, optIn) }),
                modifier = Modifier.fillMaxWidth(),
            )
            if (state.mode == AuthMode.Password) {
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text(stringResource(R.string.auth_password)) },
                    singleLine = true,
                    isError = state.validation == AuthValidation.PasswordShort,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { onSubmitPassword(email, password, optIn) }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (state.mode == AuthMode.Code || state.creatingAccount) {
                Row(
                    Modifier.fillMaxWidth().clickable { optIn = !optIn }.heightIn(min = 48.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Checkbox(checked = optIn, onCheckedChange = { optIn = it })
                    Text(stringResource(R.string.auth_marketing_optin), style = MvType.small, color = c.inkSoft)
                }
            }
            Feedback(state)
            if (state.mode == AuthMode.Code) {
                PrimaryButton(stringResource(R.string.auth_send_code), { onSendCode(email, optIn) }, loading = state.busy)
            } else {
                PrimaryButton(
                    stringResource(if (state.creatingAccount) R.string.auth_signup else R.string.auth_signin),
                    { onSubmitPassword(email, password, optIn) },
                    loading = state.busy,
                )
                TextButton(onClick = onToggleCreate, modifier = Modifier.heightIn(min = 48.dp).fillMaxWidth()) {
                    Text(stringResource(if (state.creatingAccount) R.string.auth_have_account else R.string.auth_create_account))
                }
            }
        }

        Text(stringResource(R.string.auth_legal), style = MvType.caption, color = c.inkFaint)
        Row {
            TextButton(onClick = { uriHandler.openUri(Config.TERMS_URL) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(stringResource(R.string.auth_terms))
            }
            TextButton(onClick = { uriHandler.openUri(Config.PRIVACY_URL) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(stringResource(R.string.auth_privacy))
            }
        }
    }
}

@Composable
private fun Feedback(state: AuthState) {
    val c = Mv.colors
    val text = when {
        state.validation == AuthValidation.EmailInvalid -> stringResource(R.string.err_email_invalid)
        state.validation == AuthValidation.PasswordShort -> stringResource(R.string.err_password_short)
        state.validation == AuthValidation.CodeInvalid -> stringResource(R.string.err_code_invalid)
        state.error != null -> authErrorText(state.error)
        else -> null
    }
    if (text != null) Text(text, style = MvType.small, color = c.danger)
}

@Composable
private fun ModeSwitch(selected: AuthMode, onSelect: (AuthMode) -> Unit) {
    val c = Mv.colors
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.creamSoft).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        listOf(AuthMode.Code to R.string.auth_mode_code, AuthMode.Password to R.string.auth_mode_password).forEach { (mode, label) ->
            val isSelected = mode == selected
            Box(
                Modifier.weight(1f).heightIn(min = 48.dp).clip(RoundedCornerShape(10.dp))
                    .background(if (isSelected) c.surface else Color.Transparent)
                    .clickable { onSelect(mode) }
                    .semantics { role = Role.Tab; this.selected = isSelected },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    stringResource(label),
                    style = MvType.small.copy(fontWeight = if (isSelected) androidx.compose.ui.text.font.FontWeight.SemiBold else androidx.compose.ui.text.font.FontWeight.Normal),
                    color = if (isSelected) c.ink else c.inkSoft,
                )
            }
        }
    }
}

/** Three explicit steps moved only by the visible buttons; there is no swipe and no timer. */
@Composable
fun OnboardingScreen(onFinish: () -> Unit) {
    val c = Mv.colors
    var step by rememberSaveable { mutableIntStateOf(0) }
    val total = 3
    val titles = listOf(R.string.onb1_title, R.string.onb2_title, R.string.onb3_title)
    val bodies = listOf(R.string.onb1_body, R.string.onb2_body, R.string.onb3_body)

    Column(Modifier.fillMaxSize().background(c.cream).systemBarsPadding().padding(24.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text(stringResource(R.string.onb_step, step + 1, total), style = MvType.caption, color = c.inkSoft)
            TextButton(onClick = onFinish, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.skip)) }
        }
        ProgressBar((step + 1f) / total)
        Spacer(Modifier.weight(1f))
        Crossfade(targetState = step, label = "onboarding-step") { s ->
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(stringResource(titles[s]), style = MvType.h1, color = c.ink)
                Text(stringResource(bodies[s]), style = MvType.body, color = c.inkSoft)
            }
        }
        Spacer(Modifier.weight(1f))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (step > 0) {
                SecondaryButton(stringResource(R.string.back), { step -= 1 }, modifier = Modifier.weight(1f))
            }
            PrimaryButton(
                stringResource(if (step == total - 1) R.string.onb_enter else R.string.next),
                { if (step == total - 1) onFinish() else step += 1 },
                modifier = Modifier.weight(1f),
            )
        }
    }
}
