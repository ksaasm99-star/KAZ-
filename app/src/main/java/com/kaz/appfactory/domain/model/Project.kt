package com.kaz.appfactory.domain.model

/**
 * Domain model representing an Android project generated or saved by the user.
 * Independent of database entities or network DTOs.
 */
data class Project(
    val id: Long = 0,
    val title: String,
    val summary: String,
    val generatedCode: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
