package com.minervaflow.loyalty.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Semantic palette shared with the iOS app (Theme.swift), light and dark. */
@Immutable
data class MvColors(
    val cream: Color,
    val creamSoft: Color,
    val surface: Color,
    val ink: Color,
    val inkSoft: Color,
    val inkFaint: Color,
    val border: Color,
    val emerald: Color,
    val emeraldDark: Color,
    val emeraldDeep: Color,
    val onEmerald: Color,
    val lime: Color,
    val danger: Color,
)

private val LightColors = MvColors(
    cream = Color(0xFFF5F1E6), creamSoft = Color(0xFFFAFAF5), surface = Color(0xFFFFFEFA),
    ink = Color(0xFF1B2620), inkSoft = Color(0xFF56645A), inkFaint = Color(0xFF687367),
    border = Color(0xFFE6E0D0), emerald = Color(0xFF167F5B), emeraldDark = Color(0xFF0E5A40),
    emeraldDeep = Color(0xFF063B2B), onEmerald = Color(0xFFFFFFFF), lime = Color(0xFFDFFF5F),
    danger = Color(0xFFB3261E),
)

private val DarkColors = MvColors(
    cream = Color(0xFF14170F), creamSoft = Color(0xFF1A1E14), surface = Color(0xFF1F2418),
    ink = Color(0xFFF3F2EA), inkSoft = Color(0xFFB9C0B0), inkFaint = Color(0xFFA0A794),
    border = Color(0xFF33392A), emerald = Color(0xFF3FC08E), emeraldDark = Color(0xFF7FDCB5),
    emeraldDeep = Color(0xFF0B5A40), onEmerald = Color(0xFF0B1A12), lime = Color(0xFFDFFF5F),
    danger = Color(0xFFF2B8B5),
)

val LocalMv = staticCompositionLocalOf { LightColors }

object Mv {
    val colors: MvColors
        @Composable @ReadOnlyComposable get() = LocalMv.current
}

/** Serif for headings (the web uses New York / Playfair), sans for everything else. Nothing under 12sp. */
object MvType {
    val display = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Medium, fontSize = 34.sp, lineHeight = 40.sp)
    val h1 = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Medium, fontSize = 28.sp, lineHeight = 34.sp)
    val h2 = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 26.sp)
    val section = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp)
    val body = TextStyle(fontSize = 16.sp, lineHeight = 24.sp)
    val small = TextStyle(fontSize = 14.sp, lineHeight = 20.sp)
    val caption = TextStyle(fontSize = 12.sp, lineHeight = 16.sp)
    val numberLarge = TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Medium, fontSize = 48.sp, lineHeight = 52.sp)
}

@Composable
fun MinervaTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val c = if (dark) DarkColors else LightColors
    val scheme = if (dark) {
        darkColorScheme(
            primary = c.emerald, onPrimary = c.onEmerald, background = c.cream, onBackground = c.ink,
            surface = c.creamSoft, onSurface = c.ink, surfaceVariant = c.surface, onSurfaceVariant = c.inkSoft,
            outline = c.border, error = c.danger,
        )
    } else {
        lightColorScheme(
            primary = c.emerald, onPrimary = c.onEmerald, background = c.cream, onBackground = c.ink,
            surface = c.creamSoft, onSurface = c.ink, surfaceVariant = c.surface, onSurfaceVariant = c.inkSoft,
            outline = c.border, error = c.danger,
        )
    }
    CompositionLocalProvider(LocalMv provides c) {
        MaterialTheme(colorScheme = scheme, typography = Typography(), content = content)
    }
}
