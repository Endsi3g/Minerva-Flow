package com.minervaflow.loyalty.domain

/**
 * North-American-first phone handling, matching lib/phone.ts on the web so the number a guest saves
 * here is the one the counter finds.
 */
object Phone {
    /** E.164 (+1XXXXXXXXXX), or null when the input is not a plausible number. */
    fun normalize(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        val digits = trimmed.filter { it.isDigit() }
        if (digits.isEmpty()) return null
        if (trimmed.startsWith("+")) return if (digits.length in 10..15) "+$digits" else null
        return when {
            digits.length == 10 && digits.startsWith("0") -> "+33${digits.drop(1)}"
            digits.length == 10 -> "+1$digits"
            digits.length == 11 && digits.startsWith("1") -> "+$digits"
            digits.length in 11..15 -> "+$digits"
            else -> null
        }
    }

    /** The 10 local digits the counter types for a North American number. */
    fun localDigits(phone: String?): String {
        val digits = phone.orEmpty().filter { it.isDigit() }
        return if (digits.length == 11 && digits.startsWith("1")) digits.drop(1) else digits
    }

    /** (514) 555-0100 for North American numbers, the stored value otherwise. */
    fun display(phone: String?): String {
        if (phone.isNullOrBlank()) return ""
        val digits = phone.filter { it.isDigit() }
        return when {
            digits.length == 10 && !phone.startsWith("+33") && !phone.startsWith("+44") ->
                "(${digits.take(3)}) ${digits.substring(3, 6)}-${digits.substring(6)}"
            digits.length == 11 && digits.startsWith("1") ->
                "(${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}"
            else -> phone
        }
    }
}
