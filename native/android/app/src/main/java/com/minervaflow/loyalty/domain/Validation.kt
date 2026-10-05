package com.minervaflow.loyalty.domain

object Validation {
    private val email = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

    fun isEmail(value: String): Boolean = email.matches(value.trim())

    /** The same minimum the sign-up form enforces on the web. */
    fun isStrongEnoughPassword(value: String): Boolean = value.length >= 8

    fun isSixDigitCode(value: String): Boolean = value.trim().length == 6 && value.trim().all { it.isDigit() }
}
