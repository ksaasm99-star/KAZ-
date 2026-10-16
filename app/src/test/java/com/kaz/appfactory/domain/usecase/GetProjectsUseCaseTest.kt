package com.kaz.appfactory.domain.usecase

import com.kaz.appfactory.domain.model.GenerationResult
import com.kaz.appfactory.domain.model.Project
import com.kaz.appfactory.domain.repository.AppRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class GetProjectsUseCaseTest {

    private class FakeRepo(private val initialProjects: List<Project>) : AppRepository {
        override val allProjects: Flow<List<Project>> = flowOf(initialProjects)
        override suspend fun getProjectById(id: Long): Project? = initialProjects.find { it.id == id }
        override suspend fun generateApp(prompt: String, customApiKey: String?): GenerationResult =
            GenerationResult.Error("Not implemented")
        override suspend fun deleteProject(id: Long) {}
        override suspend fun clearAllProjects() {}
    }

    private val sampleProjects = listOf(
        Project(id = 1L, title = "متجر إلكتروني", summary = "تطبيق متجر وسلة", generatedCode = ""),
        Project(id = 2L, title = "تطبيق الطقس", summary = "توقعات درجات الحرارة", generatedCode = ""),
        Project(id = 3L, title = "قائمة المهام", summary = "مهام يومية Room", generatedCode = "")
    )

    @Test
    fun `invoke with empty query returns all projects`() = runTest {
        val repo = FakeRepo(sampleProjects)
        val useCase = GetProjectsUseCase(repo)

        val result = useCase("").first()

        assertEquals(3, result.size)
    }

    @Test
    fun `invoke with matching query filters projects correctly`() = runTest {
        val repo = FakeRepo(sampleProjects)
        val useCase = GetProjectsUseCase(repo)

        val result = useCase("الطقس").first()

        assertEquals(1, result.size)
        assertEquals("تطبيق الطقس", result[0].title)
    }

    @Test
    fun `invoke with non-matching query returns empty list`() = runTest {
        val repo = FakeRepo(sampleProjects)
        val useCase = GetProjectsUseCase(repo)

        val result = useCase("سيارات").first()

        assertEquals(0, result.size)
    }
}
