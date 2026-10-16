package com.kaz.appfactory.ui.components

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaz.appfactory.builder.AppBuilderService
import com.kaz.appfactory.installer.ApkInstallerService
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.IndigoDeep
import com.kaz.appfactory.ui.theme.TealAccent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Interactive APK Card embedded directly inside chat messages.
 * Allows users to build, install, share, and preview the APK right within the conversation.
 */
@Composable
fun ApkChatBubbleCard(
    appName: String,
    codeContent: String,
    onPreview: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var isBuilding by remember { mutableStateOf(false) }
    var buildProgress by remember { mutableStateOf("") }
    var readyApkFile by remember { mutableStateOf<File?>(null) }

    // Check if an APK already exists in internal storage
    LaunchedEffect(appName) {
        withContext(Dispatchers.IO) {
            val safeName = appName.replace("[^a-zA-Z0-9_\\-]".toRegex(), "_").ifBlank { "KazApp" }
            val apksDir = File(context.filesDir, "generated_apks")
            if (apksDir.exists()) {
                val found = apksDir.listFiles()?.firstOrNull { it.name.startsWith(safeName) && it.extension == "apk" }
                if (found != null && found.exists()) {
                    readyApkFile = found
                }
            }
        }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.5.dp, CyanNeon.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
            .testTag("chat_apk_card"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF0D1520)
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header: APK Icon, Name, and Signed Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(CyanNeon.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Android,
                        contentDescription = null,
                        tint = CyanNeon,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "حزمة تطبيق جاهزة (APK)",
                            fontSize = 11.sp,
                            color = CyanNeon,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = TealAccent.copy(alpha = 0.18f)
                        ) {
                            Text(
                                text = "موقّع رسمي ✓",
                                fontSize = 9.sp,
                                color = TealAccent,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = appName.ifBlank { "تطبيق KAZ المولد" },
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color.White,
                        maxLines = 1
                    )
                }

                // File size badge
                val sizeText = readyApkFile?.let { "${(it.length() / 1024)} KB" } ?: "~35 KB"
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF1E293B)
                ) {
                    Text(
                        text = sizeText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = TealAccent,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = Color(0xFF334155))
            Spacer(modifier = Modifier.height(10.dp))

            // Build Progress display
            AnimatedVisibility(visible = isBuilding) {
                Column(modifier = Modifier.padding(bottom = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = CyanNeon,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = buildProgress.ifBlank { "جاري تجهيز وتوقيع ملف الـ APK..." },
                            fontSize = 11.sp,
                            color = CyanNeon,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            // Action Buttons inside Chat Bubble
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Install Button (Direct PackageInstaller)
                Button(
                    onClick = {
                        if (isBuilding) return@Button
                        val existing = readyApkFile
                        if (existing != null && existing.exists()) {
                            Toast.makeText(context, "جاري فتح مثبت أندرويد لتثبيت التطبيق...", Toast.LENGTH_SHORT).show()
                            ApkInstallerService.installApk(context, existing)
                        } else {
                            isBuilding = true
                            coroutineScope.launch {
                                val result = AppBuilderService.buildApk(
                                    context = context,
                                    appName = appName,
                                    htmlCode = codeContent,
                                    onProgress = { step -> buildProgress = step }
                                )
                                isBuilding = false
                                if (result.isSuccess) {
                                    val file = result.getOrThrow()
                                    readyApkFile = file
                                    withContext(Dispatchers.Main) {
                                        Toast.makeText(context, "تم تجهيز الـ APK! جاري فتح مثبت الحزم...", Toast.LENGTH_SHORT).show()
                                        ApkInstallerService.installApk(context, file)
                                    }
                                } else {
                                    withContext(Dispatchers.Main) {
                                        Toast.makeText(context, "فشل بناء APK: ${result.exceptionOrNull()?.message}", Toast.LENGTH_LONG).show()
                                    }
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .weight(1.3f)
                        .height(42.dp)
                        .testTag("chat_install_apk_button"),
                    enabled = !isBuilding,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CyanNeon,
                        contentColor = Color.Black
                    ),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.InstallMobile,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (readyApkFile != null) "تثبيت APK الآن 📲" else "بناء وتثبيت APK ⚡",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // 2. Share APK Button
                OutlinedButton(
                    onClick = {
                        if (isBuilding) return@OutlinedButton
                        val existing = readyApkFile
                        if (existing != null && existing.exists()) {
                            ApkInstallerService.shareApk(context, existing, appName)
                        } else {
                            isBuilding = true
                            coroutineScope.launch {
                                val result = AppBuilderService.buildApk(
                                    context = context,
                                    appName = appName,
                                    htmlCode = codeContent,
                                    onProgress = { step -> buildProgress = step }
                                )
                                isBuilding = false
                                if (result.isSuccess) {
                                    val file = result.getOrThrow()
                                    readyApkFile = file
                                    withContext(Dispatchers.Main) {
                                        ApkInstallerService.shareApk(context, file, appName)
                                    }
                                } else {
                                    withContext(Dispatchers.Main) {
                                        Toast.makeText(context, "فشل تجهيز APK للمشاركة", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(42.dp)
                        .testTag("chat_share_apk_button"),
                    enabled = !isBuilding,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = CyanNeon
                    ),
                    contentPadding = PaddingValues(horizontal = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = null,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "مشاركة", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // 3. Live Preview Button
                IconButton(
                    onClick = onPreview,
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF1E293B))
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayCircle,
                        contentDescription = "معاينة",
                        tint = CyanNeon,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
