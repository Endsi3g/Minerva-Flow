package com.minervaflow.loyalty.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.minervaflow.loyalty.R
import com.minervaflow.loyalty.data.BonusAward
import com.minervaflow.loyalty.data.Config
import com.minervaflow.loyalty.data.HomeData
import com.minervaflow.loyalty.data.LoyaltyReward
import com.minervaflow.loyalty.data.LoyaltyTransaction
import com.minervaflow.loyalty.data.Offer
import com.minervaflow.loyalty.data.RedeemResult
import com.minervaflow.loyalty.domain.Format
import com.minervaflow.loyalty.domain.RewardState
import com.minervaflow.loyalty.domain.Tier
import com.minervaflow.loyalty.domain.nextReward
import com.minervaflow.loyalty.domain.rewardState
import com.minervaflow.loyalty.domain.tierProgress
import com.minervaflow.loyalty.ui.HomeState
import com.minervaflow.loyalty.ui.components.ErrorBlock
import com.minervaflow.loyalty.ui.components.LoadingBlock
import com.minervaflow.loyalty.ui.components.MvCard
import com.minervaflow.loyalty.ui.components.Pill
import com.minervaflow.loyalty.ui.components.PrimaryButton
import com.minervaflow.loyalty.ui.components.ProgressBar
import com.minervaflow.loyalty.ui.components.SectionTitle
import com.minervaflow.loyalty.ui.theme.Mv
import com.minervaflow.loyalty.ui.theme.MvType
import kotlinx.coroutines.launch

@Composable
fun tierLabel(tier: Tier): String = stringResource(
    when (tier) {
        Tier.Habitue -> R.string.tier_habitue
        Tier.Privilegie -> R.string.tier_privilegie
        Tier.Ambassadeur -> R.string.tier_ambassadeur
    }
)

/** Wraps a tab's content with the loading, error, empty and pull-to-refresh states every data screen needs. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DataScreen(
    state: HomeState,
    refreshing: Boolean,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    content: @Composable (HomeData) -> Unit,
) {
    when (state) {
        HomeState.Loading -> LoadingBlock(Modifier.fillMaxSize())
        is HomeState.Error -> ErrorBlock(stringResource(R.string.home_load_error), onRetry, Modifier.fillMaxSize())
        HomeState.Empty -> Column(
            Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(stringResource(R.string.home_empty_title), style = MvType.h2, color = Mv.colors.ink, textAlign = TextAlign.Center)
            Text(stringResource(R.string.home_empty_body), style = MvType.body, color = Mv.colors.inkSoft, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
        }
        is HomeState.Ready -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
            content(state.data)
        }
    }
}

@Composable
fun HomeScreen(data: HomeData, bonus: BonusAward?, onDismissBonus: () -> Unit, onSeeOffers: () -> Unit) {
    val c = Mv.colors
    val uriHandler = LocalUriHandler.current
    val customer = data.customer
    val restaurant = data.restaurantName ?: stringResource(R.string.home_your_restaurant)
    val progress = tierProgress(customer.totalSpent, data.tier2Threshold, data.tier3Threshold)
    val reward = nextReward(data.rewards, customer.loyaltyPoints) { it.pointsCost }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(stringResource(R.string.home_greeting, Format.firstName(customer.name)), style = MvType.h1, color = c.ink)
        }
        if (bonus != null) {
            item {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.lime.copy(alpha = 0.35f)).padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        stringResource(R.string.home_bonus_banner, bonus.points, bonus.restaurantName ?: restaurant),
                        style = MvType.small.copy(fontWeight = FontWeight.SemiBold), color = c.ink, modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = onDismissBonus, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.close)) }
                }
            }
        }
        item {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.emeraldDeep).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.home_points), style = MvType.small, color = Color.White.copy(alpha = 0.8f))
                    Pill(tierLabel(progress.tier), container = c.lime, content = Color(0xFF063B2B))
                }
                Text(customer.loyaltyPoints.toString(), style = MvType.numberLarge, color = Color.White)
                ProgressBar(progress.fraction)
                Text(
                    if (progress.next != null) stringResource(R.string.home_tier_progress, Format.cad(progress.remainingSpend))
                    else stringResource(R.string.home_tier_top),
                    style = MvType.small, color = Color.White.copy(alpha = 0.85f),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(stringResource(R.string.home_visits, customer.visitCount), style = MvType.small, color = Color.White)
                    Text(stringResource(R.string.home_spent, Format.cad(customer.totalSpent)), style = MvType.small, color = Color.White)
                }
            }
        }
        if (reward != null) {
            item {
                MvCard {
                    SectionTitle(stringResource(R.string.home_next_reward))
                    Text(reward.name, style = MvType.h2, color = c.ink)
                    RewardStatusLine(rewardState(customer.loyaltyPoints, reward.pointsCost))
                }
            }
        }
        item {
            MvCard(Modifier.clickable { uriHandler.openUri("${Config.API_BASE}/portal") }) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.heightIn(min = 48.dp)) {
                    Column(Modifier.weight(1f)) {
                        SectionTitle(stringResource(R.string.home_order))
                        Text(stringResource(R.string.home_order_hint, restaurant), style = MvType.small, color = c.inkSoft)
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = c.inkFaint)
                }
            }
        }
        if (data.offers.isNotEmpty()) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    SectionTitle(stringResource(R.string.offers_promos))
                    TextButton(onClick = onSeeOffers, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.tab_offers)) }
                }
            }
            items(data.offers.take(2), key = { it.id }) { OfferRow(it) }
        }
        item { SectionTitle(stringResource(R.string.home_recent)) }
        if (data.transactions.isEmpty()) {
            item { Text(stringResource(R.string.home_no_activity), style = MvType.small, color = c.inkSoft) }
        } else {
            items(data.transactions.take(5), key = { it.id }) { TransactionRow(it) }
        }
    }
}

@Composable
fun RewardStatusLine(state: RewardState) {
    val c = Mv.colors
    when (state) {
        RewardState.Ready -> Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = c.emeraldDark, modifier = Modifier.padding(end = 6.dp))
            Text(stringResource(R.string.home_reward_ready), style = MvType.small.copy(fontWeight = FontWeight.SemiBold), color = c.emeraldDark)
        }
        is RewardState.Short -> Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(stringResource(R.string.home_reward_missing, state.missing), style = MvType.small.copy(fontWeight = FontWeight.SemiBold), color = c.inkSoft)
            ProgressBar(state.fraction)
        }
    }
}

@Composable
fun OfferRow(offer: Offer) {
    val c = Mv.colors
    val ends = Format.shortDate(offer.endsAt)
    MvCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Filled.LocalOffer, contentDescription = null, tint = c.emeraldDark)
            Column(Modifier.weight(1f)) {
                Text(offer.title, style = MvType.section, color = c.ink)
                offer.description?.takeIf { it.isNotBlank() }?.let { Text(it, style = MvType.small, color = c.inkSoft) }
                if (ends != null) Text(stringResource(R.string.offer_ends, ends), style = MvType.caption, color = c.inkFaint)
            }
        }
    }
}

@Composable
private fun TransactionRow(tx: LoyaltyTransaction) {
    val c = Mv.colors
    val label = when (tx.type) {
        "visite" -> stringResource(R.string.tx_visit)
        "echange" -> stringResource(R.string.tx_redeem)
        else -> stringResource(R.string.tx_adjust)
    }
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MvType.body, color = c.ink)
            Text(Format.shortDate(tx.createdAt).orEmpty(), style = MvType.caption, color = c.inkFaint)
        }
        val sign = if (tx.pointsDelta > 0) "+" else ""
        Text("$sign${tx.pointsDelta} pts", style = MvType.body.copy(fontWeight = FontWeight.SemiBold), color = if (tx.pointsDelta >= 0) c.emeraldDark else c.inkSoft)
    }
}

@Composable
fun OffersScreen(data: HomeData) {
    val c = Mv.colors
    val points = data.customer.loyaltyPoints
    val restaurant = data.restaurantName ?: stringResource(R.string.home_your_restaurant)
    val ready = data.rewards.count { it.pointsCost <= points }
    var selected by remember { mutableStateOf<LoyaltyReward?>(null) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Text(stringResource(R.string.offers_title), style = MvType.h1, color = c.ink) }
        item {
            MvCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    Stat(points.toString(), stringResource(R.string.offers_points))
                    Stat(ready.toString(), stringResource(R.string.offers_ready))
                    Stat(data.offers.size.toString(), stringResource(R.string.offers_active))
                }
            }
        }
        if (data.referrals.isNotEmpty()) {
            item { SectionTitle(stringResource(R.string.ref_title)) }
            items(data.referrals, key = { it.program.id }) { ReferralCard(it, restaurant) }
        }
        item { SectionTitle(stringResource(R.string.offers_promos)) }
        if (data.offers.isEmpty()) item { Text(stringResource(R.string.offers_no_promos), style = MvType.small, color = c.inkSoft) }
        items(data.offers, key = { it.id }) { OfferRow(it) }
        item { SectionTitle(stringResource(R.string.offers_rewards)) }
        if (data.rewards.isEmpty()) item { Text(stringResource(R.string.offers_no_rewards), style = MvType.small, color = c.inkSoft) }
        items(data.rewards, key = { it.id }) { reward ->
            MvCard(Modifier.clickable { selected = reward }) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(reward.name, style = MvType.section, color = c.ink)
                        reward.description?.takeIf { it.isNotBlank() }?.let { Text(it, style = MvType.small, color = c.inkSoft) }
                        Text(stringResource(R.string.reward_redeemable_at, restaurant), style = MvType.caption, color = c.emerald)
                        RewardStatusLine(rewardState(points, reward.pointsCost))
                    }
                    Pill(stringResource(R.string.home_pts, reward.pointsCost))
                }
            }
        }
    }

    selected?.let { reward -> RewardDialog(reward, points, onDismiss = { selected = null }) }
}

@Composable
private fun Stat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MvType.h1, color = Mv.colors.ink)
        Text(label, style = MvType.small, color = Mv.colors.inkSoft)
    }
}

/** Confirm, spend and show the code, or explain how many points are missing. Needs the view model's redeem. */
@Composable
private fun RewardDialog(reward: LoyaltyReward, points: Int, onDismiss: () -> Unit) {
    val redeem = LocalRedeem.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var code by remember { mutableStateOf<String?>(null) }
    var failed by remember { mutableStateOf(false) }
    val state = rewardState(points, reward.pointsCost)

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = {
            Text(
                if (code != null) stringResource(R.string.reward_code_title) else stringResource(R.string.reward_confirm_title, reward.name),
                style = MvType.h2,
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                when {
                    code != null -> {
                        Text(code.orEmpty(), style = MvType.numberLarge, color = Mv.colors.emeraldDark)
                        Text(stringResource(R.string.reward_code_hint), style = MvType.small, color = Mv.colors.inkSoft)
                    }
                    state is RewardState.Short -> Text(stringResource(R.string.reward_locked, state.missing), style = MvType.body)
                    else -> Text(stringResource(R.string.reward_confirm_body, reward.pointsCost), style = MvType.body)
                }
                if (failed) Text(stringResource(R.string.reward_error), style = MvType.small, color = Mv.colors.danger)
            }
        },
        confirmButton = {
            if (code == null && state is RewardState.Ready) {
                PrimaryButton(
                    stringResource(R.string.reward_redeem),
                    {
                        busy = true; failed = false
                        scope.launch {
                            when (val result = redeem(reward.id)) {
                                is RedeemResult.Code -> code = result.code
                                RedeemResult.Failure -> failed = true
                            }
                            busy = false
                        }
                    },
                    loading = busy,
                )
            } else {
                TextButton(onClick = onDismiss, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.close)) }
            }
        },
        dismissButton = {
            if (code == null && state is RewardState.Ready) {
                TextButton(onClick = onDismiss, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.cancel)) }
            }
        },
    )
}

@Composable
private fun ReferralCard(progress: com.minervaflow.loyalty.data.ReferralProgress, restaurant: String) {
    val c = Mv.colors
    val context = androidx.compose.ui.platform.LocalContext.current
    val program = progress.program
    val link = progress.link
    val converted = link?.convertedCount ?: 0
    val message = stringResource(R.string.ref_message, restaurant)
    val chooser = stringResource(R.string.ref_share_chooser)
    MvCard {
        Text(program.name, style = MvType.section, color = c.ink)
        program.description?.takeIf { it.isNotBlank() }?.let { Text(it, style = MvType.small, color = c.inkSoft) }
        if (link != null) {
            Text(stringResource(R.string.ref_progress, converted, program.goalCount), style = MvType.small, color = c.inkSoft)
            ProgressBar(com.minervaflow.loyalty.domain.Referral.fraction(converted, program.goalCount))
            program.rewardDescription?.takeIf { it.isNotBlank() }?.let {
                Text(stringResource(R.string.ref_reward, it), style = MvType.small.copy(fontWeight = FontWeight.SemiBold), color = c.emeraldDark)
            }
            if (link.rewardClaimedAt != null) Pill(stringResource(R.string.ref_unlocked))
            PrimaryButton(
                stringResource(R.string.ref_share),
                {
                    val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(android.content.Intent.EXTRA_TEXT, "$message ${com.minervaflow.loyalty.domain.Referral.shareUrl(link.code)}")
                    }
                    runCatching { context.startActivity(android.content.Intent.createChooser(send, chooser).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)) }
                },
            )
        }
    }
}
