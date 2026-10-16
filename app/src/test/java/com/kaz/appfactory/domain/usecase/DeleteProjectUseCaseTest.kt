package com.kaz.appfactory.domain.usecase

import com.kaz.appfactory.domain.model.GenerationResult
import com.kaz.appfactory.domain.model.Project
import com.kaz.appfactory.domain.repository.AppRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DeleteProjectUseCaseTest {

    private class FakeRepo : AppRepository {
        var deletedId: Long? = null

        override val allProjects: Flow<List<Project>> = flowOf(emptyList())
        override suspend fun getProjectById(id: Long): Project? = null
        override suspend fun generateApp(prompt: String, customApiKey: String?): GenerationResult =
            GenerationResult.Error("Not implemented")

        override suspend fun deleteProject(id: Long) {
            deletedId = id
        }

        override suspend fun clearAllProjects() {}
    }

    @Test
    fun `invoke deletes project by ID`() = runTest {
        val repo = FakeRepo()
        val useCase = DeleteProjectUseCase(repo)

        val result = useCase(42L)

        assertTrue(result.isSuccess)
        assertEquals(42L, repo.deletedId)
    }
}
