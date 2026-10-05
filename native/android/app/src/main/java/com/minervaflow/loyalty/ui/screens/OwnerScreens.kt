package com.minervaflow.loyalty.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.minervaflow.loyalty.R
import com.minervaflow.loyalty.data.Config
import com.minervaflow.loyalty.data.CounterCustomer
import com.minervaflow.loyalty.data.CounterResult
import com.minervaflow.loyalty.data.DeleteOutcome
import com.minervaflow.loyalty.data.LookupHit
import com.minervaflow.loyalty.data.OrderStatus
import com.minervaflow.loyalty.data.OwnerCustomer
import com.minervaflow.loyalty.data.OwnerOrder
import com.minervaflow.loyalty.domain.Format
import com.minervaflow.loyalty.ui.OwnerUiState
import com.minervaflow.loyalty.ui.OwnerViewModel
import com.minervaflow.loyalty.ui.components.ErrorBlock
import com.minervaflow.loyalty.ui.components.LoadingBlock
import com.minervaflow.loyalty.ui.components.MvCard
import com.minervaflow.loyalty.ui.components.Pill
import com.minervaflow.loyalty.ui.components.PrimaryButton
import com.minervaflow.loyalty.ui.components.SecondaryButton
import com.minervaflow.loyalty.ui.components.SectionTitle
import com.minervaflow.loyalty.ui.theme.Mv
import com.minervaflow.loyalty.ui.theme.MvType
import kotlinx.coroutines.launch

@Composable
private fun statusLabel(status: String): String = stringResource(
    when (status) {
        OrderStatus.NEW -> R.string.ord_new
        OrderStatus.PREPARING -> R.string.ord_preparing
        OrderStatus.READY -> R.string.ord_ready
        OrderStatus.SERVED -> R.string.ord_served
        OrderStatus.CANCELLED -> R.string.ord_cancelled
        else -> R.string.ord_new
    }
)

/** Loading, error and pull-to-refresh around every owner tab. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OwnerDataFrame(state: OwnerUiState, onRefresh: () -> Unit, content: @Composable () -> Unit) {
    when {
        state.loading -> LoadingBlock(Modifier.fillMaxSize())
        state.error -> ErrorBlock(stringResource(R.string.owner_load_error), onRefresh, Modifier.fillMaxSize())
        else -> PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) { content() }
    }
}

@Composable
fun OwnerOverviewScreen(state: OwnerUiState, onSelect: (String) -> Unit, onSeeOrders: () -> Unit) {
    val c = Mv.colors
    val overview = state.overview
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text(stringResource(R.string.ov_title), style = MvType.h1, color = c.ink) }
        item { Text(state.selected?.name.orEmpty(), style = MvType.small, color = c.inkSoft) }
        item {
            MvCard {
                Text(stringResource(R.string.ov_month_revenue), style = MvType.small, color = c.inkSoft)
                Text(Format.cad(overview?.monthRevenue ?: 0.0), style = MvType.numberLarge, color = c.ink)
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                MvCard(Modifier.weight(1f)) {
                    Text(stringResource(R.string.ov_month_orders), style = MvType.small, color = c.inkSoft)
                    Text((overview?.monthOrders ?: 0).toString(), style = MvType.h1, color = c.ink)
                }
                MvCard(Modifier.weight(1f).clickable { onSeeOrders() }) {
                    Text(stringResource(R.string.ov_to_handle), style = MvType.small, color = c.inkSoft)
                    Text(state.ordersToHandle.toString(), style = MvType.h1, color = if (state.ordersToHandle > 0) c.emeraldDark else c.ink)
                }
            }
        }
        item {
            MvCard {
                Text(stringResource(R.string.ov_customers), style = MvType.small, color = c.inkSoft)
                Text(state.customers.size.toString(), style = MvType.h1, color = c.ink)
            }
        }
        if (state.restaurants.size > 1) {
            item { SectionTitle(stringResource(R.string.ov_locations)) }
            items(state.restaurants, key = { it.id }) { r ->
                MvCard(Modifier.clickable { onSelect(r.id) }) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.heightIn(min = 48.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(r.name, style = MvType.section, color = c.ink)
                            r.city?.let { Text(it, style = MvType.small, color = c.inkSoft) }
                        }
                        if (r.id == state.selectedId) Icon(Icons.Filled.Check, contentDescription = null, tint = c.emeraldDark)
                    }
                }
            }
        }
    }
}

@Composable
fun OwnerOrdersScreen(state: OwnerUiState, onFilter: (String?) -> Unit, onUpdate: suspend (OwnerOrder, String) -> Boolean) {
    val c = Mv.colors
    val scope = rememberCoroutineScope()
    var message by remember { mutableStateOf<Int?>(null) }
    val filters = listOf<String?>(null) + OrderStatus.workflow

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.ord_title), style = MvType.h1, color = c.ink) }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filters) { f ->
                    FilterChip(
                        selected = state.orderFilter == f,
                        onClick = { onFilter(f) },
                        label = { Text(if (f == null) stringResource(R.string.ord_filter_all) else statusLabel(f)) },
                        modifier = Modifier.heightIn(min = 48.dp),
                    )
                }
            }
        }
        message?.let { item { Text(stringResource(it), style = MvType.small, color = c.emeraldDark) } }
        if (state.visibleOrders.isEmpty()) item { Text(stringResource(R.string.ord_empty), style = MvType.small, color = c.inkSoft) }
        items(state.visibleOrders, key = { it.id }) { order ->
            var open by remember { mutableStateOf(false) }
            MvCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(order.guestName?.takeIf { it.isNotBlank() } ?: stringResource(R.string.ord_guest_unknown), style = MvType.section, color = c.ink)
                        Text(Format.shortDateTime(order.createdAt).orEmpty(), style = MvType.caption, color = c.inkFaint)
                        Format.shortDateTime(order.requestedReadyAt)?.let {
                            Text(stringResource(R.string.ord_pickup, it), style = MvType.caption, color = c.emeraldDark)
                        }
                    }
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(Format.cad(order.total), style = MvType.section, color = c.emeraldDark)
                        Pill(statusLabel(order.status))
                    }
                }
                Box {
                    SecondaryButton(stringResource(R.string.ord_update), { open = true })
                    DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                        OrderStatus.workflow.forEach { status ->
                            DropdownMenuItem(
                                text = { Text(statusLabel(status)) },
                                onClick = {
                                    open = false
                                    scope.launch {
                                        message = if (onUpdate(order, status)) R.string.ord_updated else R.string.ord_update_failed
                                    }
                                },
                                modifier = Modifier.heightIn(min = 48.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OwnerMenuScreen(state: OwnerUiState, onToggle: suspend (com.minervaflow.loyalty.data.OwnerMenuItem, Boolean) -> Boolean) {
    val c = Mv.colors
    val scope = rememberCoroutineScope()
    var message by remember { mutableStateOf<Int?>(null) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Text(stringResource(R.string.menu_title), style = MvType.h1, color = c.ink) }
        message?.let { item { Text(stringResource(it), style = MvType.small, color = c.danger) } }
        if (state.menu.isEmpty()) item { Text(stringResource(R.string.menu_empty), style = MvType.small, color = c.inkSoft) }
        items(state.menu, key = { it.id }) { item ->
            MvCard {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.heightIn(min = 48.dp)) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(item.name, style = MvType.section, color = c.ink)
                        Text(
                            listOfNotNull(item.category, Format.cad(item.price)).joinToString(" · "),
                            style = MvType.small, color = c.inkSoft,
                        )
                        Text(
                            when {
                                item.isDraft -> stringResource(R.string.menu_draft)
                                item.active -> stringResource(R.string.menu_available)
                                else -> stringResource(R.string.menu_hidden)
                            },
                            style = MvType.caption, color = if (item.active) c.emeraldDark else c.inkFaint,
                        )
                    }
                    Switch(
                        checked = item.active,
                        enabled = !item.isDraft,
                        onCheckedChange = { wanted ->
                            scope.launch { message = if (onToggle(item, wanted)) null else R.string.menu_update_failed }
                        },
                    )
                }
            }
        }
    }
}

@Composable
fun OwnerLoyaltyScreen(vm: OwnerViewModel, state: OwnerUiState) {
    val c = Mv.colors
    val scope = rememberCoroutineScope()

    // ---- Counter state: phone -> pick -> confirm the guest's code -> record the visit ----
    var phone by remember { mutableStateOf("") }
    var hits by remember { mutableStateOf<List<LookupHit>?>(null) }
    var picked by remember { mutableStateOf<LookupHit?>(null) }
    var code by remember { mutableStateOf("") }
    var confirmed by remember { mutableStateOf<CounterCustomer?>(null) }
    var amount by remember { mutableStateOf("") }
    var counterMessage by remember { mutableStateOf<Int?>(null) }
    var counterBusy by remember { mutableStateOf(false) }
    var notesFor by remember { mutableStateOf<OwnerCustomer?>(null) }

    fun resetCounter() { phone = ""; hits = null; picked = null; code = ""; confirmed = null; amount = "" }
    val search: () -> Unit = {
        counterBusy = true; counterMessage = null; picked = null; confirmed = null
        scope.launch { hits = vm.lookup(phone); counterBusy = false }
    }

    LazyColumn(Modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text(stringResource(R.string.loy_title), style = MvType.h1, color = c.ink) }
        item {
            MvCard {
                SectionTitle(stringResource(R.string.loy_counter))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text(stringResource(R.string.loy_phone)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { search() }),
                    modifier = Modifier.fillMaxWidth(),
                )
                PrimaryButton(stringResource(R.string.loy_search), search, loading = counterBusy && hits == null, enabled = phone.count { it.isDigit() } >= 7)
                if (hits != null && hits!!.isEmpty()) Text(stringResource(R.string.loy_no_match), style = MvType.small, color = c.inkSoft)
                if (confirmed == null) {
                    hits?.forEach { hit ->
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable { picked = hit; code = ""; counterMessage = null },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(hit.name, style = MvType.body.copy(fontWeight = if (picked?.id == hit.id) FontWeight.SemiBold else FontWeight.Normal), color = c.ink, modifier = Modifier.weight(1f))
                            if (picked?.id == hit.id) Icon(Icons.Filled.Check, contentDescription = null, tint = c.emeraldDark)
                        }
                    }
                }
                val target = picked
                if (target != null && confirmed == null) {
                    Text(stringResource(R.string.loy_ask_code), style = MvType.small, color = c.inkSoft)
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it.filter(Char::isDigit).take(6) },
                        label = { Text(stringResource(R.string.loy_code)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    PrimaryButton(
                        stringResource(R.string.loy_confirm),
                        {
                            counterBusy = true; counterMessage = null
                            scope.launch {
                                when (val r = vm.confirm(target.id, code)) {
                                    is CounterResult.Ok -> confirmed = r.value
                                    else -> counterMessage = R.string.loy_code_wrong
                                }
                                counterBusy = false
                            }
                        },
                        enabled = code.length == 6,
                        loading = counterBusy,
                    )
                }
                val who = confirmed
                if (who != null) {
                    Text(stringResource(R.string.loy_confirmed), style = MvType.section, color = c.emeraldDark)
                    Text(stringResource(R.string.loy_customer_line, who.name, who.loyaltyPoints, who.visitCount), style = MvType.body, color = c.ink)
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' } },
                        label = { Text(stringResource(R.string.loy_amount)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    val parsed = amount.replace(',', '.').toDoubleOrNull()
                    PrimaryButton(
                        stringResource(R.string.loy_record),
                        {
                            counterBusy = true; counterMessage = null
                            scope.launch {
                                val ok = vm.recordVisit(who.id, parsed ?: 0.0)
                                counterMessage = if (ok) R.string.loy_recorded else R.string.loy_record_failed
                                if (ok) resetCounter()
                                counterBusy = false
                            }
                        },
                        enabled = parsed != null && parsed > 0,
                        loading = counterBusy,
                    )
                }
                counterMessage?.let {
                    Text(stringResource(it), style = MvType.small, color = if (it == R.string.loy_recorded) c.emeraldDark else c.danger)
                }
            }
        }
        item { SectionTitle(stringResource(R.string.loy_customers)) }
        item {
            OutlinedTextField(
                value = state.customerSearch,
                onValueChange = { vm.searchCustomers(it) },
                label = { Text(stringResource(R.string.loy_search_customers)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (state.customers.isEmpty()) item { Text(stringResource(R.string.loy_no_customers), style = MvType.small, color = c.inkSoft) }
        items(state.customers, key = { it.id }) { customer ->
            MvCard(Modifier.clickable { notesFor = customer }) {
                Column(Modifier.heightIn(min = 48.dp), verticalArrangement = Arrangement.Center) {
                    Text(customer.name, style = MvType.section, color = c.ink)
                    Text(stringResource(R.string.loy_customer_row, customer.loyaltyPoints, customer.visitCount), style = MvType.small, color = c.inkSoft)
                    customer.email?.let { Text(it, style = MvType.caption, color = c.inkFaint) }
                }
            }
        }
    }

    notesFor?.let { customer -> StaffNoteDialog(vm, customer, onDismiss = { notesFor = null }) }
}

/** Notes only the team can read: allergies, preferred table, wine. Stored apart from the customer row on purpose. */
@Composable
private fun StaffNoteDialog(vm: OwnerViewModel, customer: OwnerCustomer, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    var text by remember { mutableStateOf("") }
    var loaded by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    LaunchedEffect(customer.id) { text = vm.staffNote(customer.id); loaded = true }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text(customer.name, style = MvType.h2) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.loy_notes_title), style = MvType.section)
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it.take(2000) },
                    placeholder = { Text(stringResource(R.string.loy_notes_placeholder)) },
                    enabled = loaded,
                    minLines = 4,
                    maxLines = 8,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(stringResource(R.string.loy_notes_hint), style = MvType.caption, color = Mv.colors.inkFaint)
                if (failed) Text(stringResource(R.string.loy_notes_failed), style = MvType.small, color = Mv.colors.danger)
            }
        },
        confirmButton = {
            PrimaryButton(
                stringResource(R.string.save),
                {
                    busy = true; failed = false
                    scope.launch {
                        val ok = vm.saveStaffNote(customer.id, text)
                        busy = false
                        if (ok) onDismiss() else failed = true
                    }
                },
                enabled = loaded,
                loading = busy,
            )
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.cancel)) } },
    )
}

@Composable
fun OwnerAccountScreen(state: OwnerUiState, email: String?, onSignOut: () -> Unit, onDelete: suspend () -> DeleteOutcome, onDeleted: () -> Unit) {
    val c = Mv.colors
    val uriHandler = LocalUriHandler.current
    val context = LocalContext.current
    var confirmSignOut by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Text(stringResource(R.string.account_title), style = MvType.h1, color = c.ink) }
        item {
            MvCard {
                Text(state.selected?.name.orEmpty(), style = MvType.h2, color = c.ink)
                email?.let { Text(it, style = MvType.small, color = c.inkSoft) }
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                LinkRow(R.string.account_privacy) { uriHandler.openUri(Config.PRIVACY_URL) }
                LinkRow(R.string.account_terms) { uriHandler.openUri(Config.TERMS_URL) }
                LinkRow(R.string.account_support) {
                    runCatching {
                        context.startActivity(android.content.Intent(android.content.Intent.ACTION_SENDTO, android.net.Uri.parse("mailto:${Config.SUPPORT_EMAIL}")).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
                    }.onFailure { uriHandler.openUri("${Config.API_BASE}/support") }
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
                TextButton(onClick = { uriHandler.openUri("${Config.LINK_BASE}/profil") }, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(stringResource(R.string.owner_delete_web))
                }
            }
        }
        item { Text(stringResource(R.string.account_version, com.minervaflow.loyalty.BuildConfig.VERSION_NAME), style = MvType.caption, color = c.inkFaint) }
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text(stringResource(R.string.account_signout_confirm), style = MvType.h2) },
            confirmButton = { TextButton(onClick = { confirmSignOut = false; onSignOut() }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.account_signout)) } },
            dismissButton = { TextButton(onClick = { confirmSignOut = false }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.cancel)) } },
        )
    }
    if (showDelete) {
        DeleteAccountDialog(
            bodyRes = R.string.owner_delete_body,
            onDismiss = { showDelete = false },
            onDelete = {
                when (onDelete()) {
                    DeleteOutcome.Deleted -> { onDeleted(); null }
                    DeleteOutcome.SoleOwner -> R.string.owner_delete_sole
                    DeleteOutcome.Failed -> R.string.account_delete_failed
                }
            },
        )
    }
}
