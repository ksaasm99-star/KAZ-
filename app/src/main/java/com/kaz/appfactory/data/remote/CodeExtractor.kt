package com.kaz.appfactory.data.remote

import com.kaz.appfactory.data.model.CodeSnippet
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

object CodeExtractor {

    private val json = Json { ignoreUnknownKeys = true }

    fun extractHtmlApp(response: String): String {
        val trimmed = response.trim()

        // 1. Look for explicit ```html ... ``` block
        val htmlBlockRegex = Regex("```(?:html|htm)\\s*\\n([\\s\\S]*?)```", RegexOption.IGNORE_CASE)
        val htmlMatch = htmlBlockRegex.find(trimmed)
        if (htmlMatch != null) {
            return htmlMatch.groupValues[1].trim()
        }

        // 2. Look for any code block with <!DOCTYPE html> or <html>
        val anyBlockRegex = Regex("```[a-zA-Z0-9_-]*\\s*\\n([\\s\\S]*?)```")
        for (match in anyBlockRegex.findAll(trimmed)) {
            val code = match.groupValues[1].trim()
            if (code.contains("<!DOCTYPE html>", ignoreCase = true) || code.contains("<html", ignoreCase = true)) {
                return code
            }
        }

        // 3. Raw HTML string
        if (trimmed.contains("<!DOCTYPE html>", ignoreCase = true) || trimmed.contains("<html", ignoreCase = true)) {
            val start = trimmed.indexOf("<!DOCTYPE html>", ignoreCase = true).let {
                if (it != -1) it else trimmed.indexOf("<html", ignoreCase = true)
            }
            val end = trimmed.lastIndexOf("</html>", ignoreCase = true).let {
                if (it != -1) it + 7 else trimmed.length
            }
            if (start != -1 && end > start) {
                return trimmed.substring(start, end).trim()
            }
        }

        // 4. Fallback: Wrap response in an interactive HTML5 mobile shell
        return """
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>تطبيق KAZ</title>
                <style>
                    body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: #0D1117;
                        color: #E6EDF3;
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
                        box-sizing: border-box;
                    }
                    .card {
                        background: #161B22;
                        border: 1px solid #30363D;
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 16px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    }
                    h1 { color: #58A6FF; margin-top: 0; font-size: 20px; }
                    p { line-height: 1.6; font-size: 14px; color: #8B949E; }
                    .btn {
                        background: #00E5FF;
                        color: #000;
                        border: none;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        margin-top: 12px;
                        width: 100%;
                    }
                    .btn:active { transform: scale(0.98); }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>تطبيق KAZ المحمول</h1>
                    <p>${trimmed.replace("\n", "<br>")}</p>
                    <button class="btn" onclick="if(window.KazBridge) KazBridge.showToast('أهلاً بك في التطبيق!')">تفاعل مع التطبيق</button>
                </div>
            </body>
            </html>
        """.trimIndent()
    }

    fun parseMarkdownResponse(markdown: String): Pair<String, List<CodeSnippet>> {
        val snippets = mutableListOf<CodeSnippet>()
        val codeBlockRegex = Regex("```([a-zA-Z0-9_-]*)\\s*\\n([\\s\\S]*?)```", RegexOption.MULTILINE)

        val matches = codeBlockRegex.findAll(markdown).toList()
        for ((index, match) in matches.withIndex()) {
            val language = match.groupValues[1].ifBlank { "html" }
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
        return when (language.lowercase()) {
            "html", "htm" -> "واجهة HTML/JS #$index"
            "javascript", "js" -> "كود JavaScript #$index"
            "css" -> "تنسيقات CSS #$index"
            "kotlin" -> "كود أندرويد (Kotlin) #$index"
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
