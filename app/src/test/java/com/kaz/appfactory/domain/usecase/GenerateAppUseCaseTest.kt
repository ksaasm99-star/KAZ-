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

class GenerateAppUseCaseTest {

    private class FakeAppRepository : AppRepository {
        var generateAppCalled = false
        var lastPrompt = ""

        override val allProjects: Flow<List<Project>> = flowOf(emptyList())

        override suspend fun getProjectById(id: Long): Project? = null

        override suspend fun generateApp(prompt: String, customApiKey: String?): GenerationResult {
            generateAppCalled = true
            lastPrompt = prompt
            return GenerationResult.Success(
                projectId = 1L,
                projectTitle = "تطبيق تجريبي",
                fullCode = "// Kotlin Code",
                snippets = emptyList()
            )
        }

        override suspend fun deleteProject(id: Long) {}
        override suspend fun clearAllProjects() {}
    }

    @Test
    fun `invoke with blank prompt returns Error result`() = runTest {
        val fakeRepo = FakeAppRepository()
        val useCase = GenerateAppUseCase(fakeRepo)

        val result = useCase("   ")

        assertTrue(result is GenerationResult.Error)
        assertEquals("يرجى كتابة وصف للتطبيق المطلوب أولاً", (result as GenerationResult.Error).message)
        assertEquals(false, fakeRepo.generateAppCalled)
    }

    @Test
    fun `invoke with very short prompt returns Error result`() = runTest {
        val fakeRepo = FakeAppRepository()
        val useCase = GenerateAppUseCase(fakeRepo)

        val result = useCase("أريد")

        assertTrue(result is GenerationResult.Error)
        assertEquals("الوصف قصير جداً، يرجى كتابة تفاصيل أكثر لتوليد تطبيق دقيق", (result as GenerationResult.Error).message)
        assertEquals(false, fakeRepo.generateAppCalled)
    }

    @Test
    fun `invoke with valid prompt delegates to repository and returns Success`() = runTest {
        val fakeRepo = FakeAppRepository()
        val useCase = GenerateAppUseCase(fakeRepo)

        val validPrompt = "تطبيق متجر إلكتروني متكامل مع سلة تسوق"
        val result = useCase(validPrompt)

        assertTrue(result is GenerationResult.Success)
        assertEquals(true, fakeRepo.generateAppCalled)
        assertEquals(validPrompt, fakeRepo.lastPrompt)
        assertEquals(1L, (result as GenerationResult.Success).projectId)
    }
}
