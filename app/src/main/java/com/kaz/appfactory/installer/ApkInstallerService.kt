package com.kaz.appfactory.installer

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream

object ApkInstallerService {

    const val ACTION_INSTALL_COMPLETE = "com.kaz.appfactory.INSTALL_COMPLETE"

    /**
     * Primary entry point to install APK using PackageInstaller API with automatic intent fallback.
     */
    fun installApk(context: Context, apkFile: File) {
        installApkStandard(context, apkFile)
    }

    /**
     * Installs APK using the official Android PackageInstaller Session API,
     * with graceful fallback to FileProvider Intent on any constraint.
     */
    suspend fun installApkViaPackageInstaller(context: Context, apkFile: File): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            if (!apkFile.exists()) {
                return@withContext Result.failure(IllegalStateException("ملف APK غير موجود"))
            }

            // Check REQUEST_INSTALL_PACKAGES permission on Android 8.0+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "يرجى منح إذن تثبيت التطبيقات لـ KAZ", Toast.LENGTH_LONG).show()
                        val permissionIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                            data = Uri.parse("package:${context.packageName}")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        context.startActivity(permissionIntent)
                    }
                    return@withContext Result.failure(SecurityException("يتطلب إذن تثبيت الحزم من مصادر غير معروفة"))
                }
            }

            // PackageInstaller Session
            val packageInstaller = context.packageManager.packageInstaller
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
                setSize(apkFile.length())
            }

            val sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)

            session.use { activeSession ->
                FileInputStream(apkFile).use { inStream ->
                    activeSession.openWrite("kaz_package", 0, apkFile.length()).use { outStream ->
                        val buffer = ByteArray(65536)
                        var bytesRead: Int
                        while (inStream.read(buffer).also { bytesRead = it } != -1) {
                            outStream.write(buffer, 0, bytesRead)
                        }
                        activeSession.fsync(outStream)
                    }
                }

                val intent = Intent(context, InstallReceiver::class.java).apply {
                    action = ACTION_INSTALL_COMPLETE
                }
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                val pendingIntent = PendingIntent.getBroadcast(context, sessionId, intent, flags)

                activeSession.commit(pendingIntent.intentSender)
            }

            Result.success(Unit)
        } catch (e: Exception) {
            // Fallback to standard FileProvider Intent
            withContext(Dispatchers.Main) {
                installApkStandard(context, apkFile)
            }
            Result.success(Unit)
        }
    }

    /**
     * Standard installation via ACTION_VIEW & FileProvider
     */
    fun installApkStandard(context: Context, apkFile: File) {
        try {
            if (!apkFile.exists()) {
                Toast.makeText(context, "ملف APK غير موجود", Toast.LENGTH_SHORT).show()
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    Toast.makeText(context, "يرجى السماح بتثبيت التطبيقات من هذا المصدر", Toast.LENGTH_LONG).show()
                    val permissionIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${context.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(permissionIntent)
                    return
                }
            }

            val apkUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(installIntent)
        } catch (e: Exception) {
            Toast.makeText(context, "فشل فتح مثبت الحزم: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    fun shareApk(context: Context, apkFile: File, appName: String) {
        try {
            if (!apkFile.exists()) {
                Toast.makeText(context, "ملف APK غير موجود", Toast.LENGTH_SHORT).show()
                return
            }

            val apkUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/vnd.android.package-archive"
                putExtra(Intent.EXTRA_STREAM, apkUri)
                putExtra(Intent.EXTRA_SUBJECT, "تطبيق $appName")
                putExtra(Intent.EXTRA_TEXT, "تطبيق $appName بصيغة APK جاهز للتثبيت - تم إنشاؤه وتوقيعه بواسطة KAZ")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            context.startActivity(Intent.createChooser(shareIntent, "مشاركة ملف APK"))
        } catch (e: Exception) {
            Toast.makeText(context, "فشل مشاركة ملف APK: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
