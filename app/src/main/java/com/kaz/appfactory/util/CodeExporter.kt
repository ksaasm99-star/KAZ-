package com.kaz.appfactory.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import androidx.core.content.FileProvider
import com.kaz.appfactory.data.model.CodeSnippet
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object CodeExporter {

    private fun getExportDir(context: Context): File {
        val dir = File(context.cacheDir, "exports")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun sanitizeFileName(name: String): String {
        val clean = name.replace(Regex("[^a-zA-Z0-9_\\-\\u0600-\\u06FF]"), "_").trim('_')
        return clean.ifBlank { "KazAppCode" }
    }

    fun exportAsKotlinFile(context: Context, fileName: String, code: String) {
        try {
            val safeName = sanitizeFileName(fileName)
            val file = File(getExportDir(context), "$safeName.kt")
            file.writeText(code)

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/x-kotlin"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "$safeName.kt")
                putExtra(Intent.EXTRA_TEXT, "تم إنشاء هذا الكود بواسطة KAZ - مصنع التطبيقات الذكي")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            context.startActivity(Intent.createChooser(intent, "مشاركة ملف Kotlin (.kt)"))
        } catch (e: Exception) {
            Toast.makeText(context, "فشل تصدير الملف: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    fun createZipFile(
        context: Context,
        projectName: String,
        snippets: List<CodeSnippet>,
        rawCode: String,
        targetDir: File = getExportDir(context)
    ): File {
        val safeProjectName = sanitizeFileName(projectName)
        val zipFile = File(targetDir, "${safeProjectName}_AndroidProject.zip")

        FileOutputStream(zipFile).use { fos ->
            ZipOutputStream(fos).use { zos ->
                // 1. Add Code Files
                if (snippets.isNotEmpty()) {
                    snippets.forEach { snippet ->
                        val entryName = "src/main/java/" + sanitizeFileName(snippet.title) + ".kt"
                        zos.putNextEntry(ZipEntry(entryName))
                        zos.write(snippet.code.toByteArray(Charsets.UTF_8))
                        zos.closeEntry()
                    }
                } else {
                    val entryName = "src/main/java/${safeProjectName}Screen.kt"
                    zos.putNextEntry(ZipEntry(entryName))
                    zos.write(rawCode.toByteArray(Charsets.UTF_8))
                    zos.closeEntry()
                }

                // 2. Add README.md with clear instructions
                val readmeContent = """
                    # مشروع تطبيق: $projectName
                    تم إنشاء هذا المشروع بالكامل بواسطة: KAZ - مصنع التطبيقات الذكي
                    
                    ## المواصفات التقنية:
                    - لغة البرمجة: Kotlin 2.1
                    - واجهات المستخدم: Jetpack Compose مع Material Design 3
                    - قاعدة البيانات: Room Database
                    - النمط المعماري: Clean Architecture & MVVM
                    
                    ## خطوات التشغيل في Android Studio:
                    1. افتح Android Studio وأنشئ مشروعًا جديدًا بنمط Empty Activity (Compose).
                    2. انسخ محتويات مجلد `src/main/java/` إلى مجلد الكود في مشروعك.
                    3. قم بمزامنة ملفات Gradle (Sync Project with Gradle Files).
                    
                    صُنع بامتياز بواسطة تطبيق KAZ.
                """.trimIndent()

                zos.putNextEntry(ZipEntry("README.md"))
                zos.write(readmeContent.toByteArray(Charsets.UTF_8))
                zos.closeEntry()
            }
        }
        return zipFile
    }

    fun exportAsZipArchive(
        context: Context,
        projectName: String,
        snippets: List<CodeSnippet>,
        rawCode: String
    ) {
        try {
            val safeProjectName = sanitizeFileName(projectName)
            val zipFile = createZipFile(context, projectName, snippets, rawCode)

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                zipFile
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/zip"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "${safeProjectName}_AndroidProject.zip")
                putExtra(Intent.EXTRA_TEXT, "مشروع $projectName بصيغة ZIP من تطبيق KAZ")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            context.startActivity(Intent.createChooser(intent, "تصدير المشروع كملف مضغوط (.zip)"))
        } catch (e: Exception) {
            Toast.makeText(context, "فشل تصدير ملف ZIP: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    fun saveZipToDeviceStorage(
        context: Context,
        projectName: String,
        snippets: List<CodeSnippet>,
        rawCode: String
    ) {
        try {
            val safeProjectName = sanitizeFileName(projectName)
            // Use external downloads or external files dir
            val downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                ?: context.filesDir
            val savedZip = createZipFile(context, projectName, snippets, rawCode, targetDir = downloadDir)

            Toast.makeText(
                context,
                "تم حفظ المشروع بنجاح في مجلد التنزيلات:\n${savedZip.name}",
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            Toast.makeText(context, "فشل حفظ الملف في الذاكرة: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    fun shareZipViaWhatsApp(
        context: Context,
        projectName: String,
        snippets: List<CodeSnippet>,
        rawCode: String
    ) {
        try {
            val zipFile = createZipFile(context, projectName, snippets, rawCode)
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                zipFile
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/zip"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TEXT, "مشروع $projectName تم بناؤه بواسطة KAZ")
                setPackage("com.whatsapp")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            try {
                context.startActivity(intent)
            } catch (_: Exception) {
                // If WhatsApp is not installed, open chooser
                val chooser = Intent.createChooser(
                    Intent(Intent.ACTION_SEND).apply {
                        type = "application/zip"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        putExtra(Intent.EXTRA_TEXT, "مشروع $projectName تم بناؤه بواسطة KAZ")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    },
                    "مشاركة عبر واتساب أو تطبيق آخر"
                )
                context.startActivity(chooser)
            }
        } catch (e: Exception) {
            Toast.makeText(context, "فشل المشاركة عبر واتساب: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }

    fun shareZipViaEmail(
        context: Context,
        projectName: String,
        snippets: List<CodeSnippet>,
        rawCode: String
    ) {
        try {
            val safeProjectName = sanitizeFileName(projectName)
            val zipFile = createZipFile(context, projectName, snippets, rawCode)
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                zipFile
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/zip"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "مشروع أندرويد: $projectName (من تطبيق KAZ)")
                putExtra(Intent.EXTRA_TEXT, "مرفق مشروع $safeProjectName كملف مضغوط (.zip) يحتوي على الكود الكامل وملف README.")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            context.startActivity(Intent.createChooser(intent, "إرسال المشروع عبر البريد الإلكتروني"))
        } catch (e: Exception) {
            Toast.makeText(context, "فشل المشاركة عبر البريد: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }

    fun shareText(context: Context, subject: String, text: String) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, subject)
                putExtra(Intent.EXTRA_TEXT, text)
            }
            context.startActivity(Intent.createChooser(intent, "مشاركة الكود البرمجي"))
        } catch (e: Exception) {
            Toast.makeText(context, "فشل المشاركة: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
