package com.kaz.appfactory.builder

import android.content.Context
import com.kaz.appfactory.signer.ApkSignerService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

object AppBuilderService {

    private const val SHELL_TEMPLATE_ASSET = "shell-template.apk"

    suspend fun buildApk(
        context: Context,
        appName: String,
        htmlCode: String,
        onProgress: (String) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            onProgress("1/4 جاري تجهيز قالب Shell APK...")
            val exportDir = File(context.filesDir, "generated_apks").apply { mkdirs() }
            val safeName = appName.replace(Regex("[^a-zA-Z0-9_\\-\\u0600-\\u06FF]"), "_").trim('_').ifBlank { "KazApp" }

            val unsignedApk = File(exportDir, "${safeName}_unsigned.apk")
            val signedApk = File(exportDir, "${safeName}.apk")

            onProgress("2/4 جاري حقن كود HTML/JS في حزمة التطبيق...")

            // Read template from assets and inject HTML as assets/index.html
            context.assets.open(SHELL_TEMPLATE_ASSET).use { assetIn ->
                ZipInputStream(assetIn).use { zis ->
                    ZipOutputStream(FileOutputStream(unsignedApk)).use { zos ->
                        var entry = zis.nextEntry
                        val buffer = ByteArray(4096)
                        while (entry != null) {
                            val name = entry.name
                            if (name != "assets/index.html" && !name.startsWith("META-INF/")) {
                                zos.putNextEntry(ZipEntry(name))
                                var len: Int
                                while (zis.read(buffer).also { len = it } != -1) {
                                    zos.write(buffer, 0, len)
                                }
                                zos.closeEntry()
                            }
                            entry = zis.nextEntry
                        }

                        // Inject the generated HTML/JS as assets/index.html
                        zos.putNextEntry(ZipEntry("assets/index.html"))
                        zos.write(htmlCode.toByteArray(Charsets.UTF_8))
                        zos.closeEntry()

                        // Inject metadata
                        val metaJson = """
                            {
                                "appName": "$appName",
                                "generatedBy": "KAZ App Factory",
                                "timestamp": ${System.currentTimeMillis()}
                            }
                        """.trimIndent()
                        zos.putNextEntry(ZipEntry("assets/app-meta.json"))
                        zos.write(metaJson.toByteArray(Charsets.UTF_8))
                        zos.closeEntry()
                    }
                }
            }

            onProgress("3/4 توقيع حزمة APK بمفتاح Android Keystore...")
            val signedSuccess = ApkSignerService.signApk(context, unsignedApk, signedApk)

            // Cleanup unsigned apk
            unsignedApk.delete()

            if (signedSuccess && signedApk.exists()) {
                onProgress("4/4 اكتمل بناء وتوقيع التطبيق بنجاح!")
                Result.success(signedApk)
            } else {
                Result.failure(IllegalStateException("فشل توقيع حزمة APK"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
