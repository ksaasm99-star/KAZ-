package com.kaz.appfactory.data.remote

import com.kaz.appfactory.data.model.CodeSnippet
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

object CodeExtractor {

    private val json = Json { ignoreUnknownKeys = true }

    fun parseMarkdownResponse(markdown: String): Pair<String, List<CodeSnippet>> {
        val snippets = mutableListOf<CodeSnippet>()
        val codeBlockRegex = Regex("```([a-zA-Z0-9_-]*)\\s*\\n([\\s\\S]*?)```", RegexOption.MULTILINE)

        val matches = codeBlockRegex.findAll(markdown).toList()
        for ((index, match) in matches.withIndex()) {
            val language = match.groupValues[1].ifBlank { "kotlin" }
            val code = match.groupValues[2].trimEnd()

            val title = detectSnippetTitle(code, language, index + 1)
            snippets.add(
                CodeSnippet(
                    id = UUID.randomUUID().toString(),
                    title = title,
                    code = code,
                    language = language.lowercase()
                )
            )
        }

        return Pair(markdown, snippets)
    }

    private fun detectSnippetTitle(code: String, language: String, index: Int): String {
        val lines = code.lines()
        for (line in lines.take(5)) {
            val trimmed = line.trim()
            if (trimmed.startsWith("@Composable") || trimmed.startsWith("fun ")) {
                val funName = trimmed.substringAfter("fun ").substringBefore("(").trim()
                if (funName.isNotEmpty()) return "$funName (Jetpack Compose)"
            }
            if (trimmed.startsWith("class ")) {
                val className = trimmed.substringAfter("class ").substringBefore(" ").substringBefore(":").trim()
                if (className.isNotEmpty()) return "$className (Kotlin)"
            }
            if (trimmed.startsWith("data class ")) {
                val className = trimmed.substringAfter("data class ").substringBefore("(").trim()
                if (className.isNotEmpty()) return "$className (Model)"
            }
            if (trimmed.startsWith("interface ")) {
                val ifaceName = trimmed.substringAfter("interface ").substringBefore(" ").substringBefore("{").trim()
                if (ifaceName.isNotEmpty()) return "$ifaceName (Interface)"
            }
        }
        return when (language.lowercase()) {
            "kotlin" -> "كود أندرويد (Kotlin) #$index"
            "xml" -> "ملف XML #$index"
            "gradle", "kts" -> "إعدادات Gradle #$index"
            "json" -> "بيانات JSON #$index"
            else -> "شفرة برمجية #$index"
        }
    }

    fun serializeSnippets(snippets: List<CodeSnippet>): String {
        return json.encodeToString(snippets)
    }

    fun deserializeSnippets(jsonString: String): List<CodeSnippet> {
        return try {
            json.decodeFromString<List<CodeSnippet>>(jsonString)
        } catch (_: Exception) {
            emptyList()
        }
    }
}
