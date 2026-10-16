package com.kaz.appfactory.domain.model

import com.kaz.appfactory.data.model.CodeSnippet

/**
 * Result of an AI app generation operation.
 */
sealed interface GenerationResult {
    data class Success(
        val projectId: Long,
        val projectTitle: String,
        val fullCode: String,
        val snippets: List<CodeSnippet>
    ) : GenerationResult

    data class Error(
        val message: String,
        val throwable: Throwable? = null
    ) : GenerationResult
}
