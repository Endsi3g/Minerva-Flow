package com.minervaflow.loyalty.ui.screens

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import kotlinx.coroutines.delay
import com.minervaflow.loyalty.domain.Format
import com.minervaflow.loyalty.data.PairingCode
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.minervaflow.loyalty.BuildConfig
import com.minervaflow.loyalty.R
import com.minervaflow.loyalty.data.Config
import com.minervaflow.loyalty.data.HomeData
import com.minervaflow.loyalty.data.WalletResult
import com.minervaflow.loyalty.domain.Phone
import com.minervaflow.loyalty.domain.tierProgress
import com.minervaflow.loyalty.ui.PhoneSave
import com.minervaflow.loyalty.ui.components.MvCard
import com.minervaflow.loyalty.ui.components.Pill
import com.minervaflow.loyalty.ui.components.PrimaryButton
import com.minervaflow.loyalty.ui.components.SecondaryButton
import com.minervaflow.loyalty.ui.components.SectionTitle
import com.minervaflow.loyalty.ui.theme.Mv
import com.minervaflow.loyalty.ui.theme.MvType
import kotlinx.coroutines.launch

/** What the counter reads: the local phone digits when we have a number, otherwise the card link. */
fun qrPayload(phone: String?, customerId: String): String {
    val digits = Phone.localDigits(phone)
    return if (digits.length >= 10) digits else "${Config.LINK_BASE}/c/$customerId"
}

private fun qrBitmap(text: String, size: Int = 512): Bitmap {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to 1))
    val pixels = IntArray(size * size) { i -> if (matrix.get(i % size, i / size)) 0xFF000000.toInt() else 0xFFFFFFFF.toInt() }
    return Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888)
}

@Composable
fun CardScreen(
    data: HomeData,
    onSavePhone: suspend (String) -> PhoneSave,
    onWalletLink: suspend () -> WalletResult,
    onMintCode: suspend () -> PairingCode?,
) {
    val c = Mv.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val customer = data.customer
    val progress = tierProgress(customer.totalSpent, data.tier2Threshold, data.tier3Threshold)
    val hasPhone = Phone.localDigits(customer.phone).length >= 10
    var editing by rememberSaveable { mutableStateOf(!hasPhone) }
    var phoneInput by rememberSaveable { mutableStateOf("") }
    var phoneBusy by remember { mutableStateOf(false) }
    var phoneError by remember { mutableStateOf<Int?>(null) }
    var walletBusy by remember { mutableStateOf(false) }
    var walletMessage by remember { mutableStateOf<Int?>(null) }
    val submitPhone: () -> Unit = {
        if (!phoneBusy) {
            phoneBusy = true
            scope.launch {
                when (onSavePhone(phoneInput)) {
                    PhoneSave.Saved -> { editing = false; phoneInput = ""; phoneError = null }
                    PhoneSave.Invalid -> phoneError = R.string.card_phone_invalid
                    PhoneSave.Failed -> phoneError = R.string.card_phone_failed
                }
                phoneBusy = false
            }
        }
    }
    var code by remember { mutableStateOf<PairingCode?>(null) }
    var codeError by remember { mutableStateOf(false) }
    var codeBusy by remember { mutableStateOf(true) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val mintCode: () -> Unit = {
        codeBusy = true; codeError = false
        scope.launch {
            val minted = onMintCode()
            if (minted == null) codeError = true else code = minted
            codeBusy = false
        }
    }
    LaunchedEffect(Unit) { mintCode() }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1000) } }
    val payload = qrPayload(customer.phone, customer.id)
    val qr = remember(payload) { qrBitmap(payload).asImageBitmap() }

    LazyColumn(
        // Keeps the phone field and its Save button above the keyboard.
        modifier = Modifier.fillMaxSize().imePadding(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Text(stringResource(R.string.card_title), style = MvType.h1, color = c.ink) }
        item {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.emeraldDeep).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(data.restaurantName ?: stringResource(R.string.home_your_restaurant), style = MvType.small, color = Color.White.copy(alpha = 0.8f))
                Text(customer.name, style = MvType.h2, color = Color.White)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.home_pts, customer.loyaltyPoints), style = MvType.h1, color = Color.White)
                    Pill(tierLabel(progress.tier), container = c.lime, content = Color(0xFF063B2B))
                }
            }
        }
        item {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Image(
                    bitmap = qr,
                    contentDescription = stringResource(R.string.card_scan_hint),
                    modifier = Modifier.size(200.dp).clip(RoundedCornerShape(16.dp)).background(Color.White).padding(10.dp),
                )
                Text(stringResource(R.string.card_scan_hint), style = MvType.small, color = c.inkSoft, textAlign = TextAlign.Center)
            }
        }
        item {
            MvCard {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Filled.Phone, contentDescription = null, tint = c.emeraldDark)
                    Text(
                        if (hasPhone) stringResource(R.string.card_phone_on_file, Phone.display(customer.phone))
                        else stringResource(R.string.card_phone_missing),
                        style = MvType.section, color = c.ink,
                    )
                }
                if (!editing) {
                    TextButton(onClick = { editing = true }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.card_phone_edit)) }
                } else {
                    OutlinedTextField(
                        value = phoneInput,
                        onValueChange = { phoneInput = it; phoneError = null },
                        label = { Text(stringResource(R.string.card_phone_label)) },
                        singleLine = true,
                        isError = phoneError != null,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { submitPhone() }),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    phoneError?.let { Text(stringResource(it), style = MvType.small, color = c.danger) }
                    PrimaryButton(stringResource(R.string.card_phone_save), submitPhone, loading = phoneBusy)
                }
            }
        }
        item {
            MvCard {
                SectionTitle(stringResource(R.string.card_code_title))
                val expiresAt = Format.epochMillis(code?.expiresAt)
                val msLeft = if (expiresAt != null) expiresAt - now else 0L
                val live = code != null && msLeft > 0
                Text(
                    if (live) code?.code.orEmpty() else "••••••",
                    style = MvType.numberLarge.copy(letterSpacing = 6.sp),
                    color = if (live) c.emeraldDark else c.inkFaint,
                )
                Text(
                    when {
                        codeError -> stringResource(R.string.card_code_error)
                        live -> stringResource(R.string.card_code_expires, Format.countdown(msLeft))
                        code != null -> stringResource(R.string.card_code_expired)
                        else -> stringResource(R.string.loading)
                    },
                    style = MvType.small, color = if (codeError) c.danger else c.inkSoft,
                )
                Text(stringResource(R.string.card_code_hint), style = MvType.caption, color = c.inkFaint)
                SecondaryButton(stringResource(R.string.card_code_new), mintCode, enabled = !codeBusy)
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                PrimaryButton(
                    stringResource(if (walletBusy) R.string.wallet_preparing else R.string.wallet_add_google),
                    {
                        walletBusy = true
                        walletMessage = null
                        scope.launch {
                            when (val result = onWalletLink()) {
                                is WalletResult.Url -> try {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(result.url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                                } catch (_: ActivityNotFoundException) {
                                    walletMessage = R.string.wallet_no_app
                                }
                                WalletResult.NotAvailable -> walletMessage = R.string.wallet_not_available
                                WalletResult.SignedOut -> walletMessage = R.string.wallet_signed_out
                                WalletResult.Failure -> walletMessage = R.string.wallet_failure
                            }
                            walletBusy = false
                        }
                    },
                    loading = walletBusy,
                    container = Color.Black,
                    content = Color.White,
                )
                walletMessage?.let { Text(stringResource(it), style = MvType.small, color = c.inkSoft, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
            }
        }
    }
}

@Composable
fun AccountScreen(data: HomeData, onSignOut: () -> Unit, onDelete: suspend () -> Boolean) {
    val c = Mv.colors
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    var confirmSignOut by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Text(stringResource(R.string.account_title), style = MvType.h1, color = c.ink) }
        item {
            MvCard {
                Text(data.customer.name, style = MvType.h2, color = c.ink)
                data.customer.email?.let { Text(it, style = MvType.small, color = c.inkSoft) }
            }
        }
        if (data.memberships.isNotEmpty()) {
            item { SectionTitle(stringResource(R.string.account_cards)) }
            item {
                MvCard {
                    data.memberships.forEach {
                        Text(stringResource(R.string.account_member_of, it.restaurantName, it.loyaltyPoints), style = MvType.body, color = c.ink, modifier = Modifier.heightIn(min = 32.dp))
                    }
                }
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                LinkRow(R.string.account_privacy) { uriHandler.openUri(Config.PRIVACY_URL) }
                LinkRow(R.string.account_terms) { uriHandler.openUri(Config.TERMS_URL) }
                LinkRow(R.string.account_support) {
                    try {
                        context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${Config.SUPPORT_EMAIL}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } catch (_: ActivityNotFoundException) {
                        uriHandler.openUri("${Config.API_BASE}/support")
                    }
                }
            }
        }
        item { SecondaryButton(stringResource(R.string.account_signout), { confirmSignOut = true }) }
        item {
            MvCard {
                SectionTitle(stringResource(R.string.account_danger))
                TextButton(onClick = { showDelete = true }, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(stringResource(R.string.account_delete), color = c.danger)
                }
            }
        }
        item { Text(stringResource(R.string.account_version, BuildConfig.VERSION_NAME), style = MvType.caption, color = c.inkFaint) }
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text(stringResource(R.string.account_signout_confirm), style = MvType.h2) },
            confirmButton = { TextButton(onClick = { confirmSignOut = false; onSignOut() }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.account_signout)) } },
            dismissButton = { TextButton(onClick = { confirmSignOut = false }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.cancel)) } },
        )
    }
    if (showDelete) DeleteAccountDialog(onDismiss = { showDelete = false }, onDelete = onDelete)
}

@Composable
private fun LinkRow(label: Int, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
        Text(stringResource(label), style = MvType.body, modifier = Modifier.fillMaxWidth())
    }
}

/** Irreversible, so the person has to type the word before the button turns on. */
@Composable
private fun DeleteAccountDialog(onDismiss: () -> Unit, onDelete: suspend () -> Boolean) {
    val word = stringResource(R.string.account_delete_word)
    val scope = rememberCoroutineScope()
    var typed by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    val canConfirm = typed.trim().equals(word, ignoreCase = true)

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text(stringResource(R.string.account_delete), style = MvType.h2) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(R.string.account_delete_body), style = MvType.small)
                OutlinedTextField(
                    value = typed,
                    onValueChange = { typed = it },
                    label = { Text(stringResource(R.string.account_delete_type)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                if (failed) Text(stringResource(R.string.account_delete_failed), style = MvType.small, color = Mv.colors.danger)
            }
        },
        confirmButton = {
            PrimaryButton(
                stringResource(R.string.account_delete_confirm),
                {
                    busy = true; failed = false
                    scope.launch {
                        val ok = onDelete()
                        busy = false
                        if (!ok) failed = true
                    }
                },
                enabled = canConfirm,
                loading = busy,
                container = Mv.colors.danger,
                content = Color.White,
            )
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.cancel)) } },
    )
}
