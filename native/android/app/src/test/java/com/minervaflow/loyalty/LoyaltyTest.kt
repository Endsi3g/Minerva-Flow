package com.minervaflow.loyalty

import com.minervaflow.loyalty.domain.RewardState
import com.minervaflow.loyalty.domain.Tier
import com.minervaflow.loyalty.domain.nextReward
import com.minervaflow.loyalty.domain.rewardState
import com.minervaflow.loyalty.domain.tierFor
import com.minervaflow.loyalty.domain.tierProgress
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LoyaltyTest {
    @Test fun tierFollowsTotalSpendAtTheBoundaries() {
        assertEquals(Tier.Habitue, tierFor(0.0, 150.0, 400.0))
        assertEquals(Tier.Habitue, tierFor(149.99, 150.0, 400.0))
        assertEquals(Tier.Privilegie, tierFor(150.0, 150.0, 400.0))
        assertEquals(Tier.Privilegie, tierFor(399.99, 150.0, 400.0))
        assertEquals(Tier.Ambassadeur, tierFor(400.0, 150.0, 400.0))
    }

    @Test fun progressInsideTheBand() {
        val p = tierProgress(75.0, 150.0, 400.0)
        assertEquals(Tier.Habitue, p.tier)
        assertEquals(Tier.Privilegie, p.next)
        assertEquals(75.0, p.remainingSpend, 0.001)
        assertEquals(0.5f, p.fraction, 0.001f)

        val q = tierProgress(275.0, 150.0, 400.0)
        assertEquals(Tier.Privilegie, q.tier)
        assertEquals(125.0, q.remainingSpend, 0.001)
        assertEquals(0.5f, q.fraction, 0.001f)
    }

    @Test fun topTierHasNothingLeftToReach() {
        val p = tierProgress(1000.0, 150.0, 400.0)
        assertEquals(Tier.Ambassadeur, p.tier)
        assertNull(p.next)
        assertEquals(0.0, p.remainingSpend, 0.0)
        assertEquals(1f, p.fraction, 0f)
    }

    @Test fun degenerateThresholdsDoNotDivideByZero() {
        val p = tierProgress(0.0, 0.0, 0.0)
        assertTrue(p.fraction in 0f..1f)
    }

    @Test fun rewardIsReadyOrShortWithProgress() {
        assertEquals(RewardState.Ready, rewardState(50, 50))
        assertEquals(RewardState.Ready, rewardState(200, 50))
        val short = rewardState(30, 120) as RewardState.Short
        assertEquals(90, short.missing)
        assertEquals(0.25f, short.fraction, 0.001f)
        assertEquals(0f, (rewardState(-5, 100) as RewardState.Short).fraction, 0f)
    }

    @Test fun nextRewardPrefersTheBestAffordableThenTheClosest() {
        val costs = listOf(50, 120, 200, 450)
        assertEquals(200, nextReward(costs, 250) { it })
        assertEquals(50, nextReward(costs, 50) { it })
        assertEquals(50, nextReward(costs, 10) { it })
        assertNull(nextReward(emptyList<Int>(), 10) { it })
    }
}
