package com.kaz.appfactory.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CodeSnippet(
    val id: String = java.util.UUID.randomUUID().toString(),
    val title: String,
    val code: String,
    val language: String = "kotlin"
)

enum class MessageSender {
    USER,
    KAZ_AI
}

data class AppTemplate(
    val id: String,
    val titleAr: String,
    val titleEn: String,
    val categoryAr: String,
    val descriptionAr: String,
    val prompt: String,
    val iconName: String,
    val sampleFeatures: List<String>
)
