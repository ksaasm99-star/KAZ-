package com.kaz.appfactory.domain.repository

import com.kaz.appfactory.domain.model.GenerationResult
import com.kaz.appfactory.domain.model.Project
import kotlinx.coroutines.flow.Flow

/**
 * Domain interface for app generation and project management operations.
 * Implemented by Data layer.
 */
interface AppRepository {

    /**
     * Flow of all saved projects ordered by latest updated.
     */
    val allProjects: Flow<List<Project>>

    /**
     * Retrieve a single project by ID.
     */
    suspend fun getProjectById(id: Long): Project?

    /**
     * Generates a complete Android app using Gemini API.
     * Validates input, constructs the system instructions, coordinates with remote API,
     * parses Kotlin code blocks, and persists the project in local Room database.
     */
    suspend fun generateApp(
        prompt: String,
        customApiKey: String? = null
    ): GenerationResult

    /**
     * Deletes a project by ID from local database.
     */
    suspend fun deleteProject(id: Long)

    /**
     * Deletes all projects from local database.
     */
    suspend fun clearAllProjects()
}
