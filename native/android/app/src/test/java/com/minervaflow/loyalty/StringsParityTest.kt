package com.minervaflow.loyalty

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Every string exists in French (default) and English, with the same placeholders. */
class StringsParityTest {
    private fun load(path: String): Map<String, String> {
        val text = File(path).readText()
        return Regex("""<string name="([a-z0-9_]+)"[^>]*>(.*?)</string>""", RegexOption.DOT_MATCHES_ALL)
            .findAll(text).associate { it.groupValues[1] to it.groupValues[2] }
    }

    private val fr = load("src/main/res/values/strings.xml")
    private val en = load("src/main/res/values-en/strings.xml")

    @Test fun sameKeysInBothLanguages() {
        assertTrue(fr.isNotEmpty())
        assertEquals(fr.keys.sorted(), en.keys.sorted())
    }

    @Test fun samePlaceholdersInBothLanguages() {
        val placeholder = Regex("""%\d\$[sd]""")
        for ((key, french) in fr) {
            val english = en.getValue(key)
            assertEquals("placeholders differ for $key", placeholder.findAll(french).map { it.value }.sorted().toList(), placeholder.findAll(english).map { it.value }.sorted().toList())
        }
    }

    @Test fun nothingIsLeftEmpty() {
        (fr + en.mapKeys { "en:" + it.key }).forEach { (key, value) -> assertTrue("$key is empty", value.isNotBlank()) }
    }
}
