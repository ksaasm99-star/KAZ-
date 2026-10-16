package com.kaz.appfactory.data.repository

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.kaz.appfactory.data.model.GeneratedApkInfo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ApkRepository(private val context: Context) {

    private val targetDirs: List<File>
        get() = listOf(
            File(context.filesDir, "generated_apks"),
            File(context.cacheDir, "generated_apks"),
            File(context.cacheDir, "hefesto_build")
        )

    suspend fun getLocalApks(): List<GeneratedApkInfo> = withContext(Dispatchers.IO) {
        val apkList = mutableListOf<GeneratedApkInfo>()
        val seenPaths = mutableSetOf<String>()

        val dateFormat = SimpleDateFormat("yyyy/MM/dd - hh:mm a", Locale.getDefault())
        val pm = context.packageManager

        for (dir in targetDirs) {
            if (!dir.exists()) continue
            val files = dir.listFiles { file -> file.isFile && file.extension.lowercase() == "apk" && !file.name.contains("_unsigned") } ?: emptyArray()

            for (file in files) {
                if (seenPaths.contains(file.absolutePath)) continue
                seenPaths.add(file.absolutePath)

                var appName = file.nameWithoutExtension.replace("_", " ")
                var pkgName = "com.kaz.generated.app"
                var verName = "1.0.0"
                var verCode = 1L
                var minSdk = 21
                var targetSdk = 35

                try {
                    val archiveInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        pm.getPackageArchiveInfo(file.absolutePath, PackageManager.PackageInfoFlags.of(0))
                    } else {
                        @Suppress("DEPRECATION")
                        pm.getPackageArchiveInfo(file.absolutePath, 0)
                    }

                    if (archiveInfo != null) {
                        pkgName = archiveInfo.packageName ?: pkgName
                        verName = archiveInfo.versionName ?: verName
                        verCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            archiveInfo.longVersionCode
                        } else {
                            @Suppress("DEPRECATION")
                            archiveInfo.versionCode.toLong()
                        }

                        val appInfo = archiveInfo.applicationInfo
                        if (appInfo != null) {
                            appInfo.sourceDir = file.absolutePath
                            appInfo.publicSourceDir = file.absolutePath
                            val label = appInfo.loadLabel(pm)?.toString()
                            if (!label.isNullOrBlank() && label != "App") {
                                appName = label
                            }
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                minSdk = appInfo.minSdkVersion
                            }
                            targetSdk = appInfo.targetSdkVersion
                        }
                    }
                } catch (_: Exception) {}

                val sha256 = calculateSha256(file)
                val formattedSize = formatFileSize(file.length())
                val formattedDate = dateFormat.format(Date(file.lastModified()))

                apkList.add(
                    GeneratedApkInfo(
                        file = file,
                        name = appName,
                        packageName = pkgName,
                        versionName = verName,
                        versionCode = verCode,
                        fileSizeBytes = file.length(),
                        formattedSize = formattedSize,
                        formattedDate = formattedDate,
                        lastModified = file.lastModified(),
                        sha256 = sha256,
                        minSdkVersion = minSdk,
                        targetSdkVersion = targetSdk
                    )
                )
            }
        }

        apkList.sortedByDescending { it.lastModified }
    }

    suspend fun deleteApk(file: File): Boolean = withContext(Dispatchers.IO) {
        try {
            if (file.exists()) {
                file.delete()
            } else {
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun calculateSha256(file: File): String {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            FileInputStream(file).use { fis ->
                val buffer = ByteArray(8192)
                var read: Int
                while (fis.read(buffer).also { read = it } != -1) {
                    digest.update(buffer, 0, read)
                }
            }
            digest.digest().joinToString("") { "%02x".format(it) }
        } catch (_: Exception) {
            "SHA-256 غير متوفر"
        }
    }

    private fun formatFileSize(bytes: Long): String {
        if (bytes <= 0) return "0 B"
        val kb = bytes / 1024.0
        val mb = kb / 1024.0
        return when {
            mb >= 1.0 -> String.format(Locale.US, "%.2f MB", mb)
            kb >= 1.0 -> String.format(Locale.US, "%.1f KB", kb)
            else -> "$bytes B"
        }
    }
}
