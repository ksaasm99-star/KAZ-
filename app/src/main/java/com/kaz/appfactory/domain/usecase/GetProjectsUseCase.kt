package com.kaz.appfactory.domain.usecase

import com.kaz.appfactory.domain.model.Project
import com.kaz.appfactory.domain.repository.AppRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * UseCase to retrieve saved projects with optional search query filtering.
 */
class GetProjectsUseCase(
    private val repository: AppRepository
) {
    operator fun invoke(query: String = ""): Flow<List<Project>> {
        val cleanQuery = query.trim()
        return repository.allProjects.map { projects ->
            if (cleanQuery.isBlank()) {
                projects
            } else {
                projects.filter {
                    it.title.contains(cleanQuery, ignoreCase = true) ||
                            it.summary.contains(cleanQuery, ignoreCase = true)
                }
            }
        }
    }
}
