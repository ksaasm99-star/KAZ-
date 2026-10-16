package com.kaz.appfactory.domain.usecase

import com.kaz.appfactory.domain.repository.AppRepository

/**
 * UseCase to delete a project from database.
 */
class DeleteProjectUseCase(
    private val repository: AppRepository
) {
    suspend operator fun invoke(projectId: Long): Result<Unit> {
        return try {
            repository.deleteProject(projectId)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
