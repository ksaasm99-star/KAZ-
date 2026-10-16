package com.kaz.appfactory.data.remote

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CodeExtractorTest {

    @Test
    fun `parseMarkdownResponse extracts multiple code blocks with headers`() {
        val markdown = """
            # شرح التطبيق
            إليك الكود المولد:
            
            ```kotlin
            package com.kaz.example
            class MyScreen
            ```
            
            وهذا هو الـ ViewModel:
            
            ```kotlin
            package com.kaz.example
            class MyViewModel
            ```
        """.trimIndent()

        val (cleanedText, snippets) = CodeExtractor.parseMarkdownResponse(markdown)

        assertEquals(2, snippets.size)
        assertTrue(snippets[0].code.contains("class MyScreen"))
        assertTrue(snippets[1].code.contains("class MyViewModel"))
    }

    @Test
    fun `serialize and deserialize snippets roundtrip succeeds`() {
        val markdown = """
            ```kotlin
            fun main() = println("Hello KAZ")
            ```
        """.trimIndent()

        val (_, snippets) = CodeExtractor.parseMarkdownResponse(markdown)
        val json = CodeExtractor.serializeSnippets(snippets)
        val deserialized = CodeExtractor.deserializeSnippets(json)

        assertEquals(1, deserialized.size)
        assertEquals("kotlin", deserialized[0].language)
        assertTrue(deserialized[0].code.contains("Hello KAZ"))
    }
}
