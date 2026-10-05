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
}
