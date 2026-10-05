package com.minervaflow.loyalty.ui.screens

import androidx.compose.runtime.compositionLocalOf
import com.minervaflow.loyalty.data.RedeemResult

/** Lets a dialog deep in a screen spend points without every screen threading the view model through. */
val LocalRedeem = compositionLocalOf<suspend (String) -> RedeemResult> { { RedeemResult.Failure } }
