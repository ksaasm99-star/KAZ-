package com.kaz.appfactory.domain.usecase

import com.kaz.appfactory.domain.model.GenerationResult
import com.kaz.appfactory.domain.repository.AppRepository

/**
 * UseCase to validate prompt and generate complete Android application Kotlin code.
 * Implements Single Responsibility Principle (SRP).
 */
class GenerateAppUseCase(
    private val repository: AppRepository
) {
    suspend operator fun invoke(
        prompt: String,
        customApiKey: String? = null
    ): GenerationResult {
        val sanitizedPrompt = prompt.trim()

        if (sanitizedPrompt.isBlank()) {
            return GenerationResult.Error("يرجى كتابة وصف للتطبيق المطلوب أولاً")
        }

        if (sanitizedPrompt.length < 5) {
            return GenerationResult.Error("الوصف قصير جداً، يرجى كتابة تفاصيل أكثر لتوليد تطبيق دقيق")
        }

        return repository.generateApp(sanitizedPrompt, customApiKey)
    }
}
