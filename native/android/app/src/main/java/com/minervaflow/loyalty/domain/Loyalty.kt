package com.minervaflow.loyalty.domain

enum class Tier { Habitue, Privilegie, Ambassadeur }

/** Same rule as the web (lib/loyalty-tiers.ts): the tier follows total spend. */
fun tierFor(totalSpent: Double, tier2: Double, tier3: Double): Tier = when {
    totalSpent >= tier3 -> Tier.Ambassadeur
    totalSpent >= tier2 -> Tier.Privilegie
    else -> Tier.Habitue
}

data class TierProgress(
    val tier: Tier,
    val next: Tier?,
    /** Amount still to spend to reach [next]; 0 at the top tier. */
    val remainingSpend: Double,
    /** 0..1 progress inside the current tier band; 1 at the top tier. */
    val fraction: Float,
)

fun tierProgress(totalSpent: Double, tier2: Double, tier3: Double): TierProgress {
    val tier = tierFor(totalSpent, tier2, tier3)
    val (previousTarget, nextTarget, next) = when (tier) {
        Tier.Habitue -> Triple(0.0, tier2, Tier.Privilegie)
        Tier.Privilegie -> Triple(tier2, tier3, Tier.Ambassadeur)
        Tier.Ambassadeur -> return TierProgress(tier, null, 0.0, 1f)
    }
    val span = (nextTarget - previousTarget).coerceAtLeast(1.0)
    val fraction = ((totalSpent - previousTarget) / span).coerceIn(0.0, 1.0).toFloat()
    return TierProgress(tier, next, (nextTarget - totalSpent).coerceAtLeast(0.0), fraction)
}

sealed interface RewardState {
    data object Ready : RewardState
    data class Short(val missing: Int, val fraction: Float) : RewardState
}

fun rewardState(points: Int, cost: Int): RewardState =
    if (points >= cost) RewardState.Ready
    else RewardState.Short(missing = cost - points, fraction = (points.coerceAtLeast(0).toFloat() / cost.coerceAtLeast(1)).coerceIn(0f, 1f))

/** The reward worth showing first: the cheapest one already within reach, otherwise the closest one. */
fun <T> nextReward(rewards: List<T>, points: Int, cost: (T) -> Int): T? {
    if (rewards.isEmpty()) return null
    val affordable = rewards.filter { cost(it) <= points }
    return if (affordable.isNotEmpty()) affordable.maxByOrNull { cost(it) } else rewards.minByOrNull { cost(it) }
}
