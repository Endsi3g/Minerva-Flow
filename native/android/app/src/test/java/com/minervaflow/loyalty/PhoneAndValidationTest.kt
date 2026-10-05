package com.minervaflow.loyalty

import com.minervaflow.loyalty.domain.Phone
import com.minervaflow.loyalty.domain.Validation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PhoneAndValidationTest {
    @Test fun normalizesToE164LikeTheWeb() {
        assertEquals("+15145550100", Phone.normalize("514-555-0100"))
        assertEquals("+15145550100", Phone.normalize("(514) 555 0100"))
        assertEquals("+15145550100", Phone.normalize("1 514 555 0100"))
        assertEquals("+15145550100", Phone.normalize("+1 514 555 0100"))
        assertEquals("+33612345678", Phone.normalize("06 12 34 56 78"))
    }

    @Test fun rejectsNumbersThatAreNotPlausible() {
        assertNull(Phone.normalize(""))
        assertNull(Phone.normalize("   "))
        assertNull(Phone.normalize("abc"))
        assertNull(Phone.normalize("12345"))
        assertNull(Phone.normalize("+12345"))
    }

    @Test fun localDigitsAreWhatTheCounterTypes() {
        assertEquals("5145550100", Phone.localDigits("+15145550100"))
        assertEquals("5145550100", Phone.localDigits("5145550100"))
        assertEquals("", Phone.localDigits(null))
    }

    @Test fun displayFormatsNorthAmericanNumbers() {
        assertEquals("(514) 555-0100", Phone.display("+15145550100"))
        assertEquals("(514) 555-0100", Phone.display("5145550100"))
        assertEquals("", Phone.display(null))
    }

    @Test fun emailValidation() {
        assertTrue(Validation.isEmail("client@exemple.com"))
        assertTrue(Validation.isEmail("  client@exemple.com "))
        assertFalse(Validation.isEmail("client@exemple"))
        assertFalse(Validation.isEmail("client exemple.com"))
        assertFalse(Validation.isEmail(""))
    }

    @Test fun passwordAndCodeRules() {
        assertTrue(Validation.isStrongEnoughPassword("12345678"))
        assertFalse(Validation.isStrongEnoughPassword("1234567"))
        assertTrue(Validation.isSixDigitCode("123456"))
        assertTrue(Validation.isSixDigitCode(" 123456 "))
        assertFalse(Validation.isSixDigitCode("12345"))
        assertFalse(Validation.isSixDigitCode("12345a"))
    }
}
