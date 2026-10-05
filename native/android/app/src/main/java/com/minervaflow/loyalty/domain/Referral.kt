package com.minervaflow.loyalty.domain

import com.minervaflow.loyalty.data.Config

object Referral {
    /** The address a friend opens: the apex host, because it is the one declared for app links. */
    fun shareUrl(code: String, via: String = "android"): String = "${Config.LINK_BASE}/p/$code?via=$via"

    /** 0..1 progress toward the number of friends needed for the reward. */
    fun fraction(converted: Int, goal: Int): Float = (converted.coerceAtLeast(0).toFloat() / goal.coerceAtLeast(1)).coerceIn(0f, 1f)
}
