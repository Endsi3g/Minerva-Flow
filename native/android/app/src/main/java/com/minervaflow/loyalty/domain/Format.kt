package com.minervaflow.loyalty.domain

import java.text.NumberFormat
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Currency
import java.util.Locale

object Format {
    /** Canadian dollars written the way the device language writes money ("82,00 $" in French, "CA$82.00" in English). */
    fun cad(amount: Double, locale: Locale = Locale.getDefault()): String =
        NumberFormat.getCurrencyInstance(locale).apply { currency = Currency.getInstance("CAD") }.format(amount)

    /** Medium date ("30 oct. 2026") from an ISO-8601 timestamp, or null if it cannot be read. */
    fun shortDate(iso: String?, locale: Locale = Locale.getDefault()): String? {
        if (iso.isNullOrBlank()) return null
        return runCatching {
            OffsetDateTime.parse(iso).format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale))
        }.getOrNull()
    }

    fun firstName(fullName: String): String = fullName.trim().substringBefore(' ').ifBlank { fullName }

    /** Milliseconds since the epoch for an ISO-8601 timestamp, or null if unreadable. */
    fun epochMillis(iso: String?): Long? =
        if (iso.isNullOrBlank()) null else runCatching { OffsetDateTime.parse(iso).toInstant().toEpochMilli() }.getOrNull()

    /** "4:32" for the time left on a code; never negative. */
    fun countdown(millisLeft: Long): String {
        val total = (millisLeft.coerceAtLeast(0) / 1000)
        return "%d:%02d".format(total / 60, total % 60)
    }

    /** "4 oct. 2026, 10:25" from an ISO-8601 timestamp, in the device's language and time zone. */
    fun shortDateTime(iso: String?, locale: Locale = Locale.getDefault()): String? {
        if (iso.isNullOrBlank()) return null
        return runCatching {
            OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.systemDefault())
                .format(DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT).withLocale(locale))
        }.getOrNull()
    }
}
