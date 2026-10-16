package com.kaz.appfactory.data.repository

import android.util.Base64
import com.kaz.appfactory.data.model.CodeSnippet
import com.kaz.appfactory.data.remote.github.CreateRepoRequest
import com.kaz.appfactory.data.remote.github.GitHubApiService
import com.kaz.appfactory.data.remote.github.GitHubRetrofitClient
import com.kaz.appfactory.data.remote.github.UploadFileRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

class GitHubRepository(
    private val apiService: GitHubApiService = GitHubRetrofitClient.service
) {

    private fun sanitizeRepoName(name: String): String {
        val clean = name.replace(Regex("[^a-zA-Z0-9_\\-]"), "-").trim('-').lowercase()
        return clean.ifBlank { "kaz-android-app" }
    }

    private fun sanitizeFileName(name: String): String {
        val clean = name.replace(Regex("[^a-zA-Z0-9_]"), "_").trim('_')
        return clean.ifBlank { "Screen" }
    }

    suspend fun pushProjectToGitHub(
        token: String,
        repoName: String,
        repoDescription: String,
        isPrivate: Boolean,
        snippets: List<CodeSnippet>,
        rawCode: String,
        onProgress: (String) -> Unit
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val cleanToken = token.trim()
            if (cleanToken.isBlank()) {
                return@withContext Result.failure(IllegalArgumentException("يرجى إدخال رمز الوصول الشخصي (GitHub Personal Access Token)"))
            }

            val authHeader = if (cleanToken.startsWith("Bearer ") || cleanToken.startsWith("token ")) cleanToken else "Bearer $cleanToken"

            // 1. Authenticate & Get User
            onProgress("1/4 التحقق من حساب GitHub...")
            val user = apiService.getAuthenticatedUser(authHeader)
            val owner = user.login

            // 2. Create Repository
            val safeRepoName = sanitizeRepoName(repoName)
            onProgress("2/4 جاري إنشاء المستودع '$safeRepoName'...")

            val repoResponse = apiService.createRepository(
                authHeader = authHeader,
                request = CreateRepoRequest(
                    name = safeRepoName,
                    description = repoDescription.ifBlank { "تم إنشاء هذا المشروع بواسطة KAZ - مصنع التطبيقات الذكي" },
                    private = isPrivate,
                    auto_init = true
                )
            )

            // Brief delay for GitHub to initialize main branch
            delay(1200)

            // 3. Upload Code Files
            onProgress("3/4 جاري رفع الملفات البرمجية للكوتلن...")

            if (snippets.isNotEmpty()) {
                snippets.forEachIndexed { index, snippet ->
                    val fileName = sanitizeFileName(snippet.title) + ".kt"
                    val path = "app/src/main/java/$fileName"
                    val base64Content = Base64.encodeToString(snippet.code.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)

                    apiService.createOrUpdateFile(
                        authHeader = authHeader,
                        owner = owner,
                        repo = safeRepoName,
                        path = path,
                        request = UploadFileRequest(
                            message = "Add $fileName via KAZ App Factory",
                            content = base64Content
                        )
                    )
                    delay(300)
                }
            } else {
                val fileName = "${sanitizeFileName(safeRepoName)}MainScreen.kt"
                val path = "app/src/main/java/$fileName"
                val base64Content = Base64.encodeToString(rawCode.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)

                apiService.createOrUpdateFile(
                    authHeader = authHeader,
                    owner = owner,
                    repo = safeRepoName,
                    path = path,
                    request = UploadFileRequest(
                        message = "Add MainScreen via KAZ App Factory",
                        content = base64Content
                    )
                )
            }

            // 4. Upload README.md
            onProgress("4/4 جاري رفع ملف التوثيق والتشغيل README.md...")
            val readmeContent = """
                # $repoName
                
                ${repoDescription.ifBlank { "تطبيق أندرويد تم توليده بواسطة KAZ - مصنع التطبيقات الذكي" }}
                
                ## 🛠️ التقنيات المستخدمة:
                - **لغة البرمجة:** Kotlin 2.1
                - **واجهة المستخدم:** Jetpack Compose (Material 3)
                - **قاعدة البيانات:** Room Database
                - **النمط المعماري:** Clean Architecture & MVVM
                
                ## 🚀 كيفية التشغيل في Android Studio:
                1. استنسخ المستودع (`git clone ${repoResponse.html_url}`).
                2. افتح المشروع في Android Studio.
                3. اضغط على **Run** لتشغيل التطبيق على المحاكي أو جهازك الحقيقي.
                
                ---
                *صُنع بامتياز بواسطة [KAZ - Smart AI App Factory](https://github.com).*
            """.trimIndent()

            val base64Readme = Base64.encodeToString(readmeContent.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
            apiService.createOrUpdateFile(
                authHeader = authHeader,
                owner = owner,
                repo = safeRepoName,
                path = "README.md",
                request = UploadFileRequest(
                    message = "Add README.md documentation via KAZ",
                    content = base64Readme
                )
            )

            Result.success(repoResponse.html_url)
        } catch (e: Exception) {
            val errorMsg = when {
                e.message?.contains("401") == true -> "رمز الوصول (GitHub Token) غير صحيح أو انتهت صلاحيته."
                e.message?.contains("422") == true -> "اسم المستودع موجود مسبقاً في حسابك على GitHub، يرجى تجربة اسم آخر."
                else -> e.localizedMessage ?: "حدث خطأ أثناء الاتصال بـ GitHub"
            }
            Result.failure(Exception(errorMsg))
        }
    }
}
